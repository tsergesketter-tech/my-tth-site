// routes/loyalty.ts
import { Router } from 'express';
import { sfFetch } from '../salesforce/sfFetch';

const router = Router();

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
      program = 'NTO',
      page = 1,
      membershipNumber,
      journalType,
      journalSubType,
      periodStartDate,
      periodEndDate,
    } = req.body ?? {};

    if (!membershipNumber) {
      return res.status(400).json({ message: 'membershipNumber is required' });
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

    // Normalize common shapes
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

    // Try to infer next/prev from URL if provided
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

export default router;


