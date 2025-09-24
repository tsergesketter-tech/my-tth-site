// routes/loyalty.ts
import { Router, Request } from 'express';
import { sfFetch } from '../salesforce/sfFetch';
import { executeAccrualStayJournal, executeRedemptionStayJournal, AccrualStayJournal } from "../salesforce/journals";
import { createBooking, getBookingByExternalTransactionNumber, updateLineItemJournalIds, updateLineItemPointsRedeemed } from "../data/bookings";
import { linkJournalToBookingLineItem } from "../salesforce/journalBookingLink";
import type { CreateBookingRequest, BookingLineItem } from "@teddy/shared";
import type { AccrualStayRequest, RedemptionStayRequest } from "@teddy/shared";

// Add this augmentation to fix the session property error
declare module 'express-serve-static-core' {
  interface Request {
    session?: {
      member?: {
        membershipNumber?: string;
        memberId?: string;
        program?: string;
      };
      [key: string]: any;
    };
  }
}



const router = Router();


console.log("[loyalty] router loaded");
router.use((req, _res, next) => {
  console.log(`[loyalty] ${req.method} ${req.path}`);
  next();
});

router.get("/__ping", (_req, res) => {
  res.json({ ok: true, at: "/api/loyalty/__ping" });
});

// POST /api/loyalty/eligible-promotions - Get eligible promotions for cart
router.post("/eligible-promotions", async (req, res) => {
  try {
    const cartRequest = req.body;
    console.log(`[loyalty/eligible-promotions] POST - cart details:`, JSON.stringify(cartRequest, null, 2));

    // Log the specific product codes being sent
    const cartDetails = cartRequest?.cart?.cartDetails?.[0];
    if (cartDetails?.cartLineDetails?.[0]) {
      const lineItem = cartDetails.cartLineDetails[0];
      console.log(`[loyalty/eligible-promotions] Product codes - Code: ${lineItem.cartLineProductCode}, SKU: ${lineItem.cartLineProductStockKeepingUnit}, Product: ${lineItem.cartLineProduct}`);
    }

    if (!cartRequest?.cart?.cartDetails) {
      return res.status(400).json({
        error: "Invalid request format",
        details: "Expected cart.cartDetails in request body"
      });
    }

    // Call Salesforce Global Promotions Management API
    // Based on: https://developer.salesforce.com/docs/atlas.en-us.loyalty.meta/loyalty/connect_resources_eligible_promotions.htm
    const apiPath = `/services/data/v64.0/global-promotions-management/eligible-promotions`;

    console.log(`[loyalty/eligible-promotions] Calling Salesforce API: ${apiPath}`);

    const response = await sfFetch(apiPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cartRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[loyalty/eligible-promotions] Salesforce API failed ${response.status}:`, errorText);
      return res.status(response.status).json({
        error: "Failed to fetch eligible promotions",
        details: errorText,
        salesforceStatus: response.status
      });
    }

    const promotionsData = await response.json();
    console.log(`[loyalty/eligible-promotions] Salesforce response:`, JSON.stringify(promotionsData, null, 2));

    // Transform the response to include promotion calculations
    const transformedResponse = {
      ...promotionsData,
      _meta: {
        requestedAt: new Date().toISOString(),
        sourceApi: "salesforce-global-promotions",
        apiVersion: "v64.0"
      }
    };

    res.json(transformedResponse);

  } catch (error: any) {
    console.error(`[loyalty/eligible-promotions] Error:`, error);
    res.status(500).json({
      error: "Internal server error fetching eligible promotions",
      message: error.message
    });
  }
});

// GET /api/loyalty/member/:membershipNumber/vouchers - Fetch member vouchers from Salesforce
router.get("/member/:membershipNumber/vouchers", async (req, res) => {
  try {
    const { membershipNumber } = req.params;
    console.log(`[loyalty/vouchers] Fetching vouchers for member: ${membershipNumber}`);

    if (!membershipNumber) {
      return res.status(400).json({ error: "Member number is required" });
    }

    // Use the correct Salesforce Loyalty API pattern for vouchers
    const programName = "Cars and Stays by Delta";

    // Based on Salesforce Loyalty API documentation and user feedback
    const endpointAttempts = [
      `/services/data/v63.0/loyalty/programs/${encodeURIComponent(programName)}/members/${membershipNumber}/vouchers`,
      `/services/data/v60.0/loyalty/programs/${encodeURIComponent(programName)}/members/${membershipNumber}/vouchers`,
      `/services/data/v58.0/loyalty/programs/${encodeURIComponent(programName)}/members/${membershipNumber}/vouchers`,
      // Connect API patterns as fallback
      `/services/data/v63.0/connect/loyalty/programs/${encodeURIComponent(programName)}/members/${membershipNumber}/vouchers`,
      `/services/data/v60.0/connect/loyalty/programs/${encodeURIComponent(programName)}/members/${membershipNumber}/vouchers`,
      `/services/data/v58.0/connect/loyalty/programs/${encodeURIComponent(programName)}/members/${membershipNumber}/vouchers`
    ];

    let successfulResponse: Response | null = null;
    let lastError: string | undefined;
    
    for (const apiPath of endpointAttempts) {
      console.log(`[loyalty/vouchers] Trying SF API: ${apiPath}`);
      
      const response = await sfFetch(apiPath, {
        method: "GET",
      });
      
      if (response.ok) {
        console.log(`[loyalty/vouchers] Success with: ${apiPath}`);
        successfulResponse = response;
        break;
      } else {
        const errorText = await response.text();
        console.warn(`[loyalty/vouchers] Failed ${response.status} for: ${apiPath} - ${errorText}`);
        lastError = errorText;
      }
    }
    
    if (!successfulResponse) {
      console.error(`[loyalty/vouchers] All API endpoints failed. Last error:`, lastError);
      return res.status(404).json({ 
        error: "Vouchers endpoint not found - check Salesforce API configuration",
        details: lastError,
        attemptedEndpoints: endpointAttempts
      });
    }

    const data = await successfulResponse.json();
    
    // Transform Salesforce voucher data to match our UI format
    const transformedVouchers = data.vouchers?.map((sfVoucher: any) => ({
      id: sfVoucher.voucherId || sfVoucher.id,
      // Use voucherDefinition as the main type display, fallback to mapped type
      type: sfVoucher.voucherDefinition || mapVoucherType(sfVoucher.voucherType || sfVoucher.type),
      code: sfVoucher.voucherCode || sfVoucher.code,
      value: sfVoucher.remainingValue ?? sfVoucher.faceValue ?? sfVoucher.voucherValue,
      currency: sfVoucher.currencyIsoCode || "USD",
      expiresOn: sfVoucher.expirationDate || sfVoucher.expiryDate,
      status: mapVoucherStatus(sfVoucher.status),
      notes: sfVoucher.description || sfVoucher.reason,
      // Keep original Salesforce fields for reference
      originalType: sfVoucher.voucherType || sfVoucher.type,
      voucherDefinition: sfVoucher.voucherDefinition,
      // Additional SF fields for reference
      _raw: {
        programId: sfVoucher.loyaltyProgramId,
        issuedDate: sfVoucher.issuedDate,
        lastModifiedDate: sfVoucher.lastModifiedDate,
        effectiveDate: sfVoucher.effectiveDate,
        expirationDateTime: sfVoucher.expirationDateTime,
        redeemedValue: sfVoucher.redeemedValue,
        remainingValue: sfVoucher.remainingValue,
        isVoucherPartiallyRedeemable: sfVoucher.isVoucherPartiallyRedeemable,
        voucherNumber: sfVoucher.voucherNumber,
      }
    })) || [];

    res.json({
      vouchers: transformedVouchers,
      totalCount: data.totalCount || transformedVouchers.length,
      _meta: {
        membershipNumber,
        program: programName,
        fetchedAt: new Date().toISOString(),
        sourceApi: "salesforce-connect"
      }
    });

  } catch (error: any) {
    console.error(`[loyalty/vouchers] Error:`, error);
    res.status(500).json({ 
      error: "Internal server error fetching vouchers",
      message: error.message 
    });
  }
});

// Helper function to map Salesforce voucher types to our UI types
function mapVoucherType(sfType: string): "E-Cert" | "Upgrade" | "Travel Bank" | "Companion" | "Discount" | "Other" {
  const typeMap: Record<string, "E-Cert" | "Upgrade" | "Travel Bank" | "Companion" | "Discount" | "Other"> = {
    // Electronic Certificates
    "Electronic Certificate": "E-Cert",
    "E-Certificate": "E-Cert", 
    "ECert": "E-Cert",
    "Certificate": "E-Cert",
    
    // Upgrades
    "Upgrade": "Upgrade",
    "Upgrade Certificate": "Upgrade",
    
    // Travel Credits
    "Travel Credit": "Travel Bank",
    "Travel Bank": "Travel Bank",
    
    // Companion Certificates
    "Companion Certificate": "Companion",
    "Companion": "Companion",
    
    // Discount vouchers
    "10% Off Booking": "Discount",
    "Discount": "Discount",
    "Percentage Off": "Discount",
    "Dollar Off": "Discount",
    "Booking Discount": "Discount",
    "Rate Discount": "Discount",
  };
  
  // Check for percentage-based discounts
  if (sfType.toLowerCase().includes("% off") || sfType.toLowerCase().includes("percent off")) {
    return "Discount";
  }
  
  // Check for dollar amount discounts
  if (sfType.toLowerCase().includes("off") && (sfType.includes("$") || sfType.toLowerCase().includes("dollar"))) {
    return "Discount";
  }
  
  return typeMap[sfType] || "Other";
}

// Helper function to map Salesforce voucher status to our UI status  
function mapVoucherStatus(sfStatus: string): "Active" | "Used" | "Expired" {
  const statusMap: Record<string, "Active" | "Used" | "Expired"> = {
    "Active": "Active",
    "Available": "Active", 
    "Issued": "Active",
    "Valid": "Active",
    "Used": "Used",
    "Redeemed": "Used",
    "Consumed": "Used", 
    "Expired": "Expired",
    "Invalid": "Expired",
    "Cancelled": "Expired"
  };
  
  return statusMap[sfStatus] || "Active";
}

function sessionMembership(req: import('express').Request) {
  const m = req.session?.member;
  return {
    membershipNumber: m?.membershipNumber ?? null,
    memberId: m?.memberId ?? null,
    program: m?.program ?? 'Cars and Stays by Delta'
  };
}


function prefer<T>(...vals: (T | undefined | null)[]): T | undefined {
  return vals.find(v => v !== undefined && v !== null) as T | undefined;
}


router.post("/journals/accrual-stay", async (req, res) => {
  try {
    const input = req.body as any;
    const externalTransactionNumber = input.ExternalTransactionNumber;
    
    if (!externalTransactionNumber) {
      return res.status(400).json({
        status: "INVALID_REQUEST",
        message: "ExternalTransactionNumber is required",
      });
    }

    // 1. Check if booking already exists, create if not
    let booking = await getBookingByExternalTransactionNumber(externalTransactionNumber);
    let lineItemId: string;
    
    if (!booking) {
      // Create booking record
      const bookingRequest: CreateBookingRequest = {
        externalTransactionNumber,
        memberId: input.MemberId,
        membershipNumber: req.session?.member?.membershipNumber,
        
        bookingDate: input.BookingDate || new Date().toISOString().split('T')[0],
        tripStartDate: input.Trip_Start_Date__c || input.StartDate,
        tripEndDate: input.Trip_End_Date__c || input.EndDate,
        
        channel: input.Channel,
        posa: input.POSa__c,
        paymentMethod: input.PaymentMethod,
        
        lineItems: [{
          lob: "HOTEL",
          cashAmount: input.TransactionAmount,
          currency: input.CurrencyIsoCode,
          taxes: input.Booking_Tax__c,
          productName: `${input.Destination_City__c || 'Hotel'} Stay`,
          destinationCity: input.Destination_City__c,
          destinationCountry: input.Destination_Country__c,
          startDate: input.Trip_Start_Date__c || input.StartDate,
          endDate: input.Trip_End_Date__c || input.EndDate,
          nights: input.Length_of_Booking__c ? Number(input.Length_of_Booking__c) : undefined,
        }],
        
        createdBy: 'loyalty-journal-api',
      };
      
      booking = await createBooking(bookingRequest);
      lineItemId = booking.lineItems[0].id;
      console.log(`[loyalty/accrual-stay] Created booking ${booking.id} with line item ${lineItemId}`);
    } else {
      // Find or create hotel line item
      const hotelItem = booking.lineItems.find((item: BookingLineItem) => item.lob === "HOTEL" && item.status === "ACTIVE");
      if (hotelItem) {
        lineItemId = hotelItem.id;
      } else {
        // This is tricky - would need to add new line item to existing booking
        // For now, just use the first line item
        lineItemId = booking.lineItems[0]?.id;
        if (!lineItemId) {
          return res.status(400).json({
            status: "INVALID_REQUEST",
            message: "No valid line items found in existing booking",
          });
        }
      }
    }

    // 2. Build and post journal to Salesforce
    const body = {
      ...input,
      JournalTypeName: "Accrual",
      JournalSubTypeName: "Hotel",
      External_ID__c: input.External_ID__c ?? input.ExternalTransactionNumber,
    };

    const result = await executeAccrualStayJournal(body as any);
    if (!result.ok) {
      return res.status(result.status).json({ status: "ERROR", ...result.body });
    }
    
    // 3. Extract journal ID from Salesforce response and update booking
    const journalId = result.body?.processResult?.transactionJournalResult?.[0]?.id ||
                     result.body?.transactionJournals?.[0]?.transactionJournalId || 
                     result.body?.transactionJournalId ||
                     result.body?.journalId;
    
    if (journalId) {
      await updateLineItemJournalIds(booking.id, lineItemId, { accrualJournalId: journalId });
      console.log(`[loyalty/accrual-stay] Updated booking ${booking.id} with accrual journal ID: ${journalId}`);
      
      // Link the journal back to the booking line item in Salesforce
      try {
        await linkJournalToBookingLineItem(
          journalId,
          lineItemId,
          booking.externalTransactionNumber,
          "HOTEL",
          booking.memberId
        );
      } catch (error) {
        console.warn(`[loyalty/accrual-stay] Failed to link journal ${journalId} to line item:`, error);
        // Don't fail the entire transaction if linking fails
      }
    }
    
    return res.status(201).json({
      ...result.body,
      _booking: {
        bookingId: booking.id,
        lineItemId,
        journalId
      }
    });
  } catch (e: any) {
    console.error('[loyalty/accrual-stay] Error:', e);
    return res.status(400).json({
      status: "INVALID_REQUEST",
      message: e?.message || String(e),
    });
  }
});

// POST /api/loyalty/journals/redemption-stay - Submit redemption (Redeem Points) journal
router.post("/journals/redemption-stay", async (req, res) => {
  try {
    const input = req.body as RedemptionStayRequest;
    const externalTransactionNumber = input.ExternalTransactionNumber;

    // Validate that points to redeem is provided and positive
    if (!input.Points_to_Redeem__c || input.Points_to_Redeem__c <= 0) {
      return res.status(400).json({
        status: "INVALID_REQUEST",
        message: "Points_to_Redeem__c is required and must be positive"
      });
    }
    
    if (!externalTransactionNumber) {
      return res.status(400).json({
        status: "INVALID_REQUEST",
        message: "ExternalTransactionNumber is required",
      });
    }

    // 1. Find the original booking (strip -REDEEM suffix to find the accrual booking)
    const originalTransactionNumber = externalTransactionNumber.replace(/-REDEEM$/, '');
    let booking = await getBookingByExternalTransactionNumber(originalTransactionNumber);
    let lineItemId: string;
    
    if (!booking) {
      // Create booking record for redemption-only transaction
      const bookingRequest: CreateBookingRequest = {
        externalTransactionNumber,
        memberId: input.MemberId,
        membershipNumber: req.session?.member?.membershipNumber,
        
        bookingDate: input.BookingDate || new Date().toISOString().split('T')[0],
        tripStartDate: input.Trip_Start_Date__c,
        tripEndDate: input.Trip_End_Date__c,
        
        posa: input.POSa__c,
        
        lineItems: [{
          lob: "HOTEL",
          pointsRedeemed: input.Points_to_Redeem__c,
          currency: input.CurrencyIsoCode || "USD",
          productName: `${input.Destination_City__c || 'Hotel'} Stay (Points)`,
          destinationCity: input.Destination_City__c,
          destinationCountry: input.Destination_Country__c,
          startDate: input.Trip_Start_Date__c,
          endDate: input.Trip_End_Date__c,
          nights: input.Length_of_Booking__c ? Number(input.Length_of_Booking__c) : undefined,
        }],
        
        createdBy: 'loyalty-journal-api',
      };
      
      booking = await createBooking(bookingRequest);
      lineItemId = booking.lineItems[0].id;
      console.log(`[loyalty/redemption-stay] Created booking ${booking.id} with line item ${lineItemId}`);
    } else {
      // Find hotel line item or use first one
      const hotelItem = booking.lineItems.find((item: BookingLineItem) => item.lob === "HOTEL" && item.status === "ACTIVE");
      lineItemId = hotelItem?.id || booking.lineItems[0]?.id;
      
      if (!lineItemId) {
        return res.status(400).json({
          status: "INVALID_REQUEST",
          message: "No valid line items found in existing booking",
        });
      }
    }

    // 2. Build the journal body with forced classifications
    const body = {
      ...input,
      JournalTypeName: "Redemption", 
      JournalSubTypeName: "Redeem Points",
      External_ID__c: input.External_ID__c ?? input.ExternalTransactionNumber,
      ActivityDate: input.ActivityDate || new Date().toISOString(),
      CurrencyIsoCode: input.CurrencyIsoCode || "USD",
    };

    console.log(`[loyalty/redemption-stay] Submitting redemption journal:`, {
      externalId: body.ExternalTransactionNumber,
      points: body.Points_to_Redeem__c,
      memberId: body.MemberId,
      bookingId: booking.id,
      lineItemId
    });

    const result = await executeRedemptionStayJournal(body as any);
    
    if (!result.ok) {
      console.error('[loyalty/redemption-stay] Failed:', result.body);
      return res.status(result.status).json({ 
        status: "ERROR", 
        message: "Failed to submit redemption journal",
        ...result.body 
      });
    }

    // 3. Extract journal ID from Salesforce response and update booking
    const journalId = result.body?.processResult?.transactionJournalResult?.[0]?.id ||
                     result.body?.transactionJournals?.[0]?.transactionJournalId || 
                     result.body?.transactionJournalId ||
                     result.body?.journalId;
    
    if (journalId) {
      await updateLineItemJournalIds(booking.id, lineItemId, { redemptionJournalId: journalId });
      console.log(`[loyalty/redemption-stay] Updated booking ${booking.id} with redemption journal ID: ${journalId}`);
      
      // Update the line item with redeemed points
      await updateLineItemPointsRedeemed(booking.id, lineItemId, input.Points_to_Redeem__c);
      console.log(`[loyalty/redemption-stay] Added ${input.Points_to_Redeem__c} points redeemed to line item ${lineItemId}`);
      
      // Link the journal back to the booking line item in Salesforce
      try {
        await linkJournalToBookingLineItem(
          journalId,
          lineItemId,
          booking.externalTransactionNumber,
          "HOTEL",
          booking.memberId
        );
      } catch (error) {
        console.warn(`[loyalty/redemption-stay] Failed to link journal ${journalId} to line item:`, error);
        // Don't fail the entire transaction if linking fails
      }
    }

    return res.status(201).json({
      ...result.body,
      _booking: {
        bookingId: booking.id,
        lineItemId,
        journalId
      }
    });

  } catch (e: any) {
    console.error('[loyalty/redemption-stay] Error:', e);
    return res.status(400).json({
      status: "INVALID_REQUEST",
      message: e?.message || String(e),
    });
  }
});

// Existing member lookup
async function fetchMemberRecord(program: string, input: string) {
  // Heuristic: 15/18-char alphanumeric looks like a Salesforce Id
  const isSfId = /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(input);

  // 1) Preferred: CONNECT API (membershipNumber or by memberId)
  let path = !isSfId
    ? `/services/data/v64.0/connect/loyalty/programs/${encodeURIComponent(
        program
      )}/members?membershipNumber=${encodeURIComponent(input)}`
    : `/services/data/v64.0/connect/loyalty/programs/${encodeURIComponent(
        program
      )}/members/${encodeURIComponent(input)}`;

  let sf = await sfFetch(path, { method: "GET" });
  let data: any;
  try {
    data = await sf.json();
  } catch {
    data = null;
  }

  if (sf.ok) {
    // Some orgs return { records: [...] }, others return an object
    if (Array.isArray(data?.records) && data.records.length) return data.records[0];
    return data;
  }

  // 2) Legacy/alt path you currently use (works in some orgs)
  path = !isSfId
    ? `/services/data/v64.0/loyalty-programs/${encodeURIComponent(
        program
      )}/members?membershipNumber=${encodeURIComponent(input)}`
    : `/services/data/v64.0/loyalty-programs/${encodeURIComponent(
        program
      )}/members/${encodeURIComponent(input)}`;

  sf = await sfFetch(path, { method: "GET" });
  try {
    data = await sf.json();
  } catch {
    data = null;
  }
  if (sf.ok) {
    if (Array.isArray(data?.records) && data.records.length) return data.records[0];
    return data;
  }

  // 3) Fallback: Program Process (name may differ in your org)
  const ppPath =
    `/services/data/v64.0/connect/loyalty/programs/${encodeURIComponent(
      program
    )}/program-processes/${encodeURIComponent("Get Member Profile")}`;

  const processParameters = isSfId
    ? [{ MemberId: input }]
    : [{ MembershipNumber: input }];

  sf = await sfFetch(ppPath, {
    method: "POST",
    body: JSON.stringify({ processParameters }),
  });

  let pp: any;
  try {
    pp = await sf.json();
  } catch {
    pp = null;
  }

  if (!sf.ok) {
    const msg = pp?.[0]?.message || pp?.message || `HTTP ${sf.status}`;
    const raw = await sf.text().catch(() => "");
    throw new Error(`${msg}${raw ? ` — ${raw}` : ""}`);
  }

  const record =
    pp?.outputParameters?.member ??
    pp?.outputParameters?.outputParameters?.member ??
    pp?.member ??
    pp;

  return record;
}

// ---- New plural route: accepts ?membershipNumber= or ?memberId= ----
router.get("/members", async (req, res) => {
  try {
    const program =
      (req.query.program as string) || "Cars and Stays by Delta";
    const input =
      (req.query.membershipNumber as string) ||
      (req.query.memberId as string);

    if (!input) {
      return res
        .status(400)
        .json({ message: "Provide memberId or membershipNumber" });
    }

    const member = await fetchMemberRecord(program, input);

    if (!member || typeof member !== "object") {
      return res.status(404).json({ message: "Member not found" });
    }
    res.json(member);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed to load member" });
  }
});

// ---- Keep your existing singular route for backward compatibility ----
router.get("/member/:membershipNumber", async (req, res) => {
  try {
    const { membershipNumber } = req.params;
    const program =
      (req.query.program as string) || "Cars and Stays by Delta";

    const member = await fetchMemberRecord(program, membershipNumber);
    if (!member || typeof member !== "object") {
      return res.status(404).json({ message: "Member not found" });
    }
    res.json(member);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ message: msg });
  }
});


/**
 * POST /api/loyalty/transactions
 * Body:
 * {
 *   program?: string;            // default 'NTO'
 *   page?: number;               // default 1
 *   membershipNumber: string;    // required
 *   journalType?: string;        // e.g. 'Accrual' | 'Redemption'
 *   journalSubType?: string;     // e.g. 'Social'
 *   periodStartDate?: string;    // ISO
 *   periodEndDate?: string;      // ISO
 * }
 */
router.post('/transactions', async (req, res) => {
  try {
    const {
      program: bodyProgram = 'NTO',
      page = 1,
      membershipNumber: bodyMembership,
      journalType,
      journalSubType,
      periodStartDate,
      periodEndDate,
    } = req.body ?? {};

    const sess = sessionMembership(req);
    const program = prefer(bodyProgram, sess.program) || 'NTO';
    const membershipNumber = prefer(bodyMembership, sess.membershipNumber) ?? null;

    if (!membershipNumber) {
      return res.status(200).json({
        page: 1, pageSize: 0, totalPages: 0, nextPage: null, prevPage: null,
        items: [], notLinked: true
      });
    }

    const path =
      `/services/data/v64.0/connect/loyalty/programs/${encodeURIComponent(program)}` +
      `/transaction-history?page=${encodeURIComponent(page)}`;

    const sf = await sfFetch(path, {
      method: 'POST',
      body: JSON.stringify({
        membershipNumber,
        ...(journalType ? { journalType } : {}),
        ...(journalSubType ? { journalSubType } : {}),
        ...(periodStartDate ? { periodStartDate } : {}),
        ...(periodEndDate ? { periodEndDate } : {}),
      }),
    });

    const data = await sf.json();
    if (!sf.ok) {
      const msg = data?.[0]?.message || data?.message || `HTTP ${sf.status}`;
      return res.status(sf.status).json({ message: msg, raw: data });
    }

    const items =
      data?.items ??
      data?.records ??
      data?.transactionJournals ??
      data?.results ??
      [];

    const pageNum = data?.pageNumber ?? data?.page ?? Number(page);
    const pageSize = data?.pageSize ?? (Array.isArray(items) ? items.length : undefined);
    const totalPages =
      data?.totalPages ??
      (data?.totalCount && pageSize ? Math.ceil(data.totalCount / pageSize) : undefined);

    const parsePage = (u?: string | null) => {
      if (!u) return null;
      try { return Number(new URL(u, 'http://x').searchParams.get('page')); } catch { return null; }
    };
    const nextPage = parsePage(data?.nextPageUrl) ?? (totalPages && pageNum < totalPages ? pageNum + 1 : null);
    const prevPage = parsePage(data?.prevPageUrl) ?? (pageNum > 1 ? pageNum - 1 : null);

const normalized = items.map((t: any, idx: number) => {
  // Date (pick the first available)
  const dateISO =
    t?.transactionDateTime ??
    t?.transactionDate ??
    t?.eventDate ??
    t?.ActivityDate ??
    t?.JournalDate ??
    t?.CreatedDate ??
    t?.LastModifiedDate ??
    null;

  // Type / Sub-type
  const type =
    t?.journalType ??
    t?.type ??
    t?.UsageType ??
    (t?.IsAccrualJournalEntry ? "Accrual" : null) ??
    null;

  const subType =
    t?.journalSubType ??
    t?.subType ??
    t?.JournalSubTypeName ??
    t?.JournalSubType ??
    t?.JournalSubTypeId ??
    null;

  // Human description (fallbacks from raw)
  const descParts: string[] = [];
  if (t?.description) descParts.push(String(t.description));
  if (!t?.description && t?.narrative) descParts.push(String(t.narrative));
  if (!descParts.length && t?.note) descParts.push(String(t.note));
  if (!descParts.length && t?.Name) descParts.push(`Journal #${t.Name}`);
  if (t?.Payment_Type__c) descParts.push(`Paid by ${t.Payment_Type__c}`);
  if (t?.PaymentMethod) descParts.push(`(${t.PaymentMethod})`);
  const description = descParts.join(" • ");

  // Points delta (0 in your sample; keep 0 rather than "—")
  const pointsDelta =
    (typeof t?.pointsDelta === "number" && t.pointsDelta) ??
    (typeof t?.points === "number" && t.points) ??
    (typeof t?.netPoints === "number" && t.netPoints) ??
    (typeof t?.PointsDelta === "number" && t.PointsDelta) ??
    0;

  // Cash amount + currency
  const currencyAmount =
    (typeof t?.amount === "number" && t.amount) ??
    (typeof t?.transactionAmount?.amount === "number" && t.transactionAmount.amount) ??
    (typeof t?.TransactionAmount === "number" && t.TransactionAmount) ??
    (typeof t?.Cash_Paid__c === "number" && t.Cash_Paid__c) ??
    (typeof t?.Total_Package_Amount__c === "number" && t.Total_Package_Amount__c) ??
    null;

  const currencyCode =
    t?.currencyIsoCode ??
    t?.transactionAmount?.currencyCode ??
    t?.CurrencyIsoCode ??
    null;

  const partner = t?.partnerName ?? t?.partner ?? t?.PartnerName ?? null;
  const status = t?.status ?? t?.state ?? t?.Status ?? null;
  const balanceAfter =
    (typeof t?.balanceAfter === "number" && t.balanceAfter) ??
    (typeof t?.balance === "number" && t.balance) ??
    (typeof t?.BalanceAfter === "number" && t.BalanceAfter) ??
    null;

  return {
    id:
      t?.transactionJournalId ??
      t?.id ??
      t?.transactionId ??
      t?.Id ??
      `${pageNum}-${idx}`,
    date: dateISO,
    type,
    subType,
    description,
    pointsDelta,
    currencyAmount,
    currencyCode,
    partner,
    status,
    balanceAfter,
    _raw: t,
  };
});

    res.json({
      page: pageNum,
      pageSize,
      totalPages,
      nextPage,
      prevPage,
      items: normalized,
      raw: data,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ message: msg });
  }
});

// New: promotions via Program Process "Get Member Promotions"
// server/routes/loyalty.ts

router.post('/promotions', async (req, res) => {
  try {
    const {
      memberId,                // optional: a Salesforce 15/18 char Id
      membershipNumber,        // optional: e.g., "DL12345"
      program = 'Cars and Stays by Delta',
      processName = 'Get Member Promotions',
    } = req.body ?? {};

    const input = membershipNumber || memberId; // allow either
    if (!input) {
      return res.status(400).json({ message: 'Provide memberId or membershipNumber' });
    }

    // Heuristic: SF Ids are 15 or 18 chars, alphanumeric
    const isSfId = /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(input);

    const path =
      `/services/data/v64.0/connect/loyalty/programs/${encodeURIComponent(program)}` +
      `/program-processes/${encodeURIComponent(processName)}`;

    const processParameters = isSfId
      ? [{ MemberId: input }]
      : [{ MembershipNumber: input }];

    const sf = await sfFetch(path, {
      method: 'POST',
      body: JSON.stringify({ processParameters }),
    });

    const data = await sf.json();
    if (!sf.ok) {
      const msg = data?.[0]?.message || data?.message || `HTTP ${sf.status}`;
      return res.status(sf.status).json({ message: msg, raw: data });
    }

    const results =
      data?.outputParameters?.outputParameters?.results ??
      data?.outputParameters?.results ??
      data?.results ??
      [];

    const normalized = results.map((it: any, idx: number) => ({
      id: it?.promotionId ?? String(idx),
      name: it?.promotionName ?? 'Promotion',
      description: it?.description,
      imageUrl: it?.promotionImageUrl,
      startDate: it?.startDate,
      endDate: it?.endDate,
      eligibility: it?.memberEligibilityCategory,
      enrollmentRequired: it?.promotionEnrollmentRqr,
      _raw: it,
    }));

    res.json({ results: normalized, raw: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ message: msg });
  }
});


// New: simulate estimated points via Realtime Program Process (isSimulation=true)
// routes/loyalty.ts  (simulate handler)
// routes/loyalty.ts  (inside router.post('/simulate', ...))
router.post('/simulate', async (req, res) => {
  try {
    const {
      program = 'Cars and Stays by Delta',
      membershipNumber,
      journals = [],
      transactionJournals = [],
    } = req.body ?? {};

    // Accept either key from the client
    const inputJournals: any[] =
      (Array.isArray(transactionJournals) && transactionJournals.length
        ? transactionJournals
        : Array.isArray(journals)
        ? journals
        : []);

    if (!inputJournals.length) {
      return res.status(400).json({ message: 'journals[] or transactionJournals[] is required' });
    }

    // (optional) resolve MemberId from membershipNumber once, then add to each journal if missing
    let resolvedMemberId: string | null = null;
    if (membershipNumber) {
      const mPath =
        `/services/data/v64.0/loyalty-programs/${encodeURIComponent(program)}` +
        `/members?membershipNumber=${encodeURIComponent(membershipNumber)}`;
      const mResp = await sfFetch(mPath, { method: 'GET' });
      if (mResp.ok) {
        const mJson = await mResp.json().catch(() => null);
        resolvedMemberId = mJson?.[0]?.Id || mJson?.records?.[0]?.Id || mJson?.members?.[0]?.Id || null;
      }
    }

    const txns = inputJournals.map(j =>
      resolvedMemberId && !j.MemberId ? { ...j, MemberId: resolvedMemberId } : j
    );

    // Realtime simulation: correct shape
    const path = `/services/data/v64.0/connect/realtime/loyalty/programs/${encodeURIComponent(program)}`;
    const body = {
      transactionJournals: txns,
      runSetting: { isSimulation: true },
    };

    const sf = await sfFetch(path, { method: 'POST', body: JSON.stringify(body) });
    const data = await sf.json();
    if (!sf.ok) {
      const msg = data?.[0]?.message || data?.message || `HTTP ${sf.status}`;
      return res.status(sf.status).json({ message: msg, raw: data });
    }

    // Normalize simulation output
    const simTJs = data?.simulationResults?.transactionJournals ?? data?.transactionJournals ?? [];
    const results = simTJs.map((tj: any, i: number) => {
      const points = tj?.executionSummary?.pointsSummary ?? [];
      const byCurrency: Record<string, number> = {};
      for (const p of points) {
        const curr = p?.loyaltyProgramCurrencyName || p?.currencyIsoCode || 'PTS';
        const delta = Number(p?.changeinescrowpointsbalance ?? p?.changeInPointsBalance ?? p?.changeInPoints ?? 0);
        byCurrency[curr] = (byCurrency[curr] ?? 0) + delta;
      }
      return {
        index: i,
        byCurrency,
        errorMessage: tj?.errorMessage ?? null,
        processName: tj?.processName ?? null,
      };
    });

    res.json({ results, raw: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ message: msg });
  }
});

// Get member enrolled promotions using the existing "Get Member Promotions" process
router.get('/member/:membershipNumber/enrolled-promotions', async (req, res) => {
  try {
    const { membershipNumber } = req.params;
    console.log(`📋 Fetching enrolled promotions for member: ${membershipNumber}`);

    const program = 'Cars and Stays by Delta';
    const processName = 'Get Member Promotions';

    // Use the same process endpoint as the offers component
    const path = `/services/data/v64.0/connect/loyalty/programs/${encodeURIComponent(program)}/program-processes/${encodeURIComponent(processName)}`;

    const processParameters = [{ MembershipNumber: membershipNumber }];

    const response = await sfFetch(path, {
      method: 'POST',
      body: JSON.stringify({ processParameters }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Get Member Promotions failed:', errorText);
      return res.status(response.status).json({ 
        error: 'Failed to fetch enrolled promotions',
        details: errorText 
      });
    }

    const data = await response.json();
    console.log('✅ Get Member Promotions response:', JSON.stringify(data, null, 2));

    const results = data?.outputParameters?.outputParameters?.results ?? 
                   data?.outputParameters?.results ?? 
                   data?.results ?? 
                   [];

    // Filter for promotions that are enrolled/active and potentially engagement trails
    // Note: We'll filter for engagement trails in the client component after getting all promotions
    const promotions = results.map((promo: any) => ({
      id: promo.promotionId,
      name: promo.promotionName || promo.name,
      description: promo.description,
      type: promo.promotionType || promo.type, // This should help identify Engagement Trail types
      status: promo.enrollmentStatus || promo.status || 'Active', // Assume active if enrolled
      enrollmentDate: promo.enrollmentDate,
      startDate: promo.startDate,
      endDate: promo.endDate,
      eligibility: promo.memberEligibilityCategory,
      enrollmentRequired: promo.promotionEnrollmentRqr,
      imageUrl: promo.promotionImageUrl,
      // Keep raw data for debugging
      _raw: promo
    }));

    console.log(`✅ Found ${promotions.length} promotions for member ${membershipNumber}`);

    res.json({
      membershipNumber,
      totalPromotions: promotions.length,
      promotions
    });

  } catch (error: any) {
    console.error('❌ Error fetching enrolled promotions:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch enrolled promotions',
      details: error.message 
    });
  }
});

// Get engagement trail progress for a specific promotion
router.get('/member/:membershipNumber/engagement-trail/:promotionId', async (req, res) => {
  try {
    const { membershipNumber, promotionId } = req.params;
    console.log(`🛤️ Fetching engagement trail progress for member: ${membershipNumber}, promotion: ${promotionId}`);

    const programName = "Cars and Stays by Delta";

    // Call Salesforce Connect API for Member Engagement Trail
    // Based on: https://developer.salesforce.com/docs/atlas.en-us.loyalty.meta/loyalty/connect_resources_member_engagement_trail.htm
    const connectApiPath = `/services/data/v63.0/loyalty/programs/${encodeURIComponent(programName)}/members/${membershipNumber}/engagement-trail?promotionId=${promotionId}`;
    
    console.log('🔗 Calling Salesforce Connect API:', connectApiPath);
    
    const response = await sfFetch(connectApiPath, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Engagement trail API failed:', errorText);
      
      if (response.status === 404) {
        return res.status(404).json({ error: 'Engagement trail not found for this promotion' });
      }
      
      return res.status(response.status).json({ 
        error: 'Failed to fetch engagement trail progress',
        details: errorText 
      });
    }

    const trailData = await response.json();
    console.log('✅ Engagement trail data received:', JSON.stringify(trailData, null, 2));

    // Transform Salesforce response to our expected format
    const attributes = trailData.memberEngagementAttributeOutputRepresentations || [];
    const rewards = trailData.rewards?.[0] || {};
    const totalPossiblePoints = rewards.pointsRewards?.[0]?.points || 0;
    
    // Transform attributes to steps
    const steps = attributes.map((attr: any, index: number) => {
      const currentValue = parseFloat(attr.currentValue || '0');
      const targetValue = parseFloat(attr.targetValue || '1');
      const isCompleted = currentValue >= targetValue;
      
      return {
        id: `step-${index + 1}`,
        name: attr.name,
        description: attr.description || `Complete ${attr.name}`,
        stepNumber: index + 1,
        status: isCompleted ? 'Completed' : (currentValue > 0 ? 'InProgress' : 'NotStarted'),
        completedDate: isCompleted ? attr.startDate : undefined,
        requiredCount: targetValue,
        currentCount: currentValue,
        rewardPoints: Math.floor(totalPossiblePoints / attributes.length) // Distribute points evenly
      };
    });
    
    const completedSteps = steps.filter((s: any) => s.status === 'Completed').length;
    const inProgressSteps = steps.filter((s: any) => s.status === 'InProgress').length;
    
    const transformedData = {
      promotionId: promotionId,
      promotionName: trailData.promotionName || 'Engagement Trail',
      description: 'Complete all steps to earn bonus rewards',
      startDate: attributes[0]?.startDate,
      endDate: attributes[0]?.endDate,
      totalSteps: attributes.length,
      completedSteps: completedSteps,
      currentStepNumber: completedSteps + 1,
      overallStatus: completedSteps === attributes.length ? 'Completed' : 
                    (completedSteps > 0 || inProgressSteps > 0 ? 'InProgress' : 'NotStarted'),
      enrollmentDate: attributes[0]?.startDate,
      completionDate: completedSteps === attributes.length ? new Date().toISOString() : undefined,
      totalPossiblePoints: totalPossiblePoints,
      earnedPoints: Math.floor((completedSteps / attributes.length) * totalPossiblePoints),
      steps: steps
    };

    res.json(transformedData);

  } catch (error: any) {
    console.error('❌ Error fetching engagement trail progress:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch engagement trail progress',
      details: error.message
    });
  }
});

// POST /api/loyalty/update-tier - Update member tier (Admin function)
router.post('/update-tier', async (req, res) => {
  try {
    const { membershipNumber, tierName, loyaltyProgramName } = req.body;

    console.log(`[loyalty/update-tier] Updating tier for member ${membershipNumber} to ${tierName}`);

    if (!membershipNumber || !tierName || !loyaltyProgramName) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'membershipNumber, tierName, and loyaltyProgramName are required'
      });
    }

    // Call Salesforce Update Tier API using Program Process
    // Based on: https://developer.salesforce.com/docs/atlas.en-us.loyalty.meta/loyalty/connect_resources_update_tier.htm
    const apiPath = `/services/data/v62.0/connect/loyalty/programs/${encodeURIComponent(loyaltyProgramName)}/program-processes/${encodeURIComponent('Change Member Tier')}`;

    const requestBody = {
      processParameters: [
        {
          MembershipNumber: membershipNumber,
          NewTier: tierName,  // Fixed: Use NewTier instead of TierName
          ReasonForChange: "Admin console tier update"
        }
      ]
    };

    console.log(`[loyalty/update-tier] Calling Salesforce API: ${apiPath}`);
    console.log(`[loyalty/update-tier] Request body:`, JSON.stringify(requestBody, null, 2));

    const response = await sfFetch(apiPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[loyalty/update-tier] Salesforce API failed ${response.status}:`, errorText);
      return res.status(response.status).json({
        error: "Failed to update member tier",
        details: errorText,
        salesforceStatus: response.status
      });
    }

    const updateResult = await response.json();
    console.log(`[loyalty/update-tier] Salesforce response:`, JSON.stringify(updateResult, null, 2));

    res.json({
      success: true,
      membershipNumber,
      newTier: tierName,
      updateResult,
      _meta: {
        updatedAt: new Date().toISOString(),
        sourceApi: "salesforce-connect",
        apiVersion: "v64.0"
      }
    });

  } catch (error: any) {
    console.error(`[loyalty/update-tier] Error:`, error);
    res.status(500).json({
      error: "Internal server error updating member tier",
      message: error.message
    });
  }
});

// POST /api/loyalty/sso-enrollment - Mock SSO enrollment (check, enroll if needed, update tier/points)
router.post('/sso-enrollment', async (req, res) => {
  try {
    const { firstName, lastName, email, membershipNumber, tier, milesBalance, mqdsBalance } = req.body;
    const loyaltyProgramName = 'Cars and Stays by Delta';

    console.log(`[loyalty/sso-enrollment] Processing SSO enrollment for ${firstName} ${lastName} (${membershipNumber})`);

    if (!firstName || !lastName || !email || !membershipNumber || !tier) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'firstName, lastName, email, membershipNumber, and tier are required'
      });
    }

    let memberExists = false;
    let memberRecord: any = null;

    // Step 1: Check if member exists
    console.log(`[loyalty/sso-enrollment] === STEP 1: CHECKING MEMBER EXISTENCE ===`);
    try {
      memberRecord = await fetchMemberRecord(loyaltyProgramName, membershipNumber);
      memberExists = !!memberRecord;
      console.log(`[loyalty/sso-enrollment] ✅ Member ${membershipNumber} exists: ${memberExists}`);
      console.log(`[loyalty/sso-enrollment] Member record:`, JSON.stringify(memberRecord, null, 2));
    } catch (error) {
      console.log(`[loyalty/sso-enrollment] ❌ Member ${membershipNumber} not found:`, error);
      memberExists = false;
    }

    let action = '';
    let enrollmentResult: any = null;
    let balancesChanged = false;

    // Step 2: Enroll member if they don't exist
    if (!memberExists) {
      console.log(`[loyalty/sso-enrollment] === STEP 2: ENROLLING NEW MEMBER ===`);
      console.log(`[loyalty/sso-enrollment] Enrolling new member ${membershipNumber}`);

      const enrollmentData = {
        enrollmentDate: new Date().toISOString(),
        membershipNumber,
        associatedContactDetails: {
          firstName,
          lastName,
          email,
          allowDuplicateRecords: "false",
          additionalContactFieldValues: {
            attributes: {
              // Add any additional contact fields as needed
            }
          }
        },
        memberStatus: "Active",
        createTransactionJournals: "true",
        transactionJournalStatementFrequency: "Monthly",
        transactionJournalStatementMethod: "Email",
        enrollmentChannel: "Web",
        canReceivePromotions: "true",
        canReceivePartnerPromotions: "true",
        additionalMemberFieldValues: {
          attributes: {
            // Add any additional member fields as needed
          }
        }
      };

      // Call Individual Member Enrollment API - correct endpoint
      const enrollmentPath = `/services/data/v62.0/loyalty-programs/${encodeURIComponent(loyaltyProgramName)}/individual-member-enrollments`;

      console.log(`[loyalty/sso-enrollment] 📤 ENROLLMENT API REQUEST:`);
      console.log(`[loyalty/sso-enrollment] URL: ${enrollmentPath}`);
      console.log(`[loyalty/sso-enrollment] Method: POST`);
      console.log(`[loyalty/sso-enrollment] Headers: Content-Type: application/json`);
      console.log(`[loyalty/sso-enrollment] Body:`, JSON.stringify(enrollmentData, null, 2));

      const enrollmentResponse = await sfFetch(enrollmentPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(enrollmentData)
      });

      console.log(`[loyalty/sso-enrollment] 📥 ENROLLMENT API RESPONSE:`);
      console.log(`[loyalty/sso-enrollment] Status: ${enrollmentResponse.status} ${enrollmentResponse.statusText}`);

      if (!enrollmentResponse.ok) {
        const errorText = await enrollmentResponse.text();
        console.log(`[loyalty/sso-enrollment] ❌ Enrollment error body:`, errorText);
        return res.status(enrollmentResponse.status).json({
          error: "Failed to enroll member",
          details: errorText,
          salesforceStatus: enrollmentResponse.status
        });
      }

      enrollmentResult = await enrollmentResponse.json();
      console.log(`[loyalty/sso-enrollment] ✅ Enrollment success body:`, JSON.stringify(enrollmentResult, null, 2));
      action = 'Enrolled';
    } else {
      console.log(`[loyalty/sso-enrollment] Member ${membershipNumber} already exists, checking tier`);

      // Extract current tier from member record
      const currentTierName = memberRecord?.memberTiers?.[0]?.loyaltyMemberTierName ||
                             memberRecord?.tier?.name ||
                             memberRecord?.currentTier ||
                             'Unknown';

      console.log(`[loyalty/sso-enrollment] Current tier: ${currentTierName}, Requested tier: ${tier}`);

      if (currentTierName.toLowerCase() === tier.toLowerCase()) {
        console.log(`[loyalty/sso-enrollment] Tier matches, no tier update required`);
      } else {
        action = 'Member Found - Tier Update Required';
        console.log(`[loyalty/sso-enrollment] Tier mismatch, will update from ${currentTierName} to ${tier}`);
      }

      // Check current Miles and MQDs balances
      const currentMiles = memberRecord?.memberCurrencies?.find((currency: any) =>
        currency.loyaltyMemberCurrencyName === 'Miles')?.pointsBalance || 0;
      const currentMQDs = memberRecord?.memberCurrencies?.find((currency: any) =>
        currency.loyaltyMemberCurrencyName === 'MQDs')?.pointsBalance || 0;

      console.log(`[loyalty/sso-enrollment] Current balances - Miles: ${currentMiles}, MQDs: ${currentMQDs}`);
      console.log(`[loyalty/sso-enrollment] Requested balances - Miles: ${milesBalance}, MQDs: ${mqdsBalance}`);

      const milesChanged = typeof milesBalance === 'number' && milesBalance !== currentMiles;
      const mqdsChanged = typeof mqdsBalance === 'number' && mqdsBalance !== currentMQDs;
      balancesChanged = milesChanged || mqdsChanged;

      if (balancesChanged) {
        console.log(`[loyalty/sso-enrollment] Balance changes detected - Miles changed: ${milesChanged}, MQDs changed: ${mqdsChanged}`);
        if (!action || action === 'Member Found - No Changes Needed') {
          action = 'Member Found - Balance Update Required';
        }
      } else {
        console.log(`[loyalty/sso-enrollment] No balance changes detected`);
      }

      // If no tier changes and no balance changes, we can exit early
      if (!action || (action !== 'Member Found - Tier Update Required' && !balancesChanged)) {
        action = 'Member Found - No Changes Needed';
        console.log(`[loyalty/sso-enrollment] No changes needed - tier and balances match`);

        return res.json({
          success: true,
          action,
          membershipNumber,
          currentTier: currentTierName,
          requestedTier: tier,
          tierUpdateNeeded: false,
          balanceUpdateNeeded: false,
          currentBalances: { miles: currentMiles, mqds: currentMQDs },
          requestedBalances: { miles: milesBalance, mqds: mqdsBalance },
          memberExists: true,
          memberRecord: {
            name: `${memberRecord?.associatedContact?.firstName || 'Unknown'} ${memberRecord?.associatedContact?.lastName || ''}`,
            email: memberRecord?.associatedContact?.email,
            currentTier: currentTierName
          },
          _meta: {
            processedAt: new Date().toISOString(),
            sourceApi: "mock-sso",
            loyaltyProgram: loyaltyProgramName
          }
        });
      }
    }

    // Step 3: Update member tier (only if member was enrolled OR tier differs)
    let tierUpdateResult: any = null;
    if (!memberExists || action === 'Member Found - Tier Update Required') {
      console.log(`[loyalty/sso-enrollment] === STEP 3: UPDATING MEMBER TIER ===`);
      console.log(`[loyalty/sso-enrollment] Updating tier to ${tier}`);

      const tierUpdatePath = `/services/data/v62.0/connect/loyalty/programs/${encodeURIComponent(loyaltyProgramName)}/program-processes/${encodeURIComponent('Change Member Tier')}`;

      const tierUpdatePayload = {
        processParameters: [{
          MembershipNumber: membershipNumber,
          NewTier: tier,  // Fixed: Use NewTier instead of TierName
          ReasonForChange: "SSO enrollment tier update"
        }]
      };

      console.log(`[loyalty/sso-enrollment] 📤 TIER UPDATE API REQUEST:`);
      console.log(`[loyalty/sso-enrollment] URL: ${tierUpdatePath}`);
      console.log(`[loyalty/sso-enrollment] Method: POST`);
      console.log(`[loyalty/sso-enrollment] Headers: Content-Type: application/json`);
      console.log(`[loyalty/sso-enrollment] Body:`, JSON.stringify(tierUpdatePayload, null, 2));

      const tierUpdateResponse = await sfFetch(tierUpdatePath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tierUpdatePayload)
      });

      console.log(`[loyalty/sso-enrollment] 📥 TIER UPDATE API RESPONSE:`);
      console.log(`[loyalty/sso-enrollment] Status: ${tierUpdateResponse.status} ${tierUpdateResponse.statusText}`);

      if (tierUpdateResponse.ok) {
        tierUpdateResult = await tierUpdateResponse.json();
        console.log(`[loyalty/sso-enrollment] ✅ Tier update success body:`, JSON.stringify(tierUpdateResult, null, 2));
      } else {
        const errorText = await tierUpdateResponse.text();
        console.log(`[loyalty/sso-enrollment] ❌ Tier update error body:`, errorText);
      }
    } else {
      console.log(`[loyalty/sso-enrollment] === STEP 3: SKIPPING TIER UPDATE ===`);
      console.log(`[loyalty/sso-enrollment] No tier update needed - member already has correct tier`);
    }

    // Step 4: Update points balances (Miles and MQDs) via Transaction Journal
    // Create journal for all scenarios (new member or updates)
    let journalResult: any = null;
    if (!memberExists || action === 'Member Found - Tier Update Required' || balancesChanged) {
      console.log(`[loyalty/sso-enrollment] === STEP 4: UPDATING POINTS BALANCES ===`);
      console.log(`[loyalty/sso-enrollment] Creating transaction journal - Miles: ${milesBalance}, MQDs: ${mqdsBalance}`);
      console.log(`[loyalty/sso-enrollment] Trigger reasons - New member: ${!memberExists}, Tier change: ${action === 'Member Found - Tier Update Required'}, Balance change: ${balancesChanged}`);

      const journalPayload: AccrualStayJournal = {
        JournalTypeName: "Accrual",
        JournalSubTypeName: "SSO Update",
        MembershipNumber: membershipNumber,
        MileBalance__c: milesBalance,
        MQDBalance__c: mqdsBalance,
        ActivityDate: new Date().toISOString(),
        TransactionAmount: 0, // SSO balance update, no transaction amount
        CurrencyIsoCode: "USD",
        ExternalTransactionNumber: `SSO-${membershipNumber}-${Date.now()}`,
        External_ID__c: `SSO-${membershipNumber}-${Date.now()}`,
        Comment: "SSO enrollment points balance update"
      };

      console.log(`[loyalty/sso-enrollment] 📤 JOURNAL PAYLOAD:`);
      console.log(`[loyalty/sso-enrollment] Using executeAccrualStayJournal with payload:`, JSON.stringify(journalPayload, null, 2));

      try {
        const result = await executeAccrualStayJournal(journalPayload);

        console.log(`[loyalty/sso-enrollment] 📥 JOURNAL API RESPONSE:`);
        console.log(`[loyalty/sso-enrollment] Status: ${result.status}`);
        console.log(`[loyalty/sso-enrollment] OK: ${result.ok}`);

        if (result.ok) {
          journalResult = result.body;
          console.log(`[loyalty/sso-enrollment] ✅ Journal creation success body:`, JSON.stringify(journalResult, null, 2));
        } else {
          console.log(`[loyalty/sso-enrollment] ❌ Journal creation error body:`, JSON.stringify(result.body, null, 2));
        }
      } catch (error) {
        console.error(`[loyalty/sso-enrollment] Journal creation failed:`, error);
      }
    } else {
      console.log(`[loyalty/sso-enrollment] === STEP 4: SKIPPING POINTS UPDATE ===`);
      console.log(`[loyalty/sso-enrollment] No changes detected - member exists, tier matches, and balances match`);
    }

    // Update action description based on what was actually processed
    if (memberExists && action !== 'Member Found - Tier Update Required' && balancesChanged) {
      action = 'Member Found - Balance Update Processed';
    }

    res.json({
      success: true,
      action,
      membershipNumber,
      tier,
      milesBalance,
      mqdsBalance,
      memberExists,
      enrollmentResult,
      tierUpdateResult,
      journalResult,
      balanceUpdateProcessed: balancesChanged && journalResult != null,
      _meta: {
        processedAt: new Date().toISOString(),
        sourceApi: "mock-sso",
        loyaltyProgram: loyaltyProgramName
      }
    });

  } catch (error: any) {
    console.error(`[loyalty/sso-enrollment] Error:`, error);
    res.status(500).json({
      error: "Internal server error processing SSO enrollment",
      message: error.message
    });
  }
});

export default router;


