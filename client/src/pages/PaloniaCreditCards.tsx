import React, { useMemo, useState } from "react";

/** One-file, static Palonia® credit cards page. No external components. */
export default function PaloniaCreditCards() {
  const [tab, setTab] = useState<"personal" | "business">("personal");
  const [compare, setCompare] = useState<Record<string, boolean>>({});
  const year = useMemo(() => new Date().getFullYear(), []);

  const selectedCount = Object.values(compare).filter(Boolean).length;
  const compareHint =
    selectedCount === 0
      ? "Select 2–3 cards to compare"
      : `${selectedCount} selected — ${selectedCount === 1 ? "choose 1–2 more" : selectedCount === 2 ? "up to 1 more" : "up to 3 total"}`;

  const onToggle = (id: string) =>
    setCompare((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <main id="top">
      {/* Styles kept inline for easy drop-in */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
:root {
  --brand:#0d6efd; --brand-ink:#0a2a66; --accent:#ff6a3d; --bg:#0b0d11;
  --ink:#111827; --muted:#6b7280; --card:#fff; --line:#e5e7eb; --chip:#f3f4f6;
  --radius-xl:16px; --shadow-1:0 1px 2px rgba(0,0,0,.05), 0 8px 24px rgba(0,0,0,.08);
  --shadow-2:0 12px 32px rgba(0,0,0,.18); --max:1200px;
}
html,body{margin:0;padding:0;background:#fafafa;color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
a{color:inherit;text-decoration:none}
.container{max-width:var(--max);margin-inline:auto;padding:0 24px}
.site-header{position:sticky;top:0;z-index:40;background:rgba(255,255,255,.8);backdrop-filter:saturate(140%) blur(8px);border-bottom:1px solid var(--line)}
.header-inner{display:flex;align-items:center;justify-content:space-between;height:64px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.2px;font-size:18px}
.brand-logo{width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,var(--brand),var(--brand-ink));box-shadow:inset 0 0 0 2px rgba(255,255,255,.6)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;border-radius:999px;border:1px solid var(--line);background:#fff;box-shadow:var(--shadow-1);font-weight:600}
.btn.primary{background:var(--brand);color:#fff;border-color:transparent}
.btn.primary:hover{filter:brightness(.95)}
.hero{position:relative;min-height:56vh;display:grid;place-items:center;color:#fff;overflow:hidden}
.hero::before{content:"";position:absolute;inset:0;background:url('https://images.unsplash.com/photo-1493558103817-58b2924bce98?q=80&w=1600&auto=format&fit=crop') center/cover no-repeat;transform:scale(1.02)}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.45))}
.hero-card{position:relative;z-index:1;max-width:640px;padding:28px;border-radius:20px;background:rgba(12,14,18,.55);border:1px solid rgba(255,255,255,.18);box-shadow:var(--shadow-2)}
.badge{display:inline-flex;gap:8px;background:rgba(255,255,255,.14);color:#fff;padding:6px 10px;border-radius:999px;font-size:12px;letter-spacing:.3px;text-transform:uppercase}
.headline{margin:14px 0 6px;font-size:clamp(28px,5vw,42px);line-height:1.1;font-weight:800}
.subhead{color:#e5e7eb;font-size:16px;margin-bottom:16px}
.section{padding:56px 0}
.section h2{text-align:center;font-size:clamp(24px,3.5vw,40px);margin:0 0 8px}
.tabs{display:flex;gap:20px;justify-content:center;margin:14px 0 22px;color:var(--muted)}
.tab{position:relative;font-weight:700;padding:8px 2px;cursor:pointer;background:none;border:none}
.tab[data-active="true"]{color:var(--ink)}
.tab[data-active="true"]::after{content:"";position:absolute;left:0;bottom:-8px;height:3px;width:100%;background:#111;border-radius:2px}
.grid{display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:22px}
@media (min-width:720px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (min-width:1024px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-1);display:flex;flex-direction:column}
.card-media{
  position: relative;          /* make it a positioning context */
  aspect-ratio: 16/9;
  background: transparent;     /* was #eef2ff; now transparent */
  display: grid;
  place-items: center;
}
.card-media img {
  width: 62%;       /* was ~88% */
  max-width: 320px; /* optional hard cap */
  height: auto;
  object-fit: contain;
}

.card { 
  /* image is 16:9, so height = width * 9/16; 40% of that = width * 9/16 * 0.4 */
  --overlap: calc((100% * 9 / 16) * 0.4);
  overflow: visible;           /* allow the body to slide up under the image */
}
@media (min-width: 1024px) {
  .card-media img { width: 55%; max-width: 360px; }
}
@media (max-width: 480px) {
  .card-media img { width: 70%; max-width: 260px; }
}
.ribbon{position:absolute;top:12px;left:12px;background:var(--accent);color:#fff;font-weight:800;font-size:12px;padding:6px 10px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.25);letter-spacing:.4px}
.card-body{padding:18px;display:flex;flex-direction:column;gap:8px}
.card-title{font-weight:800;font-size:18px;line-height:1.25}
.card-kicker{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.4px}
.stat{margin:10px 0;font-size:14px}
.stat strong{display:block;font-size:26px;letter-spacing:.3px}
.terms{color:var(--muted);font-size:12px}
.card-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}
.chip{background:var(--chip);border-radius:8px;padding:6px 10px;font-size:12px;color:#111;border:1px solid var(--line)}
.compare-bar{position:sticky;bottom:0;z-index:30;background:rgba(255,255,255,.95);backdrop-filter:blur(6px);border-top:1px solid var(--line);padding:14px 18px;display:flex;align-items:center;justify-content:center;gap:16px}
.compare-bar .btn[disabled]{opacity:.5;cursor:not-allowed}
.detail{background:#fff;border-radius:22px;border:1px solid var(--line);box-shadow:var(--shadow-1);padding:28px}
.detail h3{font-size:clamp(22px,2.4vw,32px);margin:0 0 8px}
.col-2{display:grid;grid-template-columns:1fr;gap:24px}
@media (min-width:960px){.col-2{grid-template-columns:1.2fr .8fr}}
.list{margin:0;padding-left:18px}
.eyebrow{font-size:12px;text-transform:uppercase;color:var(--muted);letter-spacing:.3px}
footer{margin:64px 0 80px;color:var(--muted);font-size:13px}
`,
        }}
      />

      {/* Header */}
      <header className="site-header">
        <div className="container header-inner" role="navigation" aria-label="Primary">
          <a className="brand" href="#top">
            <span className="brand-logo" aria-hidden="true" />
            <span>Palonia® Rewards</span>
          </a>
          <nav className="header-cta" aria-label="Utility">
            <a className="btn" href="#cards">View Cards</a>
            <a className="btn primary" href="#detail">Learn More</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero" role="region" aria-label="Featured offer">
        <div className="hero-card">
          <span className="badge">Limited-Time Offer</span>
          <h1 className="headline">Earn up to 185,000 Palonia® Points</h1>
          <p className="subhead">
            Plus, enjoy complimentary Platinum Elite status for your first cardmember year. Offers end soon. Terms apply.
          </p>
          <div className="header-cta">
            <a className="btn primary" href="#cards">See Cards</a>
            <a className="btn" href="#detail" style={{ color: "blue" }}>How Points Work</a>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="section container" id="cards">
        <h2>Choose a Palonia® Credit Card</h2>

        <div className="tabs" role="tablist" aria-label="Card type">
          <button className="tab" role="tab" aria-selected={tab === "personal"} data-active={String(tab === "personal")} onClick={() => setTab("personal")}>
            Personal <span aria-hidden> · 4 Cards</span>
          </button>
          <button className="tab" role="tab" aria-selected={tab === "business"} data-active={String(tab === "business")} onClick={() => setTab("business")}>
            Business <span aria-hidden> · 1 Card</span>
          </button>
        </div>

        {/* PERSONAL GRID */}
        {tab === "personal" && (
          <div className="grid" aria-live="polite">
            {/* Card 1 */}
            <article className="card">
              <div className="card-media">
                <span className="ribbon">Limited-Time Offer</span>
                <img src="https://www.marriott.com/content/dam/marriott-digital/global/partner-logo/en_us/logo/internal/assets/bonvoy-cobrand-boundles-dsktptab-33510.png" alt="Palonia Boundless card art" />
              </div>
              <div className="card-body">
                <div className="card-kicker">Palonia® Visa Signature®</div>
                <h3 className="card-title">Palonia Boundless® Credit Card</h3>
                <p className="stat"><strong>3</strong> Free Night Awards</p>
                <p className="terms">Each night valued up to 50,000 points. Resort fees may apply. Terms apply.</p>
                <div className="card-actions">
                  <a className="btn" href="#detail">Learn More</a>
                  <label className="chip">
                    <input type="checkbox" checked={!!compare["boundless"]} onChange={() => onToggle("boundless")} /> Compare
                  </label>
                </div>
              </div>
            </article>

            {/* Card 2 */}
            <article className="card">
              <div className="card-media">
                <img src="https://www.marriott.com/content/dam/marriott-digital/global/partner-logo/en_us/logo/internal/assets/bonvoy-cobrand-bold-desktoptab-29647.png" alt="Palonia Bold card art" />
              </div>
              <div className="card-body">
                <div className="card-kicker">Palonia® Visa</div>
                <h3 className="card-title">Palonia Bold® Credit Card</h3>
                <p className="stat"><strong>30,000</strong> Bonus Points</p>
                <p className="terms">After qualifying purchases in the first 3 months. No annual fee. Terms apply.</p>
                <div className="card-actions">
                  <a className="btn" href="#detail">Learn More</a>
                  <label className="chip">
                    <input type="checkbox" checked={!!compare["bold"]} onChange={() => onToggle("bold")} /> Compare
                  </label>
                </div>
              </div>
            </article>

            {/* Card 3 */}
            <article className="card">
              <div className="card-media">
                <span className="ribbon">Limited-Time Offer</span>
                <img src="https://www.marriott.com/content/dam/marriott-digital/global/partner-logo/en_us/logo/internal/assets/bonvoy-cobrand-bevy-desktoptab-16776.png" alt="Palonia Bevy card art" />
              </div>
              <div className="card-body">
                <div className="card-kicker">Palonia® American Express®</div>
                <h3 className="card-title">Palonia Bevy® Credit Card</h3>
                <p className="stat"><strong>155,000</strong> Bonus Points</p>
                <p className="terms">After qualifying purchases. Terms apply.</p>
                <div className="card-actions">
                  <a className="btn" href="#detail">Learn More</a>
                  <label className="chip">
                    <input type="checkbox" checked={!!compare["bevy"]} onChange={() => onToggle("bevy")} /> Compare
                  </label>
                </div>
              </div>
            </article>

            {/* Card 4 */}
            <article className="card">
              <div className="card-media">
                <span className="ribbon">Limited-Time Offer</span>
                <img src="https://www.marriott.com/content/dam/marriott-digital/global/partner-logo/en_us/logo/internal/assets/bonvoy-cobrand-briliant-dsktptab-33555.png" alt="Palonia Brilliant card art" />
              </div>
              <div className="card-body">
                <div className="card-kicker">Palonia® American Express®</div>
                <h3 className="card-title">Palonia Brilliant® Credit Card</h3>
                <p className="stat"><strong>185,000</strong> Bonus Points</p>
                <p className="terms">Highest-ever welcome offer. Terms apply.</p>
                <div className="card-actions">
                  <a className="btn" href="#detail">Learn More</a>
                  <label className="chip">
                    <input type="checkbox" checked={!!compare["brilliant"]} onChange={() => onToggle("brilliant")} /> Compare
                  </label>
                </div>
              </div>
            </article>
          </div>
        )}

        {/* BUSINESS GRID */}
        {tab === "business" && (
          <div className="grid" aria-live="polite">
            <article className="card">
              <div className="card-media">
                <img src="https://www.marriott.com/content/dam/marriott-digital/digital-merchandising/global/en_us/cobrand-cards/assets/pdt-USBU-LTO-Flag-190x152-143502894369030.png" alt="Palonia Business card art" />
              </div>
              <div className="card-body">
                <div className="card-kicker">Palonia® Business</div>
                <h3 className="card-title">Palonia Business® Credit Card</h3>
                <p className="stat"><strong>125,000</strong> Bonus Points</p>
                <p className="terms">Plus up to $300 back in statement credits on eligible purchases in your first 6 months. Terms apply.</p>
                <div className="card-actions">
                  <a className="btn" href="#detail">Learn More</a>
                  <label className="chip">
                    <input type="checkbox" checked={!!compare["business"]} onChange={() => onToggle("business")} /> Compare
                  </label>
                </div>
              </div>
            </article>
          </div>
        )}

        {/* Sticky compare bar */}
        <div className="compare-bar" aria-live="polite">
          <span className="eyebrow">{compareHint}</span>
          <a className="btn primary" href="#detail" aria-disabled={!(selectedCount >= 2 && selectedCount <= 3)} onClick={(e) => {
            if (!(selectedCount >= 2 && selectedCount <= 3)) e.preventDefault();
          }}>
            Compare Credit Cards
          </a>
        </div>
      </section>

      {/* Details */}
      <section className="section container" id="detail">
        <div className="detail col-2">
          <div>
            <div className="eyebrow">Featured Card</div>
            <h3>Palonia Boundless® Credit Card</h3>
            <p>
              Earn unlimited Palonia Points on everyday purchases, plus Free Night Awards after qualifying spend.
              Designed for travelers who want rich hotel perks without the luxury price tag.
            </p>
            <ul className="list">
              <li>17X total points at Palonia hotels</li>
              <li>3X at gas, grocery & dining; 2X everywhere else</li>
              <li>Automatic Silver Elite status each cardmember year</li>
              <li>15 Elite Night Credits each year</li>
            </ul>
            <p className="terms" style={{ marginTop: 12 }}>
              Benefits vary by card. Enrollment may be required for select benefits. Terms apply.
            </p>
          </div>
          <div>
            <img
              style={{ width: "100%", borderRadius: 16, border: "1px solid var(--line)" }}
              src="https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=1200&auto=format&fit=crop"
              alt="Traveler at a scenic overlook"
            />
          </div>
        </div>
      </section>

      <footer className="container">
        <p>© {year} Palonia Travel Group. Palonia®, Palonia Points®, and the Palonia logo are registered trademarks. This page is a static demo and not a credit application.</p>
      </footer>
    </main>
  );
}
