// shared/bookingTypes.ts
// Top-level booking entity for managing trip bookings with multiple LOBs and payment methods

export type BookingState = "ACTIVE" | "PARTIALLY_CANCELLED" | "FULLY_CANCELLED" | "PENDING_CANCELLATION";
export type LineOfBusiness = "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE";
export type LineItemStatus = "ACTIVE" | "CANCELLED" | "CANCELLING" | "PENDING_CANCELLATION";

export type BookingLineItem = {
  id: string;
  lob: LineOfBusiness;
  
  // Payment breakdown for this line item
  cashAmount?: number;
  pointsRedeemed?: number;
  pointsEarned?: number;
  currency?: string;
  
  // Taxes and fees for this specific line item
  taxes?: number;
  fees?: number;
  
  // Product-specific details
  productName?: string; // Hotel name, airline, car rental company
  productCode?: string; // Hotel code, flight number, car class
  
  // Dates specific to this line item
  startDate?: string;
  endDate?: string;
  nights?: number; // For hotels
  
  // Location for this line item
  destinationCity?: string;
  destinationCountry?: string;
  
  // Salesforce journal tracking
  redemptionJournalId?: string;  // Salesforce TransactionJournal ID for redemption
  accrualJournalId?: string;     // Salesforce TransactionJournal ID for accrual
  
  // Cancellation tracking
  status: LineItemStatus;
  cancelledAt?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
};

export type TripBooking = {
  // Primary identifiers
  id: string; // Our internal booking ID (UUID)
  externalTransactionNumber: string; // Current field used in journals
  
  // Member information
  memberId?: string;
  membershipNumber?: string;
  
  // Booking metadata
  bookingDate: string; // ISO date when booking was created
  tripStartDate?: string; // Overall trip start
  tripEndDate?: string; // Overall trip end
  
  // Business details
  channel?: string; // Web, Mobile, Agent, etc.
  posa?: string; // Point of sale agency
  paymentMethod?: string;
  
  // Line items (flight, hotel, car, packages)
  lineItems: BookingLineItem[];
  
  // Overall booking state
  status: BookingState;
  
  // Computed totals (derived from line items)
  totalCashAmount: number;
  totalTaxesAndFees: number;
  totalPointsRedeemed: number;
  totalPointsEarned: number; // From accruals (computed after journals are processed)
  
  // Audit trail
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  
  // Optional metadata
  notes?: string;
  internalReference?: string;
};

// Request types for creating bookings
export type CreateBookingRequest = {
  externalTransactionNumber: string;
  memberId?: string;
  membershipNumber?: string;
  
  bookingDate?: string; // Defaults to now
  tripStartDate?: string;
  tripEndDate?: string;
  
  channel?: string;
  posa?: string;
  paymentMethod?: string;
  
  lineItems: Omit<BookingLineItem, 'id' | 'status' | 'createdAt' | 'updatedAt'>[];
  
  notes?: string;
  createdBy?: string;
};

export type UpdateBookingRequest = Partial<CreateBookingRequest> & {
  id: string;
};

// Response types
export type BookingResponse = TripBooking & {
  _meta?: {
    journalsPosted?: boolean;
    lastSyncedAt?: string;
    salesforceBookingId?: string; // When we add SF custom object
  };
};

export type BookingListResponse = {
  bookings: BookingResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

// Cancellation types
export type CancellationRequest = {
  bookingId: string;
  lineItemIds?: string[]; // If partial cancellation, specify which LOBs
  reason?: string;
  requestedBy?: string;
};

export type CancellationStepType = "REDEMPTION_REFUND" | "ACCRUAL_CANCEL";
export type CancellationStepStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type CancellationStep = {
  type: CancellationStepType;
  lineItemId: string;
  lob: LineOfBusiness;
  journalId: string; // Salesforce TransactionJournal ID
  amount: number; // Points for redemption, cash amount for accrual
  currency?: string;
  
  // Execution tracking
  status: CancellationStepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  
  // Salesforce response
  salesforceResponse?: any;
  cancellationId?: string; // SF cancellation ID if provided
};

export type CancellationPlan = {
  bookingId: string;
  lineItemIds: string[];
  reason?: string;
  requestedBy?: string;
  
  steps: CancellationStep[];
  
  // Projected totals
  totalPointsToRefund: number;
  totalPointsToCancel: number; // From accruals  
  netPointsChange: number; // totalPointsToRefund - totalPointsToCancel
  totalCashRefund: number;
  
  createdAt: string;
};

export type CancellationResult = {
  plan: CancellationPlan;
  steps: CancellationStep[];
  success: boolean;
  completedAt: string;
  
  // Actual results
  actualPointsRefunded: number;
  actualPointsCancelled: number;
  actualCashRefund: number;
  
  errors?: string[];
  partialSuccess: boolean; // true if some steps succeeded but others failed
};

// Helper types for working with bookings
export type BookingFilters = {
  membershipNumber?: string;
  memberId?: string;
  status?: BookingState;
  dateFrom?: string;
  dateTo?: string;
  lob?: LineOfBusiness;
  externalTransactionNumber?: string;
};

export type BookingSummary = {
  id: string;
  externalTransactionNumber: string;
  status: BookingState;
  bookingDate: string;
  totalCashAmount: number;
  totalPointsRedeemed: number;
  lineItemCount: number;
  lobTypes: LineOfBusiness[];
};