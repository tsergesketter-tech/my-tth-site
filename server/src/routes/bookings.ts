import { Router } from "express";

const router = Router();

router.get("/__ping", (_req, res) => {
  res.json({ ok: true, at: "/api/bookings/__ping" });
});

// POST /api/bookings
router.post("/", (req, res) => {
  const { stayId, roomCode, guests, nights, total } = req.body || {};
  if (!stayId || !roomCode) {
    return res.status(400).json({ message: "Missing stayId or roomCode" });
  }

  const bookingId: string = req.body?.bookingId || `BK-${Date.now()}`;

  // TODO: persist if you want; returning echo for now
  return res.status(201).json({
    bookingId,
    stayId,
    roomCode,
    guests,
    nights,
    total,
  });
});

export default router;
