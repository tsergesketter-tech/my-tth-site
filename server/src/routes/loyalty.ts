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
router.get('/member/:membershipNumber', async (req, res) => {
  try {
    const { membershipNumber } = req.params;
    const program = (req.query.program as string) || 'Cars and Stays by Delta';
    const path =
      `/services/data/v64.0/loyalty-programs/${encodeURIComponent(program)}` +
      `/members?membershipNumber=${encodeURIComponent(membershipNumber)}`;

    const sf = await sfFetch(path, { method: 'GET' });
    if (!sf.ok) return res.status(sf.status).send(await sf.text());
    res.json(await sf.json());
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

    const normalized = items.map((t: any, idx: number) => ({
      id: t?.transactionJournalId ?? t?.id ?? t?.transactionId ?? `${pageNum}-${idx}`,
      date: t?.transactionDateTime ?? t?.transactionDate ?? t?.eventDate ?? null,
      type: t?.journalType ?? t?.type ?? null,
      subType: t?.journalSubType ?? t?.subType ?? null,
      description: t?.description ?? t?.narrative ?? t?.note ?? '',
      pointsDelta: t?.pointsDelta ?? t?.points ?? t?.netPoints ?? 0,
      currencyAmount: t?.amount ?? t?.transactionAmount?.amount ?? null,
      currencyCode: t?.currencyIsoCode ?? t?.transactionAmount?.currencyCode ?? null,
      partner: t?.partnerName ?? t?.partner ?? null,
      status: t?.status ?? t?.state ?? null,
      balanceAfter: t?.balanceAfter ?? t?.balance ?? null,
      _raw: t,
    }));

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
router.post('/promotions', async (req, res) => {
  try {
    const { memberId, program = 'Cars and Stays by Delta', processName = 'Get Member Promotions' } = req.body ?? {};
    if (!memberId) return res.status(400).json({ message: 'memberId is required' });

    const path =
      `/services/data/v64.0/connect/loyalty/programs/${encodeURIComponent(program)}` +
      `/program-processes/${encodeURIComponent(processName)}`;

    const sf = await sfFetch(path, {
      method: 'POST',
      body: JSON.stringify({ processParameters: [{ MemberId: memberId }] })
    });

    const data = await sf.json();
    if (!sf.ok) {
      // Salesforce sometimes returns an array of errors
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
      _raw: it
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


