// server/src/salesforce/journals.ts
// ----------------------------------------------------------------------------
// Post Transaction Journals to Salesforce Loyalty (Realtime endpoint)
// Uses getClientCredentialsToken() from auth.ts to manage OAuth tokens
// ----------------------------------------------------------------------------

import { getClientCredentialsToken } from "./auth";

const DEFAULT_MEMBERSHIP_NUMBER = process.env.DEFAULT_MEMBERSHIP_NUMBER || "DL12345";
const DEFAULT_SUBTYPE_ACCRUAL = process.env.SF_JOURNAL_SUBTYPE_NAME || "Hotel";
const DEFAULT_SUBTYPE_REDEMPTION = process.env.SF_JOURNAL_SUBTYPE_REDEMPTION || "Redeem Points";
const DEFAULT_TYPE_ACCRUAL = process.env.SF_JOURNAL_TYPE_NAME_ACCRUAL || "Accrual";
const DEFAULT_TYPE_REDEMPTION = process.env.SF_JOURNAL_TYPE_NAME_REDEMPTION || "Redemption";

// Fields that should always be strings for compatibility
const STRINGIFY_FIELDS = ["Cash_Paid__c", "Length_of_Booking__c", "Length_of_Stay__c", "Points_to_Redeem__c", "MileBalance__c", "MQDBalance__c", "TransactionAmount"];

export type BaseStayJournal = {
  ExternalTransactionNumber: string;
  MemberId?: string;
  ActivityDate: string;
  CurrencyIsoCode: string;
  TransactionAmount?: number;
  Channel?: string;
  PaymentMethod?: string;
  Payment_Type__c?: string;
  Cash_Paid__c?: string;
  Total_Package_Amount__c?: number;
  Booking_Tax__c?: number;
  BookingDate?: string;
  StartDate?: string;
  EndDate?: string;
  Length_of_Booking__c?: string;
  Length_of_Stay__c?: string;
  Destination_Country__c?: string;
  Destination_City__c?: string;
  LOB__c?: string;
  POSa__c?: string;
  Hotel_Superbrand__c?: string;
  Comment?: string;
  External_ID__c?: string;
  [key: string]: unknown;
};

export type AccrualStayJournal = BaseStayJournal & {
  journalTypeName?: "Accrual" | string;
  journalSubTypeName?: string;
  TransactionAmount: number;
  MembershipNumber?: string;
};

export type RedemptionStayJournal = BaseStayJournal & {
  journalTypeName?: "Redemption" | string;
  journalSubTypeName?: string;
  Points_to_Redeem__c: number;
  MembershipNumber?: string;
};

export type JournalExecutionResult =
  | { ok: true; status: number; body: any }
  | { ok: false; status: number; body: any };

async function postRealtimeJournals(
  journals: any[],
  opts?: { isSimulation?: boolean; programName?: string; apiVersion?: string }
): Promise<JournalExecutionResult> {
  const { access_token, instance_url } = await getClientCredentialsToken();

  const apiVersion = opts?.apiVersion || process.env.SF_API_VERSION || "v64.0";
  const programName = opts?.programName || process.env.SF_LOYALTY_PROGRAM;

  if (!programName) {
    return {
      ok: false,
      status: 400,
      body: { message: "Missing SF_LOYALTY_PROGRAM env var" },
    };
  }

  const url = `${instance_url}/services/data/${apiVersion}/connect/realtime/loyalty/programs/${encodeURIComponent(programName)}`;

  const normalized = journals.map((j) => {
    const out: any = { ...j };
    out.JournalTypeName = out.JournalTypeName || out.journalTypeName || DEFAULT_TYPE_ACCRUAL;
    out.JournalSubTypeName = out.JournalSubTypeName || DEFAULT_SUBTYPE_ACCRUAL;
    delete out.journalTypeName;
    delete out.journalSubTypeName;
    STRINGIFY_FIELDS.forEach((f) => {
      if (out[f] != null && typeof out[f] !== "string") out[f] = String(out[f]);
    });
    return out;
  });

  const payload = {
    transactionJournals: normalized,
    runSetting: { isSimulation: !!opts?.isSimulation },
  };

  console.log("POST journals →", JSON.stringify(payload, null, 2));

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
  } catch {}

  if (!res.ok) return { ok: false, status: res.status, body: json };
  return { ok: true, status: res.status, body: json };
}

export async function executeAccrualStayJournal(
  body: AccrualStayJournal
): Promise<JournalExecutionResult> {
  const membershipNumber = body.MembershipNumber || DEFAULT_MEMBERSHIP_NUMBER;
  const base: AccrualStayJournal = {
    ...body,
    External_ID__c: body.External_ID__c ?? body.ExternalTransactionNumber,
    ActivityDate: body.ActivityDate || new Date().toISOString(),
    MembershipNumber: membershipNumber,
  };

  const journal: any = {
    ...base,
    JournalTypeName: (base as any).JournalTypeName || (base as any).journalTypeName || DEFAULT_TYPE_ACCRUAL,
    JournalSubTypeName: (base as any).JournalSubTypeName || DEFAULT_SUBTYPE_ACCRUAL,
  };
  delete journal.journalTypeName;
  delete journal.journalSubTypeName;
  STRINGIFY_FIELDS.forEach((f) => {
    if (journal[f] != null && typeof journal[f] !== "string") journal[f] = String(journal[f]);
  });

  return postRealtimeJournals([journal], { isSimulation: false });
}

export async function executeRedemptionStayJournal(
  body: RedemptionStayJournal
): Promise<JournalExecutionResult> {
  const membershipNumber = body.MembershipNumber || DEFAULT_MEMBERSHIP_NUMBER;
  const base: RedemptionStayJournal = {
    ...body,
    External_ID__c: body.External_ID__c ?? body.ExternalTransactionNumber,
    ActivityDate: body.ActivityDate || new Date().toISOString(),
    MembershipNumber: membershipNumber,
  };

  const journal: any = {
    ...base,
    JournalTypeName: (base as any).JournalTypeName || (base as any).journalTypeName || DEFAULT_TYPE_REDEMPTION,
    JournalSubTypeName: (base as any).JournalSubTypeName || DEFAULT_SUBTYPE_REDEMPTION,
  };
  delete journal.journalTypeName;
  delete journal.journalSubTypeName;
  STRINGIFY_FIELDS.forEach((f) => {
    if (journal[f] != null && typeof journal[f] !== "string") journal[f] = String(journal[f]);
  });

  return postRealtimeJournals([journal], { isSimulation: false });
}

export function buildAccrualFromCheckout(input: {
  externalId: string;
  currency: string;
  total: number;
  taxes?: number;
  startDateISO?: string;
  endDateISO?: string;
  nights?: number;
  city?: string;
  posa?: string;
  memberId?: string;
  membershipNumber?: string;
  channel?: string;
  paymentMethod?: string;
  paymentType?: string;
  destCountry?: string;
  bookingDate?: string;
  comment?: string;
}): AccrualStayJournal {
  const cashPaid =
    typeof input.taxes === "number" ? +(input.total - input.taxes).toFixed(2) : undefined;

  return {
    ExternalTransactionNumber: input.externalId,
    External_ID__c: input.externalId,
    ActivityDate: new Date().toISOString(),
    CurrencyIsoCode: input.currency,
    TransactionAmount: input.total,
    MemberId: input.memberId,
    MembershipNumber: input.membershipNumber || DEFAULT_MEMBERSHIP_NUMBER,
    Channel: input.channel ?? "Web",
    PaymentMethod: input.paymentMethod,
    Payment_Type__c: input.paymentType ?? "Cash",
    Cash_Paid__c: cashPaid != null ? String(cashPaid) : undefined,
    Total_Package_Amount__c: input.total,
    Booking_Tax__c: input.taxes,
    LOB__c: "Hotel",
    POSa__c: input.posa,
    Destination_City__c: input.city,
    Destination_Country__c: input.destCountry,
    StartDate: input.startDateISO,
    EndDate: input.endDateISO,
    Length_of_Booking__c: input.nights != null ? String(input.nights) : undefined,
    Length_of_Stay__c: input.nights != null ? String(input.nights) : undefined,
    BookingDate: input.bookingDate ?? new Date().toISOString().slice(0, 10),
    Comment: input.comment,
    journalTypeName: DEFAULT_TYPE_ACCRUAL,
    journalSubTypeName: DEFAULT_SUBTYPE_ACCRUAL,
  };
}