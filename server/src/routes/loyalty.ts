import { Router } from 'express';
import { getClientCredentialsToken } from '../salesforce/auth';

const router = Router();

// Route for fetching member details based on membership number
router.get('/member/:membershipNumber', async (req, res) => {
  try {
    const { membershipNumber } = req.params;
    const program = (req.query.program as string) || 'Cars and Stays by Delta';

    const { access_token, instance_url } = await getClientCredentialsToken();
    const url = `${instance_url}/services/data/v64.0/loyalty-programs/${encodeURIComponent(
      program
    )}/members?membershipNumber=${encodeURIComponent(membershipNumber)}`;

    const sf = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!sf.ok) return res.status(sf.status).send(await sf.text());

    res.json(await sf.json());
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Route for fetching available promotions based on member ID
router.post('/getPromotions', async (req, res) => {
  try {
    const { memberId, program } = req.body;  // Expecting memberId and program in the body

    // Get Salesforce access token
    const { access_token, instance_url } = await getClientCredentialsToken();
    
    // Construct the URL for fetching promotions
    const url = `${instance_url}/services/data/v64.0/loyalty-programs/${encodeURIComponent(program)}/program-processes/Get%20Member%20Promotions`;

    const body = {
      processParameters: [{ MemberId: memberId }],
    };

    const sf = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!sf.ok) return res.status(sf.status).send(await sf.text());

    const data = await sf.json();

    // Handle the response structure and normalize the data for the frontend
    const results =
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

    res.json(normalized);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

export default router;


