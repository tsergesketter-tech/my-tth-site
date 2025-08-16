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

  const query = useMemo(() => ({
    location: params.get("location") || "",
    checkIn: params.get("checkIn") || "",
    checkOut: params.get("checkOut") || "",
    guests: params.get("guests") || "1"
  }), [params]);

  useEffect(() => {
    async function run() {
      setLoading(true); setError(null);
      try {
        const q = new URLSearchParams(query as any).toString();
        const res = await fetch(`/api/stays/search?${q}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStays(data.results || []);
      } catch (e:any) {
        setError(e.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [query.location, query.checkIn, query.checkOut, query.guests]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {query.location ? `Stays in ${query.location}` : "Search results"}
          </h1>
          <p className="text-sm text-gray-600">
            {query.checkIn && query.checkOut
              ? `${query.checkIn} → ${query.checkOut} • ${query.guests} guest(s)`
              : `${query.guests} guest(s)`}
          </p>
        </div>
        <Link to="/" className="text-indigo-600 hover:underline">Modify search</Link>
      </div>

      {loading && <div className="rounded-xl bg-white p-6 shadow">Loading results…</div>}
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
            stays.map((s) => <ResultCard key={s.id} stay={s} />)
          )}
        </div>
      )}
    </div>
  );
}
