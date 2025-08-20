// client/src/utils/loyaltyTransactions.ts

/**
 * --------------------------
 *  ACCRUAL — Stay (UI subset)
 * --------------------------
 */
export type AccrualStayRequest = {
  ExternalTransactionNumber: string;        // booking/order id (idempotency)
  ActivityDate: string;                     // ISO datetime
  CurrencyIsoCode: string;                  // "USD"
  TransactionAmount: number;                // total cash

  // Details
  MemberId?: string;
  Channel?: string;                         // "Web"

  // Payment details
  Payment_Type__c?: string;                 // "Cash"
  PaymentMethod?: string;                   // "Delta Card"
  Cash_Paid__c?: number;                    // total - taxes
  Total_Package_Amount__c?: number;         // total
  Booking_Tax__c?: number;                  // taxes

  // Booking details
  LOB__c?: string;                          // "Hotel"
  POSa__c?: string;                         // "US"
  Destination_Country__c?: string;          // "US"
  Destination_City__c?: string;             // "ATL"
  Trip_Start_Date__c?: string;              // YYYY-MM-DD
  Trip_End_Date__c?: string;                // YYYY-MM-DD
  BookingDate?: string;                     // YYYY-MM-DD
  Length_of_Booking__c?: number;

  // convenience mirror
  External_ID__c?: string;
};

export async function postStayAccrual(payload: AccrualStayRequest) {
  const res = await fetch("/api/loyalty/journals/accrual-stay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.errors?.[0]?.message || "Failed to post accrual");
  }
  return res.json();
}

export function buildAccrualFromCheckout(opts: {
  bookingId: string;
  currency: string;
  total: number;
  taxes: number;
  nights: number;
  checkInISO: string;        // YYYY-MM-DD or full ISO
  checkOutISO: string;       // YYYY-MM-DD or full ISO
  city: string;
  posa?: string;
  memberId?: string;
  channel?: string;
  paymentMethod?: string;
  paymentType?: string;
  destinationCountry?: string;
  bookingDate?: string;      // YYYY-MM-DD
}): AccrualStayRequest {
  const cashPaid = +(opts.total - opts.taxes).toFixed(2);

  return {
    ExternalTransactionNumber: opts.bookingId,
    ActivityDate: new Date().toISOString(),
    CurrencyIsoCode: opts.currency,
    TransactionAmount: opts.total,

    MemberId: opts.memberId,
    Channel: opts.channel ?? "Web",

    Payment_Type__c: opts.paymentType ?? "Cash",
    PaymentMethod: opts.paymentMethod ?? "Delta Card",
    Cash_Paid__c: cashPaid,
    Total_Package_Amount__c: opts.total,
    Booking_Tax__c: opts.taxes,

    LOB__c: "Hotel",
    POSa__c: opts.posa,
    Destination_Country__c: opts.destinationCountry,
    Destination_City__c: opts.city,
    Trip_Start_Date__c: opts.checkInISO.slice(0, 10),
    Trip_End_Date__c: opts.checkOutISO.slice(0, 10),
    BookingDate: opts.bookingDate ?? new Date().toISOString().slice(0, 10),
    Length_of_Booking__c: opts.nights,

    External_ID__c: opts.bookingId,
  };
}

/**
 * ----------------------------
 *  REDEMPTION — Stay (stubs)
 * ----------------------------
 * Minimal, UI-friendly subset for “Use miles/points”.
 * Server will force JournalType=Redemption, Subtype=Stay.
 */
export type RedemptionStayRequest = {
  ExternalTransactionNumber: string;        // idempotency
  ActivityDate: string;                     // ISO datetime
  MemberId?: string;

  // How many points to redeem (custom field in your schema)
  Points_to_Redeem__c: number;

  // Optional booking context (mirrors accrual shape if useful)
  LOB__c?: string;                          // "Hotel"
  POSa__c?: string;                         // "US"
  Destination_Country__c?: string;          // "US"
  Destination_City__c?: string;             // "ATL"
  Trip_Start_Date__c?: string;              // YYYY-MM-DD
  Trip_End_Date__c?: string;                // YYYY-MM-DD
  BookingDate?: string;                     // YYYY-MM-DD
  Length_of_Booking__c?: number;

  // Optional note
  Comment?: string;

  // convenience mirror
  External_ID__c?: string;
};

export async function postStayRedemption(payload: RedemptionStayRequest) {
  const res = await fetch("/api/loyalty/journals/redemption-stay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.errors?.[0]?.message || "Failed to post redemption");
  }
  return res.json();
}

export function buildRedemptionFromCheckout(opts: {
  bookingId: string;
  points: number;              // user-entered points to redeem
  nights?: number;
  checkInISO?: string;
  checkOutISO?: string;
  city?: string;
  posa?: string;
  memberId?: string;
  destinationCountry?: string;
  bookingDate?: string;
  comment?: string;
}): RedemptionStayRequest {
  return {
    ExternalTransactionNumber: opts.bookingId,
    ActivityDate: new Date().toISOString(),
    MemberId: opts.memberId,

    Points_to_Redeem__c: opts.points,

    LOB__c: "Hotel",
    POSa__c: opts.posa,
    Destination_Country__c: opts.destinationCountry,
    Destination_City__c: opts.city,
    Trip_Start_Date__c: opts.checkInISO?.slice(0, 10),
    Trip_End_Date__c: opts.checkOutISO?.slice(0, 10),
    BookingDate: opts.bookingDate ?? new Date().toISOString().slice(0, 10),
    Length_of_Booking__c: opts.nights,

    Comment: opts.comment,
    External_ID__c: opts.bookingId,
  };
}

/**
 * (Optional) helper: fetch journal status by ExternalTransactionNumber for your Confirmation page.
 * Requires a server route: GET /api/loyalty/journals/by-external/:externalId
 */
export async function getJournalByExternalId(externalId: string) {
  const res = await fetch(`/api/loyalty/journals/by-external/${encodeURIComponent(externalId)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to fetch journal");
  }
  return res.json(); // expect { journalId, status, ... }
}

