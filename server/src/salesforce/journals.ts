// server/src/salesforce/journals.ts
// ----------------------------------------------------------------------------
// Posts Transaction Journals to Salesforce Loyalty "Journal Execution" endpoint
// Uses getClientCredentialsToken() from auth.ts to manage OAuth tokens
// ----------------------------------------------------------------------------

import { getClientCredentialsToken } from "./auth";

/**
 * Shape for Accrual / Stay journals, matching Transaction Journal schema fields.
 */
export type AccrualStayJournal = {
  // Identity / control
  ExternalTransactionNumber: string; // idempotency key
  MemberId?: string;
  LoyaltyProgramId?: string;

  // Journal type/subtype (Accrual / Stay enforced by caller)
  JournalTypeId: string;
  JournalSubTypeId: string;

  // Core dates & amounts
  ActivityDate: string;              // ISO datetime
  CurrencyIsoCode: string;           // e.g. "USD"
  TransactionAmount: number;         // e.g. 500.00

  // Booking / hotel details
  Channel?: string;
  PaymentMethod?: string;
  Payment_Type__c?: string;
  Cash_Paid__c?: number;
  Total_Package_Amount__c?: number;
  Booking_Tax__c?: number;

  BookingDate?: string;              // YYYY-MM-DD
  StartDate?: string;                // ISO datetime
  EndDate?: string;                  // ISO datetime
  Length_of_Booking__c?: number;
  Length_of_Stay__c?: number;

  Destination_Country__c?: string;
  Destination_City__c?: string;
  LOB__c?: string;
  POSa__c?: string;
  Hotel_Superbrand__c?: string;

  Comment?: string;
  External_ID__c?: string;

  // Catch-all for any other fields in your schema
  [key: string]: unknown;
};

export type JournalExecutionResult =
  | { ok: true; status: number; body: any }
  | { ok: false; status: number; body: any };

/**
 * Execute an Accrual / Stay journal by calling the Salesforce Connect endpoint.
 * Automatically handles OAuth via getClientCredentialsToken().
 */
export async function executeAccrualStayJournal(
  body: AccrualStayJournal
): Promise<JournalExecutionResult> {
  const { access_token, instance_url } = await getClientCredentialsToken();

  const apiVersion = process.env.SF_API_VERSION || "v64.0";
  const programName = process.env.SF_LOYALTY_PROGRAM!;
  const url = `${instance_url}/services/data/${apiVersion}/connect/loyalty/programs/${encodeURIComponent(
    programName
  )}/journal-execution`;

  const payload = {
    ...body,
    External_ID__c: body.External_ID__c ?? body.ExternalTransactionNumber,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    // non-JSON response
  }

  if (!res.ok) {
    return { ok: false, status: res.status, body: json };
  }
  return { ok: true, status: res.status, body: json };
}

/**
 * Optional builder: construct a journal body from typical checkout fields.
 */
export function buildStayJournalBody(
  input: {
    externalId: string;
    memberId?: string;
    accrualAmount: number;
    currency: string;
    activityDateISO?: string;

    channel?: string;
    paymentMethod?: string;
    paymentType?: string;
    cashPaid?: number;
    packageTotal?: number;
    bookingTax?: number;

    bookingDate?: string;
    startDateISO?: string;
    endDateISO?: string;
    lengthOfBooking?: number;
    lengthOfStay?: number;

    destCountry?: string;
    destCity?: string;
    lob?: string;
    posa?: string;
    superbrand?: string;

    comment?: string;
  },
  cfg: {
    journalTypeAccrualId: string;
    journalSubTypeStayId: string;
  }
): AccrualStayJournal {
  return {
    ExternalTransactionNumber: input.externalId,
    MemberId: input.memberId,
    JournalTypeId: cfg.journalTypeAccrualId,
    JournalSubTypeId: cfg.journalSubTypeStayId,

    ActivityDate: input.activityDateISO ?? new Date().toISOString(),
    CurrencyIsoCode: input.currency,
    TransactionAmount: input.accrualAmount,

    Channel: input.channel,
    PaymentMethod: input.paymentMethod,
    Payment_Type__c: input.paymentType,
    Cash_Paid__c: input.cashPaid,
    Total_Package_Amount__c: input.packageTotal,
    Booking_Tax__c: input.bookingTax,

    BookingDate: input.bookingDate,
    StartDate: input.startDateISO,
    EndDate: input.endDateISO,
    Length_of_Booking__c: input.lengthOfBooking,
    Length_of_Stay__c: input.lengthOfStay,

    Destination_Country__c: input.destCountry,
    Destination_City__c: input.destCity,
    LOB__c: input.lob,
    POSa__c: input.posa,
    Hotel_Superbrand__c: input.superbrand,

    Comment: input.comment,
    External_ID__c: input.externalId,
  };
}
