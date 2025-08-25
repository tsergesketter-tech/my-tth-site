// server/src/data/bookings.ts
// In-memory booking storage - can be migrated to database later

import { 
  TripBooking, 
  BookingLineItem, 
  CreateBookingRequest, 
  UpdateBookingRequest,
  BookingFilters,
  BookingSummary,
  BookingState,
  LineOfBusiness 
} from "../../../shared/bookingTypes";
import { createSalesforceBooking, updateSalesforceLineItemJournals } from "../salesforce/bookings";

// In-memory storage (replace with database later)
let bookings: TripBooking[] = [];

// Helper to generate UUIDs (simple version)
function generateId(): string {
  return `bk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateLineItemId(): string {
  return `li_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to compute booking totals from line items
function computeBookingTotals(lineItems: BookingLineItem[]) {
  return lineItems.reduce(
    (acc, item) => ({
      totalCashAmount: acc.totalCashAmount + (item.cashAmount || 0),
      totalTaxesAndFees: acc.totalTaxesAndFees + (item.taxes || 0) + (item.fees || 0),
      totalPointsRedeemed: acc.totalPointsRedeemed + (item.pointsRedeemed || 0),
      totalPointsEarned: acc.totalPointsEarned, // Keep existing, will be updated after journal posting
    }),
    { totalCashAmount: 0, totalTaxesAndFees: 0, totalPointsRedeemed: 0, totalPointsEarned: 0 }
  );
}

// CRUD operations
export async function createBooking(request: CreateBookingRequest): Promise<TripBooking> {
  const now = new Date().toISOString();
  const bookingId = generateId();
  
  // Add IDs and timestamps to line items
  const lineItems: BookingLineItem[] = request.lineItems.map(item => ({
    ...item,
    id: generateLineItemId(),
    status: "ACTIVE" as const,
    createdAt: now,
    updatedAt: now,
  }));
  
  // Compute totals
  const totals = computeBookingTotals(lineItems);
  
  const booking: TripBooking = {
    id: bookingId,
    externalTransactionNumber: request.externalTransactionNumber,
    memberId: request.memberId,
    membershipNumber: request.membershipNumber,
    
    bookingDate: request.bookingDate || now.split('T')[0], // Default to today
    tripStartDate: request.tripStartDate,
    tripEndDate: request.tripEndDate,
    
    channel: request.channel,
    posa: request.posa,
    paymentMethod: request.paymentMethod,
    
    lineItems,
    status: "ACTIVE" as const,
    
    ...totals,
    
    createdAt: now,
    updatedAt: now,
    createdBy: request.createdBy,
    
    notes: request.notes,
  };
  
  bookings.push(booking);
  
  console.log(`[bookings] Created booking ${bookingId} with ${lineItems.length} line items`);
  
  // Optionally sync to Salesforce (don't block on failure)
  if (process.env.SF_SYNC_BOOKINGS === 'true') {
    createSalesforceBooking(booking)
      .then(result => {
        if (result.ok) {
          console.log(`[bookings] Synced booking ${bookingId} to Salesforce: ${result.salesforceId}`);
        } else {
          console.warn(`[bookings] Failed to sync booking ${bookingId} to Salesforce:`, result.error);
        }
      })
      .catch(error => {
        console.error(`[bookings] Error syncing booking ${bookingId} to Salesforce:`, error);
      });
  }
  
  return booking;
}

export async function getBookingById(id: string): Promise<TripBooking | null> {
  return bookings.find(b => b.id === id) || null;
}

export async function getBookingByExternalTransactionNumber(externalTransactionNumber: string): Promise<TripBooking | null> {
  return bookings.find(b => b.externalTransactionNumber === externalTransactionNumber) || null;
}

export async function updateBooking(id: string, updates: Partial<UpdateBookingRequest>): Promise<TripBooking | null> {
  const bookingIndex = bookings.findIndex(b => b.id === id);
  if (bookingIndex === -1) return null;
  
  const now = new Date().toISOString();
  const existing = bookings[bookingIndex];
  
  // Handle line items updates if provided
  let lineItems = existing.lineItems;
  if (updates.lineItems) {
    lineItems = updates.lineItems.map(item => ({
      ...item,
      id: generateLineItemId(),
      status: "ACTIVE" as const,
      createdAt: now,
      updatedAt: now,
    }));
  }
  
  // Recompute totals
  const totals = computeBookingTotals(lineItems);
  
  const updatedBooking: TripBooking = {
    ...existing,
    ...updates,
    id, // Don't allow ID changes
    lineItems,
    ...totals,
    updatedAt: now,
  };
  
  
  bookings[bookingIndex] = updatedBooking;
  
  console.log(`[bookings] Updated booking ${id}`);
  return updatedBooking;
}

export async function deleteBooking(id: string): Promise<boolean> {
  const initialLength = bookings.length;
  bookings = bookings.filter(b => b.id !== id);
  const deleted = bookings.length < initialLength;
  
  if (deleted) {
    console.log(`[bookings] Deleted booking ${id}`);
  }
  
  return deleted;
}

export async function listBookings(
  filters: BookingFilters = {}, 
  page = 1, 
  pageSize = 20
): Promise<{ bookings: TripBooking[], totalCount: number }> {
  
  let filtered = bookings;
  
  // Apply filters
  if (filters.membershipNumber) {
    filtered = filtered.filter(b => b.membershipNumber === filters.membershipNumber);
  }
  
  if (filters.memberId) {
    filtered = filtered.filter(b => b.memberId === filters.memberId);
  }
  
  if (filters.status) {
    filtered = filtered.filter(b => b.status === filters.status);
  }
  
  if (filters.externalTransactionNumber) {
    filtered = filtered.filter(b => 
      b.externalTransactionNumber.toLowerCase().includes(filters.externalTransactionNumber!.toLowerCase())
    );
  }
  
  if (filters.dateFrom) {
    filtered = filtered.filter(b => b.bookingDate >= filters.dateFrom!);
  }
  
  if (filters.dateTo) {
    filtered = filtered.filter(b => b.bookingDate <= filters.dateTo!);
  }
  
  if (filters.lob) {
    filtered = filtered.filter(b => 
      b.lineItems.some(item => item.lob === filters.lob)
    );
  }
  
  // Sort by creation date (newest first)
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Apply pagination
  const startIndex = (page - 1) * pageSize;
  const paginatedBookings = filtered.slice(startIndex, startIndex + pageSize);
  
  return {
    bookings: paginatedBookings,
    totalCount: filtered.length
  };
}

// Update journal IDs after posting to Salesforce
export async function updateLineItemJournalIds(
  bookingId: string,
  lineItemId: string,
  journalIds: { redemptionJournalId?: string; accrualJournalId?: string }
): Promise<boolean> {
  const booking = await getBookingById(bookingId);
  if (!booking) return false;
  
  const lineItem = booking.lineItems.find(item => item.id === lineItemId);
  if (!lineItem) return false;
  
  // Update journal IDs
  if (journalIds.redemptionJournalId) {
    lineItem.redemptionJournalId = journalIds.redemptionJournalId;
  }
  if (journalIds.accrualJournalId) {
    lineItem.accrualJournalId = journalIds.accrualJournalId;
  }
  
  lineItem.updatedAt = new Date().toISOString();
  booking.updatedAt = new Date().toISOString();
  
  console.log(`[bookings] Updated journal IDs for line item ${lineItemId} in booking ${bookingId}`);
  
  // Optionally sync journal IDs to Salesforce
  if (process.env.SF_SYNC_BOOKINGS === 'true') {
    updateSalesforceLineItemJournals(lineItemId, journalIds)
      .then(result => {
        if (result.ok) {
          console.log(`[bookings] Synced journal IDs for line item ${lineItemId} to Salesforce`);
        } else {
          console.warn(`[bookings] Failed to sync journal IDs for line item ${lineItemId}:`, result.error);
        }
      })
      .catch(error => {
        console.error(`[bookings] Error syncing journal IDs for line item ${lineItemId}:`, error);
      });
  }
  
  return true;
}

// Cancel line items (for cancellation workflow)
export async function cancelLineItems(
  bookingId: string,
  lineItemIds: string[],
  reason?: string,
  cancelledBy?: string
): Promise<boolean> {
  const booking = await getBookingById(bookingId);
  if (!booking) return false;
  
  const now = new Date().toISOString();
  let itemsCancelled = 0;
  
  // Cancel specified line items
  booking.lineItems.forEach(item => {
    if (lineItemIds.includes(item.id) && item.status === "ACTIVE") {
      item.status = "CANCELLED";
      item.cancelledAt = now;
      item.cancellationReason = reason;
      item.cancelledBy = cancelledBy;
      item.updatedAt = now;
      itemsCancelled++;
    }
  });
  
  // Update booking status based on remaining active items
  const activeItems = booking.lineItems.filter(item => item.status === "ACTIVE");
  if (activeItems.length === 0) {
    booking.status = "FULLY_CANCELLED";
  } else if (itemsCancelled > 0) {
    booking.status = "PARTIALLY_CANCELLED";
  }
  
  booking.updatedAt = now;
  
  console.log(`[bookings] Cancelled ${itemsCancelled} line items in booking ${bookingId}`);
  return itemsCancelled > 0;
}

// Update line item status (for cancellation service)
export async function updateLineItemStatus(
  bookingId: string,
  lineItemId: string,
  status: "ACTIVE" | "CANCELLED" | "PENDING_CANCELLATION",
  metadata?: {
    cancelledAt?: string;
    cancellationReason?: string;
    cancelledBy?: string;
  }
): Promise<boolean> {
  const booking = await getBookingById(bookingId);
  if (!booking) return false;
  
  const lineItem = booking.lineItems.find(item => item.id === lineItemId);
  if (!lineItem) return false;
  
  // Update line item
  lineItem.status = status;
  lineItem.updatedAt = new Date().toISOString();
  
  if (metadata) {
    if (metadata.cancelledAt) lineItem.cancelledAt = metadata.cancelledAt;
    if (metadata.cancellationReason) lineItem.cancellationReason = metadata.cancellationReason;
    if (metadata.cancelledBy) lineItem.cancelledBy = metadata.cancelledBy;
  }
  
  // Update booking status
  const activeItems = booking.lineItems.filter(item => item.status === "ACTIVE");
  const cancelledItems = booking.lineItems.filter(item => item.status === "CANCELLED");
  
  if (activeItems.length === 0 && cancelledItems.length > 0) {
    booking.status = "FULLY_CANCELLED";
  } else if (cancelledItems.length > 0) {
    booking.status = "PARTIALLY_CANCELLED";
  }
  
  booking.updatedAt = new Date().toISOString();
  
  console.log(`[bookings] Updated line item ${lineItemId} status to ${status}`);
  return true;
}

// Get booking summaries (lighter weight for lists)
export async function getBookingSummaries(
  filters: BookingFilters = {},
  page = 1,
  pageSize = 50
): Promise<{ summaries: BookingSummary[], totalCount: number }> {
  
  const { bookings: fullBookings, totalCount } = await listBookings(filters, page, pageSize);
  
  const summaries: BookingSummary[] = fullBookings.map(booking => ({
    id: booking.id,
    externalTransactionNumber: booking.externalTransactionNumber,
    status: booking.status,
    bookingDate: booking.bookingDate,
    totalCashAmount: booking.totalCashAmount,
    totalPointsRedeemed: booking.totalPointsRedeemed,
    lineItemCount: booking.lineItems.length,
    lobTypes: [...new Set(booking.lineItems.map(item => item.lob))] as LineOfBusiness[]
  }));
  
  return { summaries, totalCount };
}

// Development/testing helpers
export function clearAllBookings(): void {
  bookings = [];
  console.log('[bookings] Cleared all bookings (dev mode)');
}

export function getAllBookings(): TripBooking[] {
  return [...bookings]; // Return copy to prevent external mutation
}

export function getBookingCount(): number {
  return bookings.length;
}