// client/src/utils/bookingApi.ts
// API utilities for booking management and cancellation workflow

import type { 
  TripBooking, 
  CancellationRequest,
  CancellationPlan,
  CancellationResult
} from "../../../shared/bookingTypes";

const API_BASE = "/api/bookings";

/**
 * Fetch all bookings for the current user
 */
export async function fetchUserBookings(): Promise<TripBooking[]> {
  // Get current member from session
  const membershipNumber = "DL12345"; // For now, use the hardcoded member number
  
  const response = await fetch(`${API_BASE}/?membershipNumber=${encodeURIComponent(membershipNumber)}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to fetch bookings");
  }

  const data = await response.json();
  return data.bookings || [];
}

/**
 * Fetch a specific booking by ID
 */
export async function fetchBooking(bookingId: string): Promise<TripBooking> {
  const response = await fetch(`${API_BASE}/${bookingId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to fetch booking");
  }

  const data = await response.json();
  return data.booking;
}

/**
 * Fetch booking by external transaction number (used in checkout flow)
 */
export async function fetchBookingByExternalId(externalTransactionNumber: string): Promise<TripBooking> {
  const response = await fetch(`${API_BASE}/external/${externalTransactionNumber}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to fetch booking");
  }

  const data = await response.json();
  return data.booking;
}

/**
 * Preview cancellation plan (no execution)
 */
export async function previewCancellation(
  bookingId: string,
  request: Omit<CancellationRequest, 'bookingId'>
): Promise<{ plan: CancellationPlan; summary: any }> {
  const response = await fetch(`${API_BASE}/${bookingId}/cancellation/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to preview cancellation");
  }

  return response.json();
}

/**
 * Execute cancellation workflow
 */
export async function executeCancellation(
  bookingId: string,
  request: Omit<CancellationRequest, 'bookingId'> & { confirm: boolean }
): Promise<{ result: CancellationResult; booking: TripBooking; summary: any }> {
  const response = await fetch(`${API_BASE}/${bookingId}/cancellation/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to execute cancellation");
  }

  return response.json();
}

/**
 * Helper function to get upcoming bookings (active bookings with future dates)
 */
export function getUpcomingBookings(bookings: TripBooking[]): TripBooking[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today for date comparison
  
  return bookings.filter(booking => {
    // Only show active or partially cancelled bookings
    if (!["ACTIVE", "PARTIALLY_CANCELLED"].includes(booking.status)) {
      return false;
    }

    // If booking has no line items, check trip start date
    if (booking.lineItems.length === 0) {
      if (booking.tripStartDate) {
        const tripStart = new Date(booking.tripStartDate);
        tripStart.setHours(0, 0, 0, 0);
        return tripStart >= today; // Include today's bookings
      }
      return true; // Include if no date specified
    }

    // Check if any line item has a future or current start date
    return booking.lineItems.some(item => {
      if (!item.startDate) return true; // Include if no date specified
      const startDate = new Date(item.startDate);
      startDate.setHours(0, 0, 0, 0);
      return startDate >= today; // Include today's bookings
    });
  });
}

/**
 * Helper function to get booking status display
 */
export function getBookingStatusDisplay(booking: TripBooking): {
  status: string;
  color: string;
  canCancel: boolean;
} {
  const activeItems = booking.lineItems.filter(item => item.status === "ACTIVE");
  const cancelledItems = booking.lineItems.filter(item => item.status === "CANCELLED");

  switch (booking.status) {
    case "ACTIVE":
      return {
        status: "Active",
        color: "bg-green-100 text-green-800",
        canCancel: true
      };
    case "PARTIALLY_CANCELLED":
      return {
        status: `${cancelledItems.length} of ${booking.lineItems.length} cancelled`,
        color: "bg-yellow-100 text-yellow-800",
        canCancel: activeItems.length > 0
      };
    case "FULLY_CANCELLED":
      return {
        status: "Fully Cancelled",
        color: "bg-gray-100 text-gray-600",
        canCancel: false
      };
    default:
      return {
        status: booking.status,
        color: "bg-blue-100 text-blue-800",
        canCancel: false
      };
  }
}

/**
 * Helper function to calculate booking totals
 */
export function calculateBookingTotals(booking: TripBooking) {
  const activeItems = booking.lineItems.filter(item => item.status === "ACTIVE");
  
  const totalCash = activeItems.reduce((sum, item) => sum + (item.cashAmount || 0), 0);
  const totalPoints = activeItems.reduce((sum, item) => sum + (item.pointsRedeemed || 0), 0);
  const totalTaxesAndFees = activeItems.reduce((sum, item) => 
    sum + (item.taxes || 0) + (item.fees || 0), 0
  );

  return {
    totalCash: totalCash.toFixed(2),
    totalPoints: totalPoints.toLocaleString(),
    totalTaxesAndFees: totalTaxesAndFees.toFixed(2),
    grandTotal: (totalCash + totalTaxesAndFees).toFixed(2)
  };
}