// server/src/routes/stays.ts
import { Router, Request, Response } from "express";

const staysRouter = Router();

// seed catalog (swap later with real inventory)
const CATALOG = [
  { id: "CHI-RITZ",  name: "The Ritz-Carlton, Chicago", city: "Chicago", nightlyRate: 347, currency: "USD", thumbnailUrl: "/images/miami.jpg", refundable: true,  rating: 9.2, reviews: 1001 },
  { id: "CHI-TRUMP", name: "Trump International Hotel & Tower Chicago", city: "Chicago", nightlyRate: 289, currency: "USD", thumbnailUrl: "/images/seattle.jpg", refundable: true,  rating: 9.4, reviews: 1601 },
  { id: "SEA-1",     name: "Waterfront Suites", city: "Seattle", nightlyRate: 219, currency: "USD", thumbnailUrl: "/images/seattle.jpg", refundable: true }
];

staysRouter.get("/search", (req: Request, res: Response) => {
  const { location = "" } = req.query as Record<string, string>;
  const term = location.toString().trim().toLowerCase();
  const results = CATALOG.filter(s =>
    term ? s.city.toLowerCase().includes(term) || s.name.toLowerCase().includes(term) : true
  );
  res.json({ query: { location }, count: results.length, results });
});

export default staysRouter;
// (optional) also export named for flexibility
export { staysRouter };

