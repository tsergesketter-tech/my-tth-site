"use client";
import React, { useState } from "react";

// --- Config ---
const INSTANCE_URL = "https://trailsignup-87374d74afe7a0.my.salesforce.com";
const API_VERSION = "64.0";
const PROGRAM_NAME = "Cars and Stays by Delta";
const PROCESS_NAME = "Get Member Promotions";
const ACCESS_TOKEN = "00DKY00000DQufe!AR4AQDMDGbLOj61wddPSrpoem7meYlLIPp9hE6hoaczt5kiMN9qhfG3lCz7FfOVdF7ZyU1TWuP3YDlRyWYrTF10hkrqQ8lsH"; // ⚠️ Hardcoded for demo

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
      const url = `${INSTANCE_URL}/services/data/v${API_VERSION}/connect/loyalty/programs/${encodeURIComponent(PROGRAM_NAME)}/program-processes/${encodeURIComponent(PROCESS_NAME)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ processParameters: [{ MemberId: memberId }] }),
      });

      const data = await res.json();
      setLastResponse(data);

      if (!res.ok) {
        const msg = data?.[0]?.message || data?.message || `HTTP ${res.status}`;
        setError(msg);
        return;
      }

    const results =
        data?.outputParameters?.outputParameters?.results ??
        data?.outputParameters?.results ??
        data?.results ??
        [];

      const normalized = results.map((it: any, idx: number) => ({
        id: it?.promotionId ?? String(idx),
        name: it?.promotionName ?? "Promotion",
        description: it?.description,
        imageUrl: it?.promotionImageUrl,
        startDate: it?.startDate,
        endDate: it?.endDate,
        eligibility: it?.memberEligibilityCategory,
        enrollmentRequired: it?.promotionEnrollmentRqr,
        _raw: it,
      }));

      setPromos(normalized);
    } catch (e: any) {
      setError(e?.message ?? "Request failed");
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

export{};
