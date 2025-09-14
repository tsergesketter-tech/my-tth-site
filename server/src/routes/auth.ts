import { Router } from "express";
const router = Router();

router.post("/mock-login", (req, res) => {
  const { membershipNumber = "DL12345", memberId, program = "Cars and Stays by Delta" } = req.body || {};
  console.log(`[auth/mock-login] Creating session for:`, { membershipNumber, memberId, program });
  console.log(`[auth/mock-login] Before - req.session:`, JSON.stringify(req.session, null, 2));

  req.session = req.session || {};
  req.session.member = { membershipNumber, memberId, program };

  console.log(`[auth/mock-login] After - req.session:`, JSON.stringify(req.session, null, 2));
  res.json({ ok: true, member: req.session.member });
});

router.get("/me", (req, res) => {
  console.log(`[auth/me] req.session:`, JSON.stringify(req.session, null, 2));
  console.log(`[auth/me] member:`, req.session?.member);
  res.json({ member: req.session?.member || null });
});

router.post("/logout", (req, res) => {
  req.session = req.session || {};
  req.session.member = undefined;
  res.json({ ok: true });
});



export default router;
