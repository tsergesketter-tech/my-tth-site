"use client";
import React, { useState } from "react";

type Promotion = {
  id?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  eligibility?: string;
  enrollmentRequired?: boolean;
  _raw?: any;
};

const PROGRAM_NAME = "Cars and Stays by Delta"; // optional: make this an input if you want

export default function AvailableOffers() {
  const [memberId, setMemberId] = useState("0lMKY000000LWgz2AG");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const fetchPromotions = async () => {
    setLoading(true);
    setError(null);
    setPromos([]);
    setLastResponse(null);

    try {
      // Single server call; server handles token + SF call + normalization
      const res = await fetch("/api/loyalty/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, program: PROGRAM_NAME }),
      });

      const data = await res.json();
      setLastResponse(data);

      if (!res.ok) {
        const msg =
          data?.message ||
          data?.[0]?.message ||
          `HTTP ${res.status}`;
        setError(msg);
        return;
      }

      // Support either { results: Promotion[] } or Promotion[]
      const results: Promotion[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];

      setPromos(results);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex justify-between items-end mb-6 gap-4">
        <div className="flex flex-col w-full">
          <label htmlFor="memberId" className="text-sm mb-1 font-medium">
            Member ID
          </label>
          <input
            id="memberId"
            type="text"
            className="border px-3 py-2 rounded-md text-sm"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          />
        </div>
        <button
          onClick={fetchPromotions}
          disabled={loading || !memberId}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
        >
          {loading ? "Loading…" : "Fetch Offers"}
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!error && !loading && promos.length === 0 && lastResponse && (
        <p className="text-gray-500">No promotions found for this member.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {promos.map((p) => (
          <div key={p.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
            {p.imageUrl && (
              <img
                src={p.imageUrl}
                alt={p.name ?? "Promotion image"}
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{p.name}</h3>
              {p.description && <p className="text-sm text-gray-600 mb-2">{p.description}</p>}
              <div className="text-xs text-gray-400">
                {p.startDate && `Starts: ${new Date(p.startDate).toLocaleDateString()}`}
                {p.startDate && p.endDate && " • "}
                {p.endDate && `Ends: ${new Date(p.endDate).toLocaleDateString()}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// If your project setup needs it:
export {};
