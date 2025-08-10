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


