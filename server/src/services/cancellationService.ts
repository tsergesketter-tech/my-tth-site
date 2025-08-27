// server/src/services/cancellationService.ts
// Cancellation workflow service with points-first priority logic

import type { 
  TripBooking, 
  BookingLineItem, 
  CancellationRequest, 
  CancellationPlan, 
  CancellationStep, 
  CancellationResult,
  CancellationStepType 
} from "../../../shared/bookingTypes";

import { getBookingById, updateLineItemStatus } from "../data/bookings";
import { cancelSalesforceLineItems, getSalesforceBookingById, getSalesforceTransactionJournalLedgers } from "../salesforce/bookings";
import { getClientCredentialsToken } from "../salesforce/auth";

const DEFAULT_API_VERSION = process.env.SF_API_VERSION || "v64.0";

/**
 * Create a cancellation plan with points-first priority logic
 */
export async function createCancellationPlan(request: CancellationRequest): Promise<CancellationPlan> {
  let booking = null;
  
  // Try Salesforce first if sync is enabled
  if (process.env.SF_SYNC_BOOKINGS === "true") {
    try {
      booking = await getSalesforceBookingById(request.bookingId);
    } catch (error: any) {
      console.warn(`[cancellation] Failed to get booking from Salesforce:`, error.message);
    }
  }
  
  // Fall back to local storage if Salesforce lookup failed
  if (!booking) {
    booking = await getBookingById(request.bookingId);
  }
  
  if (!booking) {
    throw new Error(`Booking ${request.bookingId} not found`);
  }

  // Determine which line items to cancel
  const lineItemsToCancel = request.lineItemIds 
    ? booking.lineItems.filter((item: any) => request.lineItemIds!.includes(item.id))
    : booking.lineItems;

  if (lineItemsToCancel.length === 0) {
    throw new Error("No valid line items found for cancellation");
  }

  const steps: CancellationStep[] = [];
  let totalPointsToRefund = 0;
  let totalPointsToCancel = 0;
  let totalCashRefund = 0;

  // Process each line item with points-first priority
  for (const lineItem of lineItemsToCancel) {
    if (lineItem.status !== 'ACTIVE') {
      continue; // Skip already cancelled items
    }

    // Step 1: Refund redemptions first (points refunded to member)
    if (lineItem.redemptionJournalId && lineItem.pointsRedeemed && lineItem.pointsRedeemed > 0) {
      let loyaltyLedgers: any[] = [];
      try {
        loyaltyLedgers = await getSalesforceTransactionJournalLedgers(lineItem.redemptionJournalId);
      } catch (error: any) {
        console.warn(`[cancellation] Failed to get ledgers for redemption journal ${lineItem.redemptionJournalId}:`, error.message);
      }

      steps.push({
        type: "REDEMPTION_REFUND",
        lineItemId: lineItem.id,
        lob: lineItem.lob,
        journalId: lineItem.redemptionJournalId,
        amount: lineItem.pointsRedeemed,
        loyaltyLedgers,
        status: "PENDING"
      });
      totalPointsToRefund += lineItem.pointsRedeemed;
    }

    // Step 2: Cancel accruals (points cancelled from member account)
    if (lineItem.accrualJournalId && lineItem.pointsEarned && lineItem.pointsEarned > 0) {
      let loyaltyLedgers: any[] = [];
      try {
        loyaltyLedgers = await getSalesforceTransactionJournalLedgers(lineItem.accrualJournalId);
      } catch (error: any) {
        console.warn(`[cancellation] Failed to get ledgers for accrual journal ${lineItem.accrualJournalId}:`, error.message);
      }

      steps.push({
        type: "ACCRUAL_CANCEL",
        lineItemId: lineItem.id,
        lob: lineItem.lob,
        journalId: lineItem.accrualJournalId,
        amount: lineItem.pointsEarned,
        loyaltyLedgers,
        status: "PENDING"
      });
      totalPointsToCancel += lineItem.pointsEarned;
    }

    // Cash refund (handled through external payment processing)
    if (lineItem.cashAmount && lineItem.cashAmount > 0) {
      totalCashRefund += lineItem.cashAmount + (lineItem.taxes || 0) + (lineItem.fees || 0);
    }
  }

  const plan: CancellationPlan = {
    bookingId: request.bookingId,
    lineItemIds: lineItemsToCancel.map(item => item.id),
    reason: request.reason,
    requestedBy: request.requestedBy,
    steps,
    totalPointsToRefund,
    totalPointsToCancel,
    netPointsChange: totalPointsToRefund - totalPointsToCancel,
    totalCashRefund,
    createdAt: new Date().toISOString()
  };

  return plan;
}

/**
 * Execute cancellation plan
 */
export async function executeCancellationPlan(plan: CancellationPlan): Promise<CancellationResult> {
  const result: CancellationResult = {
    plan,
    steps: [...plan.steps], // Copy steps for tracking
    success: false,
    partialSuccess: false,
    completedAt: "",
    actualPointsRefunded: 0,
    actualPointsCancelled: 0,
    actualCashRefund: 0,
    errors: []
  };

  console.log(`[cancellation] Executing plan for booking ${plan.bookingId} with ${plan.steps.length} steps`);

  // Execute steps in priority order: redemptions first, then accruals
  const redemptionSteps = result.steps.filter(step => step.type === "REDEMPTION_REFUND");
  const accrualSteps = result.steps.filter(step => step.type === "ACCRUAL_CANCEL");
  
  // Step 1: Process redemption refunds (points back to member)
  for (const step of redemptionSteps) {
    await executeRedemptionRefund(step, result);
  }

  // Step 2: Process accrual cancellations (remove points from member)
  for (const step of accrualSteps) {
    await executeAccrualCancellation(step, result);
  }

  // Step 3: Update line item statuses in local storage and Salesforce
  await updateLineItemStatuses(plan, result);

  // Determine overall success
  const failedSteps = result.steps.filter((step: any) => step.status === "FAILED");
  const completedSteps = result.steps.filter((step: any) => step.status === "COMPLETED");
  
  result.success = failedSteps.length === 0 && completedSteps.length > 0;
  result.partialSuccess = completedSteps.length > 0 && failedSteps.length > 0;
  result.completedAt = new Date().toISOString();

  if (failedSteps.length > 0) {
    console.error(`[cancellation] ${failedSteps.length}/${result.steps.length} steps failed`);
  } else {
    console.log(`[cancellation] All ${result.steps.length} steps completed successfully`);
  }

  return result;
}

/**
 * Execute redemption refund using Salesforce Loyalty Management API
 */
async function executeRedemptionRefund(step: CancellationStep, result: CancellationResult): Promise<void> {
  try {
    step.status = "PROCESSING";
    step.startedAt = new Date().toISOString();

    console.log(`[cancellation] Refunding ${step.amount} points from redemption journal ${step.journalId}`);

    const { access_token, instance_url } = await getClientCredentialsToken();
    
    // Use Salesforce Loyalty Management cancellation API
    const cancelResponse = await fetch(
      `${instance_url}/services/data/${DEFAULT_API_VERSION}/connect/loyalty/programs/${process.env.SF_LOYALTY_PROGRAM}/transactions/cancel-redemption`, 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionJournalIds: [step.journalId],
          processAsynchronously: false
        })
      }
    );

    const cancelResult = await cancelResponse.json();
    step.salesforceResponse = cancelResult;

    if (cancelResponse.ok && cancelResult.status) {
      step.status = "COMPLETED";
      step.completedAt = new Date().toISOString();
      result.actualPointsRefunded += step.amount;
      
      // Extract cancellation ID if provided
      step.cancellationId = cancelResult.processResult?.transactionJournalResult?.[0]?.id;
      
      console.log(`[cancellation] Successfully refunded ${step.amount} points (cancellation: ${step.cancellationId})`);
    } else {
      throw new Error(cancelResult.message || `HTTP ${cancelResponse.status}`);
    }

  } catch (error: any) {
    step.status = "FAILED";
    step.error = error.message || String(error);
    step.completedAt = new Date().toISOString();
    result.errors?.push(`Redemption refund failed for ${step.journalId}: ${step.error}`);
    console.error(`[cancellation] Redemption refund failed:`, error);
  }
}

/**
 * Execute accrual cancellation using Salesforce Loyalty Management API
 */
async function executeAccrualCancellation(step: CancellationStep, result: CancellationResult): Promise<void> {
  try {
    step.status = "PROCESSING";
    step.startedAt = new Date().toISOString();

    console.log(`[cancellation] Cancelling ${step.amount} points from accrual journal ${step.journalId}`);

    const { access_token, instance_url } = await getClientCredentialsToken();
    
    // Use Salesforce Loyalty Management cancellation API
    const cancelResponse = await fetch(
      `${instance_url}/services/data/${DEFAULT_API_VERSION}/connect/loyalty/programs/${process.env.SF_LOYALTY_PROGRAM}/transactions/cancel-accrual`, 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionJournalIds: [step.journalId],
          processAsynchronously: false
        })
      }
    );

    const cancelResult = await cancelResponse.json();
    step.salesforceResponse = cancelResult;

    if (cancelResponse.ok && cancelResult.status) {
      step.status = "COMPLETED";
      step.completedAt = new Date().toISOString();
      result.actualPointsCancelled += step.amount;
      
      // Extract cancellation ID if provided
      step.cancellationId = cancelResult.processResult?.transactionJournalResult?.[0]?.id;
      
      console.log(`[cancellation] Successfully cancelled ${step.amount} points (cancellation: ${step.cancellationId})`);
    } else {
      throw new Error(cancelResult.message || `HTTP ${cancelResponse.status}`);
    }

  } catch (error: any) {
    step.status = "FAILED";
    step.error = error.message || String(error);
    step.completedAt = new Date().toISOString();
    result.errors?.push(`Accrual cancellation failed for ${step.journalId}: ${step.error}`);
    console.error(`[cancellation] Accrual cancellation failed:`, error);
  }
}

/**
 * Update line item statuses after cancellation
 */
async function updateLineItemStatuses(plan: CancellationPlan, result: CancellationResult): Promise<void> {
  try {
    console.log(`[cancellation] Updating line item statuses for booking ${plan.bookingId}`);

    // Update local storage
    for (const lineItemId of plan.lineItemIds) {
      await updateLineItemStatus(plan.bookingId, lineItemId, 'CANCELLED', {
        cancelledAt: new Date().toISOString(),
        cancellationReason: plan.reason,
        cancelledBy: plan.requestedBy
      });
    }

    // Update Salesforce line items
    const salesforceResult = await cancelSalesforceLineItems(
      plan.lineItemIds, 
      plan.reason, 
      plan.requestedBy
    );

    if (!salesforceResult.success) {
      const errors = salesforceResult.results.filter(r => !r.ok).map(r => r.error).join(', ');
      result.errors?.push(`Salesforce line item updates failed: ${errors}`);
    }

    console.log(`[cancellation] Updated ${plan.lineItemIds.length} line items`);

  } catch (error: any) {
    result.errors?.push(`Line item status update failed: ${error.message}`);
    console.error(`[cancellation] Line item update failed:`, error);
  }
}

/**
 * Get cancellation plan without executing
 */
export async function previewCancellation(request: CancellationRequest): Promise<CancellationPlan> {
  return createCancellationPlan(request);
}