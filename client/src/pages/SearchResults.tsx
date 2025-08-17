// src/pages/SearchResults.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import ResultCard from "../components/inventory/ResultCard";
import { usePointsSimulation } from "../hooks/usePointsSimulation"; // ⬅ add

type Stay = {
  id: string;
  name: string;
  city: string;
  nightlyRate: number;
  currency?: string; // don't force USD
  thumbnailUrl?: string;
  refundable?: boolean;
  rating?: number;
  reviews?: number;
};

export default function SearchResults() {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [stays, setStays] = useState<Stay[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Accept either ?city= or ?location=
  const rawCityOrLocation = useMemo(
    () => (params.get("city") || params.get("location") || "").trim(),
    [params]
  );
  const guests = useMemo(() => params.get("guests") || "1", [params]);
  const nights = useMemo(() => {
    const n = Number(params.get("nights"));
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [params]);

  // NEW: check-in/out from URL (ISO yyyy-mm-dd)
  const checkInISO = useMemo(() => params.get("checkIn") || "", [params]);
  const checkOutISO = useMemo(() => params.get("checkOut") || "", [params]);

  // Normalize the display/search city (strip ", state, country" if present)
  const city = useMemo(() => {
    const base = rawCityOrLocation;
    return base.includes(",") ? base.split(",")[0].trim() : base;
  }, [rawCityOrLocation]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (!city) {
          setStays([]);
          return;
        }
        const apiBase = window.location.origin;
        const qs = new URLSearchParams({ city, location: city });
        const url = `${apiBase}/api/stays/search?${qs.toString()}`;

        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;

        const results: Stay[] = data.results || data || [];
        setStays(results);
      } catch (e: any) {
        if (mounted) {
          console.error("Search load failed:", e);
          setError(e.message || "Failed to load results");
        }
      } finally {
        mounted && setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [city]);

  const empty = !loading && !error && stays.length === 0;

  // --- Simulation prefetch for top N stays using URL dates ---
  const membershipNumber = "DL12345";                 // swap to your member context
  const program = "Cars and Stays by Delta";          // swap if needed
  const maxBatch = 8;

  const simInput = useMemo(() => {
    // Only build inputs if dates exist; otherwise skip and pills will show "—"
    if (!checkInISO || !checkOutISO) return [];
    return stays.slice(0, maxBatch).map((s) => ({
      stayId: s.id,
      propertyName: s.name,
      city: s.city,
      checkInISO,
      checkOutISO,
      nightlyRate: s.nightlyRate ?? 0,
      currency: s.currency ?? "USD",
      nights,
    }));
  }, [
    checkInISO,
    checkOutISO,
    nights,
    // keep stable by referencing ids only
    JSON.stringify(stays.map((s) => [s.id, s.nightlyRate, s.currency, s.city, s.name])),
  ]);

  const { error: simError } = usePointsSimulation({
    stays: simInput,
    program,
    membershipNumber,
    maxBatch,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {city ? `Stays in ${city}` : "Search results"}
          </h1>
          <p className="text-sm text-gray-600">
            {guests} guest{guests !== "1" ? "s" : ""} • {nights} night{nights > 1 ? "s" : ""}
          </p>
          {checkInISO && checkOutISO && (
            <p className="text-xs text-gray-500">
              {checkInISO} → {checkOutISO}
            </p>
          )}
        </div>
        <Link to="/" className="text-indigo-600 hover:underline" aria-label="Modify search">
          Modify search
        </Link>
      </div>

      {simError && (
        <div className="mb-3 rounded-md bg-yellow-50 p-3 text-yellow-800 text-sm">
          Points estimate unavailable right now.
        </div>
      )}

      {loading && (
        <div className="rounded-xl bg-white p-6 shadow">Loading results…</div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-6 text-red-700 shadow">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {empty ? (
            <div className="rounded-xl bg-white p-6 text-gray-600 shadow">
              No results found. Try a different location.
            </div>
          ) : (
            stays.map((s) => (
              <ResultCard
                key={s.id}
                stay={s}
                guests={guests}
                nights={nights}
                membershipNumber={membershipNumber}
                program={program}
                dates={{ checkInISO, checkOutISO }} // ⬅ pass URL dates down
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
