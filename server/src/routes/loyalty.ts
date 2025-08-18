// routes/loyalty.ts
import { Router } from 'express';
import { sfFetch } from '../salesforce/sfFetch';

const router = Router();

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
        const delta = Number(p?.changeInPointsBalance ?? p?.changeInPoints ?? 0);
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




export default router;


