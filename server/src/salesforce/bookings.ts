// server/src/salesforce/bookings.ts
// Integration with Salesforce custom booking objects

import { getClientCredentialsToken } from "./auth";
import type { TripBooking, BookingLineItem } from "../../../shared/bookingTypes";

const DEFAULT_API_VERSION = process.env.SF_API_VERSION || "v64.0";

export type SalesforceBookingResult = {
  ok: boolean;
  status: number;
  salesforceId?: string;
  body: any;
  error?: string;
};

export type SalesforceLineItemResult = {
  ok: boolean;
  status: number;
  salesforceId?: string;
  body: any;
  error?: string;
};

// Create booking record in Salesforce
export async function createSalesforceBooking(booking: TripBooking): Promise<SalesforceBookingResult> {
  try {
    const { access_token, instance_url } = await getClientCredentialsToken();
    
    const bookingRecord = {
      External_Transaction_Number__c: booking.externalTransactionNumber,
      Member_Id__c: booking.memberId, // Using existing field for now
      Membership_Number__c: booking.membershipNumber,
      Booking_Date__c: booking.bookingDate,
      Trip_Start_Date__c: booking.tripStartDate,
      Trip_End_Date__c: booking.tripEndDate,
      Channel__c: booking.channel,
      POS__c: booking.posa,
      Payment_Method__c: booking.paymentMethod,
      Booking_Status__c: booking.status,
      Internal_Booking_Id__c: booking.id,
      Created_By_System__c: 'TTH-Booking-System',
      Notes__c: booking.notes,
      // Computed totals (will be updated by triggers)
      Total_Cash_Amount__c: booking.totalCashAmount,
      Total_Taxes_And_Fees__c: booking.totalTaxesAndFees, 
      Total_Points_Redeemed__c: booking.totalPointsRedeemed,
      Total_Points_Earned__c: booking.totalPointsEarned,
    };
    
    console.log('[sf-bookings] Creating Salesforce booking:', {
      externalId: booking.externalTransactionNumber,
      internalId: booking.id,
      lineItemCount: booking.lineItems.length
    });
    
    const response = await fetch(`${instance_url}/services/data/${DEFAULT_API_VERSION}/sobjects/Trip_Booking__c`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingRecord)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('[sf-bookings] Failed to create booking:', result);
      return {
        ok: false,
        status: response.status,
        body: result,
        error: result.message || result[0]?.message || `HTTP ${response.status}`
      };
    }
    
    const salesforceBookingId = result.id;
    console.log('[sf-bookings] Created Salesforce booking:', salesforceBookingId);
    
    // Create line items
    const lineItemResults = [];
    for (const lineItem of booking.lineItems) {
      const lineItemResult = await createSalesforceLineItem(salesforceBookingId, lineItem, booking);
      lineItemResults.push(lineItemResult);
      
      if (!lineItemResult.ok) {
        console.warn('[sf-bookings] Failed to create line item:', lineItemResult.error);
        // Continue with other line items rather than failing entirely
      }
    }
    
    return {
      ok: true,
      status: response.status,
      salesforceId: salesforceBookingId,
      body: {
        ...result,
        lineItems: lineItemResults
      }
    };
    
  } catch (error: any) {
    console.error('[sf-bookings] Error creating booking:', error);
    return {
      ok: false,
      status: 500,
      body: {},
      error: error.message || String(error)
    };
  }
}

// Create line item record in Salesforce
export async function createSalesforceLineItem(
  salesforceBookingId: string, 
  lineItem: BookingLineItem,
  booking?: TripBooking
): Promise<SalesforceLineItemResult> {
  try {
    const { access_token, instance_url } = await getClientCredentialsToken();
    
    const lineItemRecord = {
      Trip_Booking__c: salesforceBookingId,
      // Loyalty_Program_Member__c: lineItem.memberId || booking?.memberId, // Add member lookup to line item (field not deployed yet)
      Line_of_Business__c: lineItem.lob,
      Line_Item_Status__c: lineItem.status,
      Product_Name__c: lineItem.productName,
      Product_Code__c: lineItem.productCode,
      Cash_Amount__c: lineItem.cashAmount,
      Points_Redeemed__c: lineItem.pointsRedeemed,
      Currency_Code__c: lineItem.currency || 'USD', // Ensure currency is always set, default to USD
      Taxes__c: lineItem.taxes,
      Fees__c: lineItem.fees,
      Destination_City__c: lineItem.destinationCity,
      Destination_Country__c: lineItem.destinationCountry,
      Start_Date__c: lineItem.startDate?.split('T')[0], // Convert to date only
      End_Date__c: lineItem.endDate?.split('T')[0],
      Nights__c: lineItem.nights,
      Redemption_Journal_Id__c: lineItem.redemptionJournalId,
      Accrual_Journal_Id__c: lineItem.accrualJournalId,
      // Cancellation fields
      Cancelled_Date__c: lineItem.cancelledAt,
      Cancellation_Reason__c: lineItem.cancellationReason,
      Cancelled_By__c: lineItem.cancelledBy,
      // Internal tracking
      Internal_Line_Item_Id__c: lineItem.id,
    };
    
    const response = await fetch(`${instance_url}/services/data/${DEFAULT_API_VERSION}/sobjects/Booking_Line_Item__c`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lineItemRecord)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        body: result,
        error: result.message || result[0]?.message || `HTTP ${response.status}`
      };
    }
    
    return {
      ok: true,
      status: response.status,
      salesforceId: result.id,
      body: result
    };
    
  } catch (error: any) {
    console.error('[sf-bookings] Error creating line item:', error);
    return {
      ok: false,
      status: 500,
      body: {},
      error: error.message || String(error)
    };
  }
}

// Update booking status in Salesforce
export async function updateSalesforceBookingStatus(
  externalTransactionNumber: string,
  status: string,
  notes?: string
): Promise<SalesforceBookingResult> {
  try {
    const { access_token, instance_url } = await getClientCredentialsToken();
    
    // First, find the booking by External_Transaction_Number__c
    const queryUrl = `${instance_url}/services/data/${DEFAULT_API_VERSION}/query?q=${encodeURIComponent(
      `SELECT Id FROM Trip_Booking__c WHERE External_Transaction_Number__c = '${externalTransactionNumber}' LIMIT 1`
    )}`;
    
    const queryResponse = await fetch(queryUrl, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const queryResult = await queryResponse.json();
    
    if (!queryResponse.ok || !queryResult.records?.length) {
      return {
        ok: false,
        status: 404,
        body: queryResult,
        error: 'Booking not found in Salesforce'
      };
    }
    
    const salesforceId = queryResult.records[0].Id;
    
    // Update the booking
    const updateData: any = {
      Booking_Status__c: status,
      Last_Sync_Date__c: new Date().toISOString(),
    };
    
    if (notes) {
      updateData.Notes__c = notes;
    }
    
    const updateResponse = await fetch(`${instance_url}/services/data/${DEFAULT_API_VERSION}/sobjects/Trip_Booking__c/${salesforceId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!updateResponse.ok) {
      const result = await updateResponse.json();
      return {
        ok: false,
        status: updateResponse.status,
        body: result,
        error: result.message || result[0]?.message || `HTTP ${updateResponse.status}`
      };
    }
    
    return {
      ok: true,
      status: updateResponse.status,
      salesforceId,
      body: { message: 'Booking status updated successfully' }
    };
    
  } catch (error: any) {
    console.error('[sf-bookings] Error updating booking status:', error);
    return {
      ok: false,
      status: 500,
      body: {},
      error: error.message || String(error)
    };
  }
}

// Update line item journal IDs in Salesforce
export async function updateSalesforceLineItemJournals(
  internalLineItemId: string,
  journalIds: { redemptionJournalId?: string; accrualJournalId?: string }
): Promise<SalesforceLineItemResult> {
  try {
    const { access_token, instance_url } = await getClientCredentialsToken();
    
    // Find the line item by Internal_Line_Item_Id__c
    const queryUrl = `${instance_url}/services/data/${DEFAULT_API_VERSION}/query?q=${encodeURIComponent(
      `SELECT Id FROM Booking_Line_Item__c WHERE Internal_Line_Item_Id__c = '${internalLineItemId}' LIMIT 1`
    )}`;
    
    const queryResponse = await fetch(queryUrl, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const queryResult = await queryResponse.json();
    
    if (!queryResponse.ok || !queryResult.records?.length) {
      return {
        ok: false,
        status: 404,
        body: queryResult,
        error: 'Line item not found in Salesforce'
      };
    }
    
    const salesforceId = queryResult.records[0].Id;
    
    // Update journal IDs
    const updateData: any = {};
    if (journalIds.redemptionJournalId) {
      updateData.Redemption_Journal_Id__c = journalIds.redemptionJournalId;
    }
    if (journalIds.accrualJournalId) {
      updateData.Accrual_Journal_Id__c = journalIds.accrualJournalId;
    }
    
    const updateResponse = await fetch(`${instance_url}/services/data/${DEFAULT_API_VERSION}/sobjects/Booking_Line_Item__c/${salesforceId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!updateResponse.ok) {
      const result = await updateResponse.json();
      return {
        ok: false,
        status: updateResponse.status,
        body: result,
        error: result.message || result[0]?.message || `HTTP ${updateResponse.status}`
      };
    }
    
    console.log('[sf-bookings] Updated line item journal IDs:', {
      internalId: internalLineItemId,
      salesforceId,
      journalIds
    });
    
    return {
      ok: true,
      status: updateResponse.status,
      salesforceId,
      body: { message: 'Line item journal IDs updated successfully' }
    };
    
  } catch (error: any) {
    console.error('[sf-bookings] Error updating line item journals:', error);
    return {
      ok: false,
      status: 500,
      body: {},
      error: error.message || String(error)
    };
  }
}

// Cancel line items in Salesforce
export async function cancelSalesforceLineItems(
  internalLineItemIds: string[],
  reason?: string,
  cancelledBy?: string
): Promise<{ results: SalesforceLineItemResult[]; success: boolean }> {
  const results: SalesforceLineItemResult[] = [];
  let allSuccess = true;
  
  for (const internalId of internalLineItemIds) {
    try {
      const { access_token, instance_url } = await getClientCredentialsToken();
      
      // Find the line item
      const queryUrl = `${instance_url}/services/data/${DEFAULT_API_VERSION}/query?q=${encodeURIComponent(
        `SELECT Id FROM Booking_Line_Item__c WHERE Internal_Line_Item_Id__c = '${internalId}' LIMIT 1`
      )}`;
      
      const queryResponse = await fetch(queryUrl, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      
      const queryResult = await queryResponse.json();
      
      if (!queryResponse.ok || !queryResult.records?.length) {
        const result: SalesforceLineItemResult = {
          ok: false,
          status: 404,
          body: queryResult,
          error: 'Line item not found in Salesforce'
        };
        results.push(result);
        allSuccess = false;
        continue;
      }
      
      const salesforceId = queryResult.records[0].Id;
      
      // Update to cancelled status
      const updateData = {
        Line_Item_Status__c: 'CANCELLED',
        Cancelled_Date__c: new Date().toISOString(),
        Cancellation_Reason__c: reason,
        Cancelled_By__c: cancelledBy,
      };
      
      const updateResponse = await fetch(`${instance_url}/services/data/${DEFAULT_API_VERSION}/sobjects/Booking_Line_Item__c/${salesforceId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!updateResponse.ok) {
        const result = await updateResponse.json();
        const lineItemResult: SalesforceLineItemResult = {
          ok: false,
          status: updateResponse.status,
          body: result,
          error: result.message || result[0]?.message || `HTTP ${updateResponse.status}`
        };
        results.push(lineItemResult);
        allSuccess = false;
      } else {
        const lineItemResult: SalesforceLineItemResult = {
          ok: true,
          status: updateResponse.status,
          salesforceId,
          body: { message: 'Line item cancelled successfully' }
        };
        results.push(lineItemResult);
      }
      
    } catch (error: any) {
      console.error('[sf-bookings] Error cancelling line item:', error);
      const lineItemResult: SalesforceLineItemResult = {
        ok: false,
        status: 500,
        body: {},
        error: error.message || String(error)
      };
      results.push(lineItemResult);
      allSuccess = false;
    }
  }
  
  return { results, success: allSuccess };
}

// Get booking from Salesforce by external transaction number
export async function getSalesforceBooking(externalTransactionNumber: string): Promise<any> {
  try {
    const { access_token, instance_url } = await getClientCredentialsToken();
    
    const queryUrl = `${instance_url}/services/data/${DEFAULT_API_VERSION}/query?q=${encodeURIComponent(
      `SELECT Id, Name, External_Transaction_Number__c, Booking_Status__c, Member_Id__c, 
              Membership_Number__c, Booking_Date__c, Trip_Start_Date__c, Trip_End_Date__c,
              Channel__c, POS__c, Payment_Method__c, Total_Cash_Amount__c, Total_Taxes_And_Fees__c,
              Total_Points_Redeemed__c, Total_Points_Earned__c, Internal_Booking_Id__c,
              Created_By_System__c, Notes__c, Last_Sync_Date__c,
              (SELECT Id, Name, Line_of_Business__c, Line_Item_Status__c, Product_Name__c,
                      Product_Code__c, Cash_Amount__c, Points_Redeemed__c, Currency_Code__c,
                      Taxes__c, Fees__c, Destination_City__c, Destination_Country__c,
                      Start_Date__c, End_Date__c, Nights__c, Redemption_Journal_Id__c,
                      Accrual_Journal_Id__c, Cancelled_Date__c, Cancellation_Reason__c,
                      Cancelled_By__c, Internal_Line_Item_Id__c
               FROM Booking_Line_Items__r)
       FROM Trip_Booking__c 
       WHERE External_Transaction_Number__c = '${externalTransactionNumber}' 
       LIMIT 1`
    )}`;
    
    const response = await fetch(queryUrl, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || result[0]?.message || `HTTP ${response.status}`);
    }
    
    return result.records?.[0] || null;
    
  } catch (error: any) {
    console.error('[sf-bookings] Error fetching booking:', error);
    throw error;
  }
}

// Convert Salesforce booking record to TripBooking format
function convertSalesforceBookingToTripBooking(sfRecord: any): TripBooking {
  const lineItems: BookingLineItem[] = (sfRecord.Booking_Line_Items__r?.records || []).map((sfLineItem: any) => ({
    id: sfLineItem.Internal_Line_Item_Id__c || sfLineItem.Id,
    lob: sfLineItem.Line_of_Business__c,
    status: sfLineItem.Line_Item_Status__c || "ACTIVE",
    productName: sfLineItem.Product_Name__c,
    productCode: sfLineItem.Product_Code__c,
    cashAmount: sfLineItem.Cash_Amount__c || 0,
    pointsRedeemed: sfLineItem.Points_Redeemed__c || 0,
    currency: sfLineItem.Currency_Code__c || "USD",
    taxes: sfLineItem.Taxes__c || 0,
    fees: sfLineItem.Fees__c || 0,
    destinationCity: sfLineItem.Destination_City__c,
    destinationCountry: sfLineItem.Destination_Country__c,
    startDate: sfLineItem.Start_Date__c,
    endDate: sfLineItem.End_Date__c,
    nights: sfLineItem.Nights__c,
    redemptionJournalId: sfLineItem.Redemption_Journal_Id__c,
    accrualJournalId: sfLineItem.Accrual_Journal_Id__c,
    cancelledAt: sfLineItem.Cancelled_Date__c,
    cancellationReason: sfLineItem.Cancellation_Reason__c,
    cancelledBy: sfLineItem.Cancelled_By__c,
    createdAt: new Date().toISOString(), // SF doesn't store individual line item creation dates
    updatedAt: new Date().toISOString()
  }));

  return {
    id: sfRecord.Internal_Booking_Id__c || sfRecord.Id,
    externalTransactionNumber: sfRecord.External_Transaction_Number__c,
    memberId: sfRecord.Member_Id__c,
    membershipNumber: sfRecord.Membership_Number__c,
    bookingDate: sfRecord.Booking_Date__c,
    tripStartDate: sfRecord.Trip_Start_Date__c,
    tripEndDate: sfRecord.Trip_End_Date__c,
    channel: sfRecord.Channel__c,
    posa: sfRecord.POS__c,
    paymentMethod: sfRecord.Payment_Method__c,
    lineItems,
    status: sfRecord.Booking_Status__c || "ACTIVE",
    totalCashAmount: sfRecord.Total_Cash_Amount__c || 0,
    totalTaxesAndFees: sfRecord.Total_Taxes_And_Fees__c || 0,
    totalPointsRedeemed: sfRecord.Total_Points_Redeemed__c || 0,
    totalPointsEarned: sfRecord.Total_Points_Earned__c || 0,
    createdAt: new Date(sfRecord.CreatedDate || Date.now()).toISOString(),
    updatedAt: new Date(sfRecord.LastModifiedDate || Date.now()).toISOString(),
    createdBy: sfRecord.Created_By_System__c,
    notes: sfRecord.Notes__c
  };
}

// Query bookings from Salesforce with filters
export async function querySalesforceBookings(
  filters: {
    membershipNumber?: string;
    memberId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    lob?: string;
    externalTransactionNumber?: string;
  } = {},
  page = 1,
  pageSize = 20
): Promise<{ bookings: TripBooking[], totalCount: number }> {
  try {
    const { access_token, instance_url } = await getClientCredentialsToken();
    
    // Build WHERE clause
    const whereConditions = [];
    
    if (filters.membershipNumber) {
      whereConditions.push(`Membership_Number__c = '${filters.membershipNumber}'`);
    }
    
    if (filters.memberId) {
      whereConditions.push(`Member_Id__c = '${filters.memberId}'`);
    }
    
    if (filters.status) {
      whereConditions.push(`Booking_Status__c = '${filters.status}'`);
    }
    
    if (filters.dateFrom) {
      whereConditions.push(`Booking_Date__c >= ${filters.dateFrom}`);
    }
    
    if (filters.dateTo) {
      whereConditions.push(`Booking_Date__c <= ${filters.dateTo}`);
    }
    
    if (filters.externalTransactionNumber) {
      whereConditions.push(`External_Transaction_Number__c LIKE '%${filters.externalTransactionNumber}%'`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Count query
    const countQuery = `SELECT COUNT() FROM Trip_Booking__c ${whereClause}`;
    const countUrl = `${instance_url}/services/data/${DEFAULT_API_VERSION}/query?q=${encodeURIComponent(countQuery)}`;
    
    const countResponse = await fetch(countUrl, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const countResult = await countResponse.json();
    const totalCount = countResult.totalSize || 0;
    
    if (totalCount === 0) {
      return { bookings: [], totalCount: 0 };
    }
    
    // Data query with pagination
    const offset = (page - 1) * pageSize;
    const dataQuery = `
      SELECT Id, Name, External_Transaction_Number__c, Booking_Status__c, Member_Id__c, 
             Membership_Number__c, Booking_Date__c, Trip_Start_Date__c, Trip_End_Date__c,
             Channel__c, POS__c, Payment_Method__c, Total_Cash_Amount__c, Total_Taxes_And_Fees__c,
             Total_Points_Redeemed__c, Total_Points_Earned__c, Internal_Booking_Id__c,
             Created_By_System__c, Notes__c, Last_Sync_Date__c, CreatedDate, LastModifiedDate,
             (SELECT Id, Name, Line_of_Business__c, Line_Item_Status__c, Product_Name__c,
                     Product_Code__c, Cash_Amount__c, Points_Redeemed__c, Currency_Code__c,
                     Taxes__c, Fees__c, Destination_City__c, Destination_Country__c,
                     Start_Date__c, End_Date__c, Nights__c, Redemption_Journal_Id__c,
                     Accrual_Journal_Id__c, Cancelled_Date__c, Cancellation_Reason__c,
                     Cancelled_By__c, Internal_Line_Item_Id__c
              FROM Booking_Line_Items__r)
      FROM Trip_Booking__c 
      ${whereClause}
      ORDER BY CreatedDate DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    
    const dataUrl = `${instance_url}/services/data/${DEFAULT_API_VERSION}/query?q=${encodeURIComponent(dataQuery)}`;
    
    const dataResponse = await fetch(dataUrl, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const dataResult = await dataResponse.json();
    
    if (!dataResponse.ok) {
      throw new Error(dataResult.message || dataResult[0]?.message || `HTTP ${dataResponse.status}`);
    }
    
    // Convert to TripBooking format
    const bookings: TripBooking[] = (dataResult.records || []).map(convertSalesforceBookingToTripBooking);
    
    console.log(`[sf-bookings] Queried ${bookings.length} bookings from Salesforce (total: ${totalCount})`);
    
    return { bookings, totalCount };
    
  } catch (error: any) {
    console.error('[sf-bookings] Error querying bookings:', error);
    throw error;
  }
}

/**
 * Get booking by internal booking ID
 */
export async function getSalesforceBookingById(internalBookingId: string): Promise<TripBooking | null> {
  try {
    console.log(`[sf-bookings] Getting booking by internal ID: ${internalBookingId}`);
    
    const { access_token, instance_url } = await getClientCredentialsToken();
    
    const query = `
      SELECT Id, Name, External_Transaction_Number__c, Booking_Status__c, Member_Id__c, 
             Membership_Number__c, Booking_Date__c, Trip_Start_Date__c, Trip_End_Date__c,
             Channel__c, POS__c, Payment_Method__c, Total_Cash_Amount__c, Total_Taxes_And_Fees__c,
             Total_Points_Redeemed__c, Total_Points_Earned__c, Internal_Booking_Id__c,
             Created_By_System__c, Notes__c, Last_Sync_Date__c, CreatedDate, LastModifiedDate,
             (SELECT Id, Name, Line_of_Business__c, Line_Item_Status__c, Product_Name__c,
                     Product_Code__c, Cash_Amount__c, Points_Redeemed__c, Currency_Code__c,
                     Taxes__c, Fees__c, Destination_City__c, Destination_Country__c,
                     Start_Date__c, End_Date__c, Nights__c, Redemption_Journal_Id__c,
                     Accrual_Journal_Id__c, Cancelled_Date__c, Cancellation_Reason__c,
                     Cancelled_By__c, Internal_Line_Item_Id__c
              FROM Booking_Line_Items__r)
      FROM Trip_Booking__c 
      WHERE Internal_Booking_Id__c = '${internalBookingId}'
      LIMIT 1
    `;
    
    const url = `${instance_url}/services/data/${DEFAULT_API_VERSION}/query?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || result[0]?.message || `HTTP ${response.status}`);
    }
    
    if (result.records && result.records.length > 0) {
      const booking = convertSalesforceBookingToTripBooking(result.records[0]);
      console.log(`[sf-bookings] Found booking by internal ID: ${booking.id} (${booking.externalTransactionNumber})`);
      return booking;
    }
    
    console.log(`[sf-bookings] No booking found with internal ID: ${internalBookingId}`);
    return null;
    
  } catch (error: any) {
    console.error(`[sf-bookings] Error getting booking by ID ${internalBookingId}:`, error);
    throw error;
  }
}