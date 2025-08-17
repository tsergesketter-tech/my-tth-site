// client/src/utils/loyaltySim.ts
export type StayForSim = {
  stayId: string;
  propertyName: string;
  city?: string;
  checkInISO: string;   // yyyy-mm-dd
  checkOutISO: string;  // yyyy-mm-dd
  nightlyRate: number;
  currency: string;     // e.g., "USD"
  nights: number;
  brand?: string;
  ratePlan?: string;
  promoCode?: string;
};

export type SimResult = {
  index: number;
  byCurrency: Record<string, number>;
  errorMessage?: string | null;
  processName?: string | null;
};

export async function simulatePoints(opts: {
  program: string;
  membershipNumber: string;   // keep required; server will map to MemberId
  stays: StayForSim[];
}) {
  const toDateTime = (isoDate: string, time = "T00:00:00.000Z") =>
    `${isoDate}${time}`;

  const journals = opts.stays.map((s) => ({
    // Required/commonly used standard fields
    ActivityDate: toDateTime(s.checkInISO),          // datetime
    StartDate: toDateTime(s.checkInISO, "T15:00:00.000Z"), // optional, but useful for stays
    EndDate: toDateTime(s.checkOutISO, "T11:00:00.000Z"),
    Status: "Pending",
    CurrencyIsoCode: s.currency,
    TransactionAmount: (s.nightlyRate * s.nights).toFixed(2), // ← string, 2 decimals
    Cash_Paid__c: (s.nightlyRate * s.nights).toFixed(2), // ← string, 2 decimals
    Booking_Tax__c: "15.00",
    Payment_Type__c: "Cash",
    Establishment: s.propertyName,
    MembershipNumber: opts.membershipNumber,                  // hotel/location
    TransactionLocation: s.city,
    Quantity: String(s.nights),                               // ← string                               // length of stay
    Brand: s.brand,

    // If your org accepts names for type/subtype via Connect, keep these:
    JournalTypeName: "Accrual",
    JournalSubTypeName: "Hotel",

    // Use a standard field for correlation (not custom)
    ExternalTransactionNumber: s.stayId,

    // Optional drivers if your rules use them:
    RatePlan: s.ratePlan,
    PromoCode: s.promoCode,
  }));

  const res = await fetch("/api/loyalty/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      program: opts.program,
      membershipNumber: opts.membershipNumber, // top-level for server to resolve MemberId
      transactionJournals: journals,          // (server will accept `journals` too; see below)
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Simulation failed");
  return json as { results: SimResult[]; notLinked?: boolean };
}

