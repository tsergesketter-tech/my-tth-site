// shared/loyaltyTypes.ts

// --- ACCRUAL — Stay (UI + server payload shape) ---
export type AccrualStayRequest = {
  ExternalTransactionNumber: string;
  ActivityDate: string;
  CurrencyIsoCode: string;
  TransactionAmount: number;

  MemberId?: string;
  Channel?: string;

  Payment_Type__c?: string;
  PaymentMethod?: string;
  Cash_Paid__c?: number;
  Total_Package_Amount__c?: number;
  Booking_Tax__c?: number;

  LOB__c?: string;
  POSa__c?: string;
  Destination_Country__c?: string;
  Destination_City__c?: string;
  Trip_Start_Date__c?: string;
  Trip_End_Date__c?: string;
  BookingDate?: string;
  Length_of_Booking__c?: number;

  External_ID__c?: string;
};

// --- REDEMPTION — Stay (UI + server payload shape) ---
export type RedemptionStayRequest = {
  ExternalTransactionNumber: string;
  ActivityDate: string;
  CurrencyIsoCode?: string;
  MemberId?: string;

  Points_to_Redeem__c: number;

  LOB__c?: string;
  POSa__c?: string;
  Destination_Country__c?: string;
  Destination_City__c?: string;
  Trip_Start_Date__c?: string;
  Trip_End_Date__c?: string;
  BookingDate?: string;
  Length_of_Booking__c?: number;

  Comment?: string;
  External_ID__c?: string;
};

// --- VOUCHERS — Response types for Salesforce Connect API ---
export type SalesforceVoucher = {
  voucherId: string;
  voucherCode: string;
  voucherType: string;
  voucherValue?: number;
  currencyIsoCode?: string;
  expirationDate: string;
  status: string;
  description?: string;
  issuedDate?: string;
  lastModifiedDate?: string;
  loyaltyProgramId?: string;
  memberId?: string;
};

export type VouchersListResponse = {
  vouchers: SalesforceVoucher[];
  totalCount?: number;
  hasMore?: boolean;
  nextPageUrl?: string;
};
