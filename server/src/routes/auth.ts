import { Router } from "express";
const router = Router();

router.post("/mock-login", (req, res) => {
  const { membershipNumber = "DL12345", memberId = null, program = "Cars and Stays by Delta" } = req.body || {};
  req.session = req.session || {};
  req.session.member = { membershipNumber, memberId, program };
  res.json({ ok: true, member: req.session.member });
});

router.get("/me", (req, res) => {
  res.json({ member: req.session?.member || null });
});

router.post("/logout", (req, res) => {
  req.session = req.session || {};
  req.session.member = undefined;
  res.json({ ok: true });
});



export default router;
