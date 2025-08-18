"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MOCK_PROMOTIONS } from "../../data/mockPromotions";


// ---------- Types ----------
type Promotion = {
  id?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  eligibility?: string;
  enrollmentRequired?: boolean;
  _raw?: any; // passthrough for future mapping
};

type Filters = {
  q: string;
  offerTypes: Set<string>;
  partners: Set<string>;
  earnBuckets: Set<string>;
  enrollOnly: boolean | null; // null = any, true/false = filter
  sort: "relevance" | "endSoon" | "startSoon" | "earnHigh";
};

const PROGRAM_NAME = "Cars and Stays by Delta";

// Placeholder facets you can later populate from SF data
const OFFER_TYPES = [
  "Bonus Points",
  "Double Nights",
  "Partner Offer",
  "Card-Linked",
  "Milestone",
];

const PARTNERS = [
  "Reverie Hotels",
  "Delta",
  "Avis",
  "Dining",
  "Retail",
  "Other",
];

// Earn potential “buckets” (rough heuristics today; wire to real fields later)
const EARN_BUCKETS = ["≤1k", "1k–5k", "5k–20k", "20k+"] as const;

// ---------- Heuristics to fill gaps until backend exposes these ----------
function inferOfferType(p: Promotion): string {
  const hay = `${p.name ?? ""} ${p.description ?? ""}`.toLowerCase();
  if (hay.includes("double night") || hay.includes("double-night"))
    return "Double Nights";
  if (hay.includes("card") || hay.includes("card-linked")) return "Card-Linked";
  if (hay.includes("milestone")) return "Milestone";
  if (hay.includes("partner") || hay.includes("collab")) return "Partner Offer";
  // default
  return "Bonus Points";
}

function inferPartner(p: Promotion): string {
  const hay = `${p.name ?? ""} ${p.description ?? ""}`.toLowerCase();
  if (hay.includes("reverie")) return "Reverie Hotels";
  if (hay.includes("delta")) return "Delta";
  if (hay.includes("avis")) return "Avis";
  if (hay.includes("dining") || hay.includes("restaurant")) return "Dining";
  if (hay.includes("retail") || hay.includes("shop")) return "Retail";
  return "Other";
}

function inferEarnNumber(p: Promotion): number | null {
  // try to capture the largest integer in name/description (e.g., “Earn 3,000 Miles”)
  const hay = `${p.name ?? ""} ${p.description ?? ""}`.replace(/,/g, " ");
  const nums = Array.from(hay.matchAll(/\b(\d{2,})\b/g)).map((m) =>
    parseInt(m[1], 10)
  );
  if (!nums.length) return null;
  return Math.max(...nums);
}

function bucketizeEarn(n: number | null): (typeof EARN_BUCKETS)[number] | null {
  if (n == null) return null;
  if (n <= 1000) return "≤1k";
  if (n <= 5000) return "1k–5k";
  if (n <= 20000) return "5k–20k";
  return "20k+";
}

// ---------- UI ----------
export default function AvailableOffers() {
  const [memberId, setMemberId] = useState("DL12345");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const [filters, setFilters] = useState<Filters>({
    q: "",
    offerTypes: new Set<string>(),
    partners: new Set<string>(),
    earnBuckets: new Set<string>(),
    enrollOnly: null,
    sort: "relevance",
  });

  // Auto-load on mount
  useEffect(() => {
    fetchPromotions(memberId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPromotions(member: string) {
    setLoading(true);
    setError(null);
    setPromos([]);
    setLastResponse(null);
    try {
      const res = await fetch("/api/loyalty/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member, program: PROGRAM_NAME }),
      });
      const data = await res.json();
      setLastResponse(data);

      if (!res.ok) {
        const msg = data?.message || data?.[0]?.message || `HTTP ${res.status}`;
        setError(msg);
        return;
      }

      const results: Promotion[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];

      const combined = [...results, ...MOCK_PROMOTIONS];
      setPromos(combined);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setFilters({
      q: "",
      offerTypes: new Set(),
      partners: new Set(),
      earnBuckets: new Set(),
      enrollOnly: null,
      sort: "relevance",
    });
  }

  // Decorate promos with inferred fields for filtering/sorting today
  const decorated = useMemo(() => {
    return promos.map((p) => {
      const type = inferOfferType(p);
      const partner = inferPartner(p);
      const earn = inferEarnNumber(p);
      const earnBucket = bucketizeEarn(earn);
      return { ...p, __type: type, __partner: partner, __earn: earn, __earnBucket: earnBucket };
    });
  }, [promos]);

  // Apply filters
  const filtered = useMemo(() => {
    let list = decorated;

    // search
    const q = filters.q.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = `${p.name ?? ""} ${p.description ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // offer type
    if (filters.offerTypes.size) {
      list = list.filter((p) => filters.offerTypes.has(p.__type));
    }

    // partner
    if (filters.partners.size) {
      list = list.filter((p) => filters.partners.has(p.__partner));
    }

    // earn potential
    if (filters.earnBuckets.size) {
      list = list.filter((p) => p.__earnBucket && filters.earnBuckets.has(p.__earnBucket));
    }

    // enrollment flag
    if (filters.enrollOnly !== null) {
      list = list.filter((p) => Boolean(p.enrollmentRequired) === filters.enrollOnly);
    }

    // sorting
    switch (filters.sort) {
      case "endSoon":
        list = [...list].sort((a, b) => (new Date(a.endDate ?? 8640000000000000).getTime()) - (new Date(b.endDate ?? 8640000000000000).getTime()));
        break;
      case "startSoon":
        list = [...list].sort((a, b) => (new Date(a.startDate ?? 8640000000000000).getTime()) - (new Date(b.startDate ?? 8640000000000000).getTime()));
        break;
      case "earnHigh":
        list = [...list].sort((a, b) => (b.__earn ?? -1) - (a.__earn ?? -1));
        break;
      default:
        // relevance: keep original order from API
        break;
    }

    return list;
  }, [decorated, filters]);

  const selectedCount =
    filters.offerTypes.size +
    filters.partners.size +
    filters.earnBuckets.size +
    (filters.enrollOnly !== null ? 1 : 0) +
    (filters.q ? 1 : 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Available Offers</h1>
        <p className="text-gray-600">
          Personalized promotions for your program: <b>{PROGRAM_NAME}</b>
        </p>
      </header>

      {/* Controls Row */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label htmlFor="memberId" className="text-sm mb-1 font-medium block">
            Member ID
          </label>
          <div className="flex gap-2">
            <input
              id="memberId"
              type="text"
              className="border px-3 py-2 rounded-md text-sm w-full"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            />
            <button
              onClick={() => fetchPromotions(memberId)}
              disabled={loading || !memberId}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="md:w-[340px]">
          <label className="text-sm mb-1 font-medium block">Search</label>
          <input
            type="search"
            placeholder="Search promotions…"
            className="border px-3 py-2 rounded-md text-sm w-full"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>

        <div className="md:w-[220px]">
          <label className="text-sm mb-1 font-medium block">Sort</label>
          <select
            className="border px-3 py-2 rounded-md text-sm w-full"
            value={filters.sort}
            onChange={(e) =>
              setFilters((f) => ({ ...f, sort: e.target.value as Filters["sort"] }))
            }
          >
            <option value="relevance">Relevance</option>
            <option value="endSoon">Ending soon</option>
            <option value="startSoon">Starting soon</option>
            <option value="earnHigh">Highest earn</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Filter Rail */}
        <aside className="md:col-span-3">
          <div className="rounded-2xl bg-white p-4 shadow border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Filters</h2>
              {selectedCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Clear ({selectedCount})
                </button>
              )}
            </div>

            {/* Offer Type */}
            <FilterGroup
              title="Offer Type"
              options={OFFER_TYPES}
              selected={filters.offerTypes}
              onToggle={(val) =>
                setFilters((f) => toggleSetFilter(f, "offerTypes", val))
              }
            />

            {/* Partner */}
            <FilterGroup
              title="Partner"
              options={PARTNERS}
              selected={filters.partners}
              onToggle={(val) =>
                setFilters((f) => toggleSetFilter(f, "partners", val))
              }
            />

            {/* Earn Potential */}
            <FilterGroup
              title="Earn Potential"
              options={[...EARN_BUCKETS]}
              selected={filters.earnBuckets}
              onToggle={(val) =>
                setFilters((f) => toggleSetFilter(f, "earnBuckets", val))
              }
            />

            {/* Enrollment */}
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Enrollment</div>
              <div className="flex gap-2">
                <button
                  className={pill(filters.enrollOnly === null)}
                  onClick={() =>
                    setFilters((f) => ({ ...f, enrollOnly: null }))
                  }
                >
                  Any
                </button>
                <button
                  className={pill(filters.enrollOnly === true)}
                  onClick={() =>
                    setFilters((f) => ({ ...f, enrollOnly: true }))
                  }
                >
                  Required
                </button>
                <button
                  className={pill(filters.enrollOnly === false)}
                  onClick={() =>
                    setFilters((f) => ({ ...f, enrollOnly: false }))
                  }
                >
                  Not required
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <section className="md:col-span-9">
          {/* States */}
          {error && (
            <div className="rounded-xl bg-red-50 text-red-700 p-4 border border-red-200">
              {error}
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              hasFilters={selectedCount > 0 || Boolean(filters.q)}
              onClear={resetFilters}
            />
          )}

          {/* Grid */}
          {!loading && !error && filtered.length > 0 && (
            <>
              <div className="text-sm text-gray-600 mb-3">
                Showing <b>{filtered.length}</b> of {promos.length} promotions
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p) => (
                  <PromoCard key={p.id ?? p.name} p={p as any} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Debug (optional) */}
      {/* <pre className="mt-8 text-xs text-gray-500 overflow-auto">
        {JSON.stringify(lastResponse, null, 2)}
      </pre> */}
    </div>
  );
}

// ---------- Helpers & subcomponents ----------
function toggleSetFilter<T extends keyof Filters>(
  f: Filters,
  key: T,
  value: string
): Filters {
  const next = new Set((f[key] as unknown as Set<string>) ?? []);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return { ...f, [key]: next } as Filters;
}

function pill(active: boolean) {
  return [
    "px-3 py-1.5 rounded-full text-sm border",
    active
      ? "bg-indigo-600 text-white border-indigo-600"
      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
  ].join(" ");
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="mt-4">
      <div className="text-sm font-medium mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = selected.has(opt);
          return (
            <button
              key={opt}
              type="button"
              className={[
                "px-3 py-1.5 rounded-full text-sm border",
                isActive
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
              ].join(" ")}
              onClick={() => onToggle(opt)}
              aria-pressed={isActive}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="w-full h-40 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="flex gap-2 pt-2">
          <div className="h-6 bg-gray-200 rounded w-24" />
          <div className="h-6 bg-gray-200 rounded w-20" />
          <div className="h-6 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-200 p-8 text-center">
      <div className="text-lg font-semibold text-gray-900 mb-1">
        {hasFilters ? "No offers match your filters" : "No promotions yet"}
      </div>
      <p className="text-gray-600">
        {hasFilters
          ? "Try removing some filters or searching again."
          : "When promotions are available for this member, they’ll appear here."}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function PromoCard({ p }: { p: Promotion & any }) {
  const starts =
    p.startDate && new Date(p.startDate).toLocaleDateString(undefined);
  const ends = p.endDate && new Date(p.endDate).toLocaleDateString(undefined);

  // chips
  const chips: string[] = [];
  if (p.__type) chips.push(p.__type);
  if (p.__partner) chips.push(p.__partner);
  if (p.__earnBucket) chips.push(`${p.__earnBucket} earn`);
  if (p.enrollmentRequired) chips.push("Enrollment required");

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col">
      {p.imageUrl ? (
        <img
          src={p.imageUrl}
          alt={p.name ?? "Promotion image"}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-indigo-100 to-purple-100" />
      )}

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold mb-1 line-clamp-2">
          {p.name ?? "Promotion"}
        </h3>
        {p.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-3">
            {p.description}
          </p>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {chips.map((c) => (
              <span
                key={c}
                className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-auto">
          {starts && <span>Starts: {starts}</span>}
          {starts && ends && <span> • </span>}
          {ends && <span>Ends: {ends}</span>}
        </div>
      </div>

      <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
        <button className="text-indigo-600 text-sm font-medium hover:underline">
          View details
        </button>
        <button className="bg-indigo-600 text-white text-sm font-semibold px-3 py-1.5 rounded-md hover:bg-indigo-700">
          Enroll
        </button>
      </div>
    </div>
  );
}

export {};
