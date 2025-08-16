// server/src/data/stays.ts
// Mock inventory for demo purposes

export type Room = {
  code: string;
  name: string;
  nightlyRate: number;
  refundable: boolean;
};

export type Stay = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address?: string;
  nightlyRate: number;
  currency: "USD";
  refundable?: boolean;
  rating?: number;
  reviews?: number;
  gallery?: string[];
  amenities?: string[];
  description?: string;
  rooms?: Room[];
  fees?: { taxesPct: number; resortFee: number };
  thumbnailUrl?: string;
};

// Simple gallery sets per city (Unsplash demo images)
const G = {
  seattle: [
    "https://images.unsplash.com/photo-1469321461812-afeb94496b27?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?q=80&w=1200&auto=format&fit=crop",
  ],
  chicago: [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1200&auto=format&fit=crop",
  ],
  nyc: [
    "https://images.unsplash.com/photo-1484910292437-025e5d13ce87?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1468276311594-df7cb65d8df6?q=80&w=1200&auto=format&fit=crop",
  ],
  la: [
    "https://images.unsplash.com/photo-1518684079-3c830dcef090?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1200&auto=format&fit=crop",
  ],
  miami: [
    "https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop",
  ],
  boston: [
    "https://images.unsplash.com/photo-1520974740461-6b0b03b2c4d2?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
  ],
};

// Shared defaults for each property (currency is REQUIRED here)
const common = {
  currency: "USD",
  refundable: true,
  rating: 8.6,
  reviews: 1243,
  amenities: ["Free Wi-Fi", "Pool", "Gym", "Restaurant", "Bar", "Parking"],
  fees: { taxesPct: 0.12, resortFee: 18 },
  rooms: [
    { code: "STD-K", name: "Standard King", nightlyRate: 179, refundable: true },
    { code: "STD-QQ", name: "Standard 2 Queens", nightlyRate: 199, refundable: true },
    { code: "DLX-K", name: "Deluxe King", nightlyRate: 229, refundable: true },
  ] as Room[],
  description:
    "Modern property near major attractions. Spacious rooms, great views, and on-site dining. Perfect for business and leisure travelers.",
} satisfies Pick<
  Stay,
  "currency" | "refundable" | "rating" | "reviews" | "amenities" | "fees" | "rooms" | "description"
>;

export const stays: Stay[] = [
  // ---------- CHICAGO ----------
  {
    id: "CHI-1",
    slug: "downtown-chicago-hotel",
    name: "Downtown Chicago Hotel",
    city: "Chicago",
    address: "123 W Lake St, Chicago, IL",
    nightlyRate: 179,
    gallery: G.chicago,
    thumbnailUrl: G.chicago[0],
    ...common,
  },
  {
    id: "CHI-2",
    slug: "magnificent-mile-suites",
    name: "Magnificent Mile Suites",
    city: "Chicago",
    address: "650 N Michigan Ave, Chicago, IL",
    nightlyRate: 219,
    gallery: G.chicago,
    thumbnailUrl: G.chicago[1],
    ...common,
  },

  // ---------- NEW YORK ----------
  {
    id: "NYC-1",
    slug: "manhattan-central",
    name: "Manhattan Central",
    city: "New York",
    address: "7th Ave & 53rd St, New York, NY",
    nightlyRate: 289,
    gallery: G.nyc,
    thumbnailUrl: G.nyc[0],
    ...common,
  },
  {
    id: "NYC-2",
    slug: "soho-boutique",
    name: "SoHo Boutique",
    city: "New York",
    address: "Prince St, New York, NY",
    nightlyRate: 249,
    gallery: G.nyc,
    thumbnailUrl: G.nyc[1],
    ...common,
  },

  // ---------- SEATTLE ----------
  {
    id: "SEA-1",
    slug: "waterfront-lodge",
    name: "Waterfront Lodge",
    city: "Seattle",
    address: "Alaskan Way, Seattle, WA",
    nightlyRate: 189,
    gallery: G.seattle,
    thumbnailUrl: G.seattle[0],
    ...common,
  },
  {
    id: "SEA-2",
    slug: "pike-place-inn",
    name: "Pike Place Inn",
    city: "Seattle",
    address: "1st Ave, Seattle, WA",
    nightlyRate: 169,
    gallery: G.seattle,
    thumbnailUrl: G.seattle[1],
    ...common,
  },

  // ---------- LOS ANGELES ----------
  {
    id: "LAX-1",
    slug: "hollywood-hills-hotel",
    name: "Hollywood Hills Hotel",
    city: "Los Angeles",
    address: "Hollywood Blvd, Los Angeles, CA",
    nightlyRate: 209,
    gallery: G.la,
    thumbnailUrl: G.la[0],
    ...common,
  },
  {
    id: "LAX-2",
    slug: "santa-monica-breeze",
    name: "Santa Monica Breeze",
    city: "Los Angeles",
    address: "Ocean Ave, Santa Monica, CA",
    nightlyRate: 239,
    gallery: G.la,
    thumbnailUrl: G.la[1],
    ...common,
  },

  // ---------- MIAMI ----------
  {
    id: "MIA-1",
    slug: "south-beach-resort",
    name: "South Beach Resort",
    city: "Miami",
    address: "Collins Ave, Miami Beach, FL",
    nightlyRate: 199,
    gallery: G.miami,
    thumbnailUrl: G.miami[0],
    ...common,
  },
  {
    id: "MIA-2",
    slug: "brickell-views",
    name: "Brickell Views",
    city: "Miami",
    address: "Brickell Ave, Miami, FL",
    nightlyRate: 189,
    gallery: G.miami,
    thumbnailUrl: G.miami[1],
    ...common,
  },

  // ---------- BOSTON ----------
  {
    id: "BOS-1",
    slug: "back-bay-hotel",
    name: "Back Bay Hotel",
    city: "Boston",
    address: "Boylston St, Boston, MA",
    nightlyRate: 209,
    gallery: G.boston,
    thumbnailUrl: G.boston[0],
    ...common,
  },
  {
    id: "BOS-2",
    slug: "seaport-marina",
    name: "Seaport Marina",
    city: "Boston",
    address: "Seaport Blvd, Boston, MA",
    nightlyRate: 219,
    gallery: G.boston,
    thumbnailUrl: G.boston[1],
    ...common,
  },
];

// ---- Helpers ---------------------------------------------------------------

export function findById(id: string) {
  return stays.find((s) => s.id.toLowerCase() === id.toLowerCase()) || null;
}

export function findBySlug(slug: string) {
  return stays.find((s) => s.slug.toLowerCase() === slug.toLowerCase()) || null;
}

export function searchByCity(q: string) {
  const city = (q || "").split(",")[0].trim().toLowerCase();
  if (!city) return [] as Stay[];
  return stays.filter((s) => s.city.toLowerCase().startsWith(city));
}
