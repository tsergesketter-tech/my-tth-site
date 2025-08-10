import { Router } from 'express';
import { getClientCredentialsToken } from '../salesforce/auth';

const router = Router();

router.get('/member/:membershipNumber', async (req, res) => {
  try {
    const { membershipNumber } = req.params;
    const program = (req.query.program as string) || 'Cars and Stays by Delta';

    const { access_token, instance_url } = await getClientCredentialsToken();
    const url = `${instance_url}/services/data/v64.0/loyalty-programs/${encodeURIComponent(program)}/members?membershipNumber=${encodeURIComponent(membershipNumber)}`;

    const sf = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!sf.ok) return res.status(sf.status).send(await sf.text());

    res.json(await sf.json());
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

export default router; // <-- important

