// routes/bookings.ts
import { Router } from "express";
import { z } from "zod";
import {
  createBooking,
  getBookingById,
  getBookingByExternalTransactionNumber,
  updateBooking,
  deleteBooking,
  listBookings,
  getBookingSummaries,
  cancelLineItems,
  updateLineItemJournalIds,
  clearAllBookings,
  getBookingCount
} from "../data/bookings";
import type { 
  CreateBookingRequest, 
  UpdateBookingRequest, 
  BookingFilters,
  TripBooking 
} from "../../../shared/bookingTypes";
import { getSalesforceBooking } from "../salesforce/bookings";

const router = Router();

console.log("[bookings] router loaded");
router.use((req, _res, next) => {
  console.log(`[bookings] ${req.method} ${req.path}`);
  next();
});

router.get("/__ping", (_req, res) => {
  res.json({ ok: true, at: "/api/bookings/__ping", count: getBookingCount() });
});

// POST /api/bookings - Create a new booking
router.post("/", async (req, res) => {
  try {
    const request = req.body as CreateBookingRequest;
    
    // Basic validation
    if (!request.externalTransactionNumber) {
      return res.status(400).json({ 
        error: "externalTransactionNumber is required" 
      });
    }
    
    if (!request.lineItems || request.lineItems.length === 0) {
      return res.status(400).json({ 
        error: "At least one line item is required" 
      });
    }
    
    // Check if booking already exists
    const existing = await getBookingByExternalTransactionNumber(request.externalTransactionNumber);
    if (existing) {
      return res.status(409).json({ 
        error: "Booking with this external transaction number already exists",
        existingBookingId: existing.id 
      });
    }
    
    const booking = await createBooking(request);
    
    res.status(201).json({
      success: true,
      booking,
      _meta: {
        createdAt: new Date().toISOString(),
        lineItemCount: booking.lineItems.length
      }
    });
    
  } catch (error: any) {
    console.error("[bookings] Create error:", error);
    res.status(500).json({ 
      error: "Failed to create booking",
      message: error.message 
    });
  }
});

// GET /api/bookings - List bookings with filters and pagination
router.get("/", async (req, res) => {
  try {
    const {
      membershipNumber,
      memberId,
      status,
      dateFrom,
      dateTo,
      lob,
      externalTransactionNumber,
      page = "1",
      pageSize = "20",
      summary = "false"
    } = req.query;
    
    const filters: BookingFilters = {};
    if (membershipNumber) filters.membershipNumber = String(membershipNumber);
    if (memberId) filters.memberId = String(memberId);
    if (status) filters.status = status as any;
    if (dateFrom) filters.dateFrom = String(dateFrom);
    if (dateTo) filters.dateTo = String(dateTo);
    if (lob) filters.lob = lob as any;
    if (externalTransactionNumber) filters.externalTransactionNumber = String(externalTransactionNumber);
    
    const pageNum = Math.max(1, parseInt(String(page)));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(String(pageSize))));
    
    if (summary === "true") {
      const result = await getBookingSummaries(filters, pageNum, pageSizeNum);
      res.json({
        summaries: result.summaries,
        totalCount: result.totalCount,
        page: pageNum,
        pageSize: pageSizeNum,
        hasMore: pageNum * pageSizeNum < result.totalCount
      });
    } else {
      const result = await listBookings(filters, pageNum, pageSizeNum);
      res.json({
        bookings: result.bookings,
        totalCount: result.totalCount,
        page: pageNum,
        pageSize: pageSizeNum,
        hasMore: pageNum * pageSizeNum < result.totalCount
      });
    }
    
  } catch (error: any) {
    console.error("[bookings] List error:", error);
    res.status(500).json({ 
      error: "Failed to list bookings",
      message: error.message 
    });
  }
});

// GET /api/bookings/:id - Get booking by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await getBookingById(id);
    
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    res.json({ booking });
    
  } catch (error: any) {
    console.error("[bookings] Get error:", error);
    res.status(500).json({ 
      error: "Failed to get booking",
      message: error.message 
    });
  }
});

// GET /api/bookings/external/:externalTransactionNumber - Get booking by external transaction number
router.get("/external/:externalTransactionNumber", async (req, res) => {
  try {
    const { externalTransactionNumber } = req.params;
    const { source = "local" } = req.query;
    
    let booking = null;
    let salesforceData = null;
    
    if (source === "salesforce" && process.env.SF_SYNC_BOOKINGS === "true") {
      // Try Salesforce first
      try {
        salesforceData = await getSalesforceBooking(externalTransactionNumber);
        console.log(`[bookings] Found booking in Salesforce:`, salesforceData?.Id);
      } catch (error: any) {
        console.warn(`[bookings] Error fetching from Salesforce:`, error.message);
      }
    }
    
    // Always try local storage as fallback or primary source
    booking = await getBookingByExternalTransactionNumber(externalTransactionNumber);
    
    if (!booking && !salesforceData) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    res.json({ 
      booking,
      _salesforce: salesforceData || undefined
    });
    
  } catch (error: any) {
    console.error("[bookings] Get by external ID error:", error);
    res.status(500).json({ 
      error: "Failed to get booking",
      message: error.message 
    });
  }
});

// PUT /api/bookings/:id - Update booking
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body as UpdateBookingRequest;
    
    const booking = await updateBooking(id, updates);
    
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    res.json({ 
      success: true,
      booking 
    });
    
  } catch (error: any) {
    console.error("[bookings] Update error:", error);
    res.status(500).json({ 
      error: "Failed to update booking",
      message: error.message 
    });
  }
});

// DELETE /api/bookings/:id - Delete booking
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteBooking(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    res.json({ 
      success: true,
      message: "Booking deleted successfully" 
    });
    
  } catch (error: any) {
    console.error("[bookings] Delete error:", error);
    res.status(500).json({ 
      error: "Failed to delete booking",
      message: error.message 
    });
  }
});

// POST /api/bookings/:id/journal-ids - Update journal IDs after posting to Salesforce
router.post("/:id/journal-ids", async (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const { lineItemId, redemptionJournalId, accrualJournalId } = req.body;
    
    if (!lineItemId) {
      return res.status(400).json({ error: "lineItemId is required" });
    }
    
    const updated = await updateLineItemJournalIds(bookingId, lineItemId, {
      redemptionJournalId,
      accrualJournalId
    });
    
    if (!updated) {
      return res.status(404).json({ error: "Booking or line item not found" });
    }
    
    res.json({ 
      success: true,
      message: "Journal IDs updated successfully" 
    });
    
  } catch (error: any) {
    console.error("[bookings] Update journal IDs error:", error);
    res.status(500).json({ 
      error: "Failed to update journal IDs",
      message: error.message 
    });
  }
});

// POST /api/bookings/:id/cancel - Basic cancel line items (legacy)
router.post("/:id/cancel", async (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const { lineItemIds, reason, requestedBy } = req.body;
    
    if (!lineItemIds || !Array.isArray(lineItemIds) || lineItemIds.length === 0) {
      return res.status(400).json({ error: "lineItemIds array is required" });
    }
    
    const cancelled = await cancelLineItems(bookingId, lineItemIds, reason, requestedBy);
    
    if (!cancelled) {
      return res.status(404).json({ error: "Booking not found or no items cancelled" });
    }
    
    // Return updated booking
    const booking = await getBookingById(bookingId);
    
    res.json({ 
      success: true,
      message: `Cancelled ${lineItemIds.length} line items`,
      booking
    });
    
  } catch (error: any) {
    console.error("[bookings] Cancel line items error:", error);
    res.status(500).json({ 
      error: "Failed to cancel line items",
      message: error.message 
    });
  }
});

// Advanced Cancellation Workflow Routes (with points-first priority logic)

// POST /api/bookings/:id/cancellation/preview - Preview cancellation plan
router.post("/:id/cancellation/preview", async (req, res) => {
  try {
    const { previewCancellation } = await import("../services/cancellationService");
    const { id: bookingId } = req.params;
    const { lineItemIds, reason, requestedBy } = req.body;
    
    const request = {
      bookingId,
      lineItemIds, // Optional - if not provided, cancels entire booking
      reason,
      requestedBy
    };
    
    const plan = await previewCancellation(request);
    
    res.json({
      success: true,
      plan,
      summary: {
        lineItemsToCancel: plan.lineItemIds.length,
        stepsRequired: plan.steps.length,
        pointsFirstPriority: {
          totalPointsToRefund: plan.totalPointsToRefund,
          totalPointsToCancel: plan.totalPointsToCancel,
          netPointsChange: plan.netPointsChange
        },
        totalCashRefund: plan.totalCashRefund
      }
    });
    
  } catch (error: any) {
    console.error("[cancellation] Preview error:", error);
    res.status(500).json({ 
      error: "Failed to create cancellation plan",
      message: error.message 
    });
  }
});

// POST /api/bookings/:id/cancellation/execute - Execute cancellation with points-first priority
router.post("/:id/cancellation/execute", async (req, res) => {
  try {
    const { createCancellationPlan, executeCancellationPlan } = await import("../services/cancellationService");
    const { id: bookingId } = req.params;
    const { lineItemIds, reason, requestedBy, confirm } = req.body;
    
    if (!confirm) {
      return res.status(400).json({ 
        error: "Confirmation required",
        message: "Set confirm: true to execute cancellation"
      });
    }
    
    const request = {
      bookingId,
      lineItemIds,
      reason,
      requestedBy
    };
    
    console.log(`[cancellation] Executing cancellation for booking ${bookingId}`);
    
    // Create and execute plan
    const plan = await createCancellationPlan(request);
    const result = await executeCancellationPlan(plan);
    
    // Return updated booking
    const booking = await getBookingById(bookingId);
    
    res.json({
      success: result.success,
      result,
      booking,
      summary: {
        stepsExecuted: result.steps.length,
        completedSteps: result.steps.filter(s => s.status === "COMPLETED").length,
        failedSteps: result.steps.filter(s => s.status === "FAILED").length,
        actualResults: {
          pointsRefunded: result.actualPointsRefunded,
          pointsCancelled: result.actualPointsCancelled,
          cashRefund: result.actualCashRefund
        }
      }
    });
    
  } catch (error: any) {
    console.error("[cancellation] Execute error:", error);
    res.status(500).json({ 
      error: "Failed to execute cancellation",
      message: error.message 
    });
  }
});

// Development/testing endpoints
if (process.env.NODE_ENV !== 'production') {
  // DELETE /api/bookings/__dev/clear - Clear all bookings (dev only)
  router.delete("/__dev/clear", (_req, res) => {
    clearAllBookings();
    res.json({ 
      success: true,
      message: "All bookings cleared (development mode)" 
    });
  });
}

export default router;
