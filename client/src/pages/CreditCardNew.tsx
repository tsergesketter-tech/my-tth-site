// client/src/pages/PaloniaCreditCards.tsx
import React, { useMemo, useState } from "react";

export default function PaloniaCreditCards() {
  const [tab, setTab] = useState<"personal" | "business">("personal");
  const [compare, setCompare] = useState<Record<string, boolean>>({});
  const year = useMemo(() => new Date().getFullYear(), []);

  const selectedCount = Object.values(compare).filter(Boolean).length;
  const compareHint =
    selectedCount === 0
      ? "Select 2–3 cards to compare"
      : `${selectedCount} selected — ${
          selectedCount === 1 ? "choose 1–2 more" : selectedCount === 2 ? "up to 1 more" : "up to 3 total"
        }`;

  const onToggle = (id: string) =>
    setCompare((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <main id="top" className="bg-gray-50">
      {/* Hero */}
      <section className="relative min-h-[56vh] grid place-items-center text-white">
        <div
          className="absolute inset-0 bg-cover bg-center scale-[1.02]"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1493558103817-58b2924bce98?q=80&w=1600&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/50" />
        <div className="relative z-10 mx-auto max-w-2xl rounded-2xl border border-white/20 bg-black/40 p-7 shadow-2xl backdrop-blur">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-wider">
            Limited-Time Offer
          </span>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">
            Earn up to 185,000 Palonia® Points
          </h1>
          <p className="mt-2 text-gray-200">
            Plus, enjoy complimentary Platinum Elite status for your first cardmember year. Offers end soon. Terms apply.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="#cards" className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
              See Cards
            </a>
            <a href="#detail" className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20">
              How Points Work
            </a>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section id="cards" className="container mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Choose a Palonia® Credit Card</h2>

        {/* Tabs */}
        <div className="mt-5 flex justify-center gap-6 text-gray-500">
          <button
            className={`relative pb-2 text-sm font-bold transition-colors ${
              tab === "personal" ? "text-gray-900" : "hover:text-gray-700"
            }`}
            aria-selected={tab === "personal"}
            onClick={() => setTab("personal")}
          >
            Personal <span aria-hidden>· 4 Cards</span>
            {tab === "personal" && <span className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-gray-900" />}
          </button>
          <button
            className={`relative pb-2 text-sm font-bold transition-colors ${
              tab === "business" ? "text-gray-900" : "hover:text-gray-700"
            }`}
            aria-selected={tab === "business"}
            onClick={() => setTab("business")}
          >
            Business <span aria-hidden>· 1 Card</span>
            {tab === "business" && <span className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-gray-900" />}
          </button>
        </div>

        {/* Grid */}
        {tab === "personal" ? (
          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                id: "boundless",
                brand: "Palonia® Visa Signature®",
                title: "Palonia Boundless® Credit Card",
                stat: "3",
                statNote: "Free Night Awards",
                ribbon: "Limited-Time Offer",
                img: "https://www.marriott.com/content/dam/marriott-digital/global/partner-logo/en_us/logo/internal/assets/bonvoy-cobrand-boundles-dsktptab-33510.png",
                kickerNote: "Each night valued up to 50,000 points. Resort fees may apply. Terms apply.",
              },
              {
                id: "bold",
                brand: "Palonia® Visa",
                title: "Palonia Bold® Credit Card",
                stat: "30,000",
                statNote: "Bonus Points",
                img: "https://www.marriott.com/content/dam/marriott-digital/global/partner-logo/en_us/logo/internal/assets/bonvoy-cobrand-bold-desktoptab-29647.png",
                kickerNote: "After qualifying purchases in the first 3 months. No annual fee. Terms apply.",
              },
              {
                id: "bevy",
                brand: "Palonia® American Express®",
                title: "Palonia Bevy® Credit Card",
                stat: "155,000",
                statNote: "Bonus Points",
                ribbon: "Limited-Time Offer",
                img: "https://www.marriott.com/content/dam/marriott-digital/global/partner-logo/en_us/logo/internal/assets/bonvoy-cobrand-bevy-desktoptab-16776.png",
                kickerNote: "After qualifying purchases. Terms apply.",
              },
              {
                id: "brilliant",
                brand: "Palonia® American Express®",
                title: "Palonia Brilliant® Credit Card",
                stat: "185,000",
                statNote: "Bonus Points",
                ribbon: "Limited-Time Offer",
                img: "https://www.marriott.com/content/dam/marriott-digital/global/partner-logo/en_us/logo/internal/assets/bonvoy-cobrand-briliant-dsktptab-33555.png",
                kickerNote: "Highest-ever welcome offer. Terms apply.",
              },
            ].map((c) => (
              <article key={c.id} className="group relative overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="relative aspect-[16/9] grid place-items-center bg-white">
                  {c.ribbon && (
                    <span className="absolute left-3 top-3 rounded-lg bg-orange-500 px-2.5 py-1 text-xs font-extrabold text-white shadow">
                      {c.ribbon}
                    </span>
                  )}
                  <img src={c.img} alt="" className="max-h-40 w-3/5 object-contain md:w-1/2" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">{c.brand}</div>
                  <h3 className="text-base font-extrabold leading-snug text-gray-900">{c.title}</h3>
                  <p className="text-sm">
                    <span className="block text-2xl font-bold tracking-tight text-gray-900">{c.stat}</span>
                    <span className="text-gray-700">{c.statNote}</span>
                  </p>
                  <p className="text-xs text-gray-500">{c.kickerNote}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <a href="#detail" className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-gray-50">
                      Learn More
                    </a>
                    <label className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-xs text-gray-900">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={!!compare[c.id]}
                        onChange={() => onToggle(c.id)}
                      />
                      Compare
                    </label>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="relative aspect-[16/9] grid place-items-center bg-white">
                <img
                  src="https://www.marriott.com/content/dam/marriott-digital/digital-merchandising/global/en_us/cobrand-cards/assets/pdt-USBU-LTO-Flag-190x152-143502894369030.png"
                  alt=""
                  className="max-h-40 w-3/5 object-contain md:w-1/2"
                />
              </div>
              <div className="space-y-2 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">Palonia® Business</div>
                <h3 className="text-base font-extrabold leading-snug text-gray-900">Palonia Business® Credit Card</h3>
                <p className="text-sm">
                  <span className="block text-2xl font-bold tracking-tight text-gray-900">125,000</span>
                  <span className="text-gray-700">Bonus Points</span>
                </p>
                <p className="text-xs text-gray-500">
                  Plus up to $300 back in statement credits on eligible purchases in your first 6 months. Terms apply.
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <a href="#detail" className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-gray-50">
                    Learn More
                  </a>
                  <label className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-xs text-gray-900">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={!!compare["business"]}
                      onChange={() => onToggle("business")}
                    />
                    Compare
                  </label>
                </div>
              </div>
            </article>
          </div>
        )}

        {/* Sticky compare bar */}
        <div className="sticky bottom-0 z-30 mt-6 flex items-center justify-center gap-4 border-t border-gray-200 bg-white/85 px-4 py-3 backdrop-blur">
          <span className="text-xs uppercase tracking-wide text-gray-600">{compareHint}</span>
          <a
            href="#detail"
            onClick={(e) => {
              if (!(selectedCount >= 2 && selectedCount <= 3)) e.preventDefault();
            }}
            aria-disabled={!(selectedCount >= 2 && selectedCount <= 3)}
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${
              selectedCount >= 2 && selectedCount <= 3
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
          >
            Compare Credit Cards
          </a>
        </div>
      </section>

      {/* Details */}
      <section id="detail" className="container mx-auto max-w-6xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-[1.2fr_.8fr]">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Featured Card</div>
            <h3 className="mt-1 text-2xl font-bold">Palonia Boundless® Credit Card</h3>
            <p className="mt-2 text-gray-700">
              Earn unlimited Palonia Points on everyday purchases, plus Free Night Awards after qualifying spend. Designed
              for travelers who want rich hotel perks without the luxury price tag.
            </p>
            <ul className="mt-3 list-disc pl-5 text-gray-700">
              <li>17X total points at Palonia hotels</li>
              <li>3X at gas, grocery & dining; 2X everywhere else</li>
              <li>Automatic Silver Elite status each cardmember year</li>
              <li>15 Elite Night Credits each year</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              Benefits vary by card. Enrollment may be required for select benefits. Terms apply.
            </p>
          </div>
          <div>
            <img
              src="https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=1200&auto=format&fit=crop"
              alt="Traveler at a scenic overlook"
              className="w-full rounded-xl border border-gray-200 object-cover"
            />
          </div>
        </div>

        {/* (Optional) local page footer line — remove if you use global <Footer /> */}
        <div className="mx-auto mt-10 max-w-6xl px-2 text-center text-sm text-gray-500">
          © {year} Palonia Travel Group. Palonia®, Palonia Points®, and the Palonia logo are registered trademarks. This
          page is a static demo and not a credit application.
        </div>
      </section>
    </main>
  );
}
