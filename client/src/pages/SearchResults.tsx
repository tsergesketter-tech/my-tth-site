import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import ResultCard from "../components/inventory/ResultCard";

type Stay = {
  id: string;
  name: string;
  city: string;
  nightlyRate: number;
  currency: "USD";
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

  // Raw strings from URL
  const rawLocation = useMemo(() => params.get("location") || "", [params]);
  const guests = useMemo(() => params.get("guests") || "1", [params]);

  // Normalize: keep only the city (before first comma)
  const city = useMemo(
    () => rawLocation.split(",")[0].trim(),
    [rawLocation]
  );

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (!city) {
          setStays([]);
          return;
        }
        const qs = new URLSearchParams({ location: city });
        const apiBase = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${apiBase}/api/stays/search?${qs.toString()}`;

        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStays(data.results || []);
      } catch (e: any) {
        console.error("Search load failed:", e);
        setError(e.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [city]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {city ? `Stays in ${city}` : "Search results"}
          </h1>
          <p className="text-sm text-gray-600">{guests} guest(s)</p>
        </div>
        <Link to="/" className="text-indigo-600 hover:underline">
          Modify search
        </Link>
      </div>

      {loading && (
        <div className="rounded-xl bg-white p-6 shadow">Loading results…</div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-6 text-red-700 shadow">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
{stays.length === 0 ? (
  <div className="rounded-xl bg-white p-6 text-gray-600 shadow">
    No results found. Try a different location.
  </div>
) : (
  stays.map((s) => <ResultCard key={s.id} stay={s} guests={guests} />)
)}
        </div>
      )}
    </div>
  );
}
