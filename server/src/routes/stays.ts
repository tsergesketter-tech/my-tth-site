// server/src/routes/stays.ts
import { Router } from "express";
import { findById, findBySlug, searchByCity, stays } from "../data/stays";

const r = Router();

/** GET /api/stays/search?location=Chicago */
r.get("/search", (req, res) => {
  const location = String(req.query.location || "");
  const results = searchByCity(location).map((s) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    nightlyRate: s.nightlyRate,
    currency: s.currency,
    thumbnailUrl: s.thumbnailUrl || s.gallery?.[0],
    refundable: s.refundable,
    rating: s.rating,
    reviews: s.reviews,
    // include slug if you want to link with it on the client
    slug: s.slug,
  }));
  res.json({ results, count: results.length, total: stays.length });
});

/** GET /api/stays/:id  (ID like CHI-1, NYC-1, etc.) */
r.get("/:id", (req, res) => {
  const s = findById(String(req.params.id));
  if (!s) return res.status(404).json({ message: "Not found" });
  res.json(s);
});

/** GET /api/stays/by-slug/:slug  (slug like "downtown-chicago-hotel") */
r.get("/by-slug/:slug", (req, res) => {
  const s = findBySlug(String(req.params.slug));
  if (!s) return res.status(404).json({ message: "Not found" });
  res.json(s);
});

export default r;

