import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";

type Room = { code: string; name: string; nightlyRate: number; refundable: boolean };
type StayDetail = {
  id: string;
  name: string;
  city: string;
  address?: string;
  nightlyRate: number;
  currency?: string; // don't force "USD"
  refundable?: boolean;
  rating?: number;
  reviews?: number;
  gallery?: string[];
  amenities?: string[];
  description?: string;
  rooms?: Room[];
  fees?: { taxesPct: number; resortFee: number };
};

export default function StayDetail() {
  // Your route is /stay/:id (where :id may be an ID or a slug)
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const guests = params.get("guests") || "1";

  const [loading, setLoading] = useState(true);
  const [stay, setStay] = useState<StayDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roomsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;

    const apiBase = window.location.origin;
    const fetchAndValidate = async (url: string): Promise<StayDetail> => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
        throw new Error("Not found");
      }
      return data as StayDetail;
    };

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Try by ID (original behavior)
        let data: StayDetail | null = null;
        try {
          data = await fetchAndValidate(`${apiBase}/api/stays/${encodeURIComponent(id)}`);
        } catch {
          // 2) Fallback to by-slug
          data = await fetchAndValidate(`${apiBase}/api/stays/by-slug/${encodeURIComponent(id)}`);
        }
        setStay(data);
      } catch (e: any) {
        setError(e.message || "Failed to load stay");
        setStay(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Price calc for the summary card (uses top-level nightlyRate as the reference)
  const price = useMemo(() => {
    const nightly = stay?.nightlyRate ?? 0;
    const taxesPct = stay?.fees?.taxesPct ?? 0;
    const resortFee = stay?.fees?.resortFee ?? 0;
    const taxes = Math.round(nightly * taxesPct * 100) / 100;
    const totalTonight = Math.round((nightly + resortFee + taxes) * 100) / 100;
    return { nightly, taxes, resortFee, totalTonight };
  }, [stay]);

  const scrollToRooms = () => roomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-6">Loading…</div>;
  }
  if (error || !stay) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-xl bg-red-50 p-6 text-red-700 shadow">
          {error || "Not found"}
        </div>
        <div className="mt-4">
          <Link className="text-indigo-600 hover:underline" to="/search">Back to results</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-3">
        <Link
          to={`/search?location=${encodeURIComponent(stay.city)}&guests=${encodeURIComponent(guests)}`}
          className="text-indigo-600 hover:underline"
        >
          ← See all properties
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Gallery */}
        <div className="md:col-span-2">
          <div className="grid grid-cols-4 gap-2">
            <img
              src={stay.gallery?.[0] || "/images/seattle.jpg"}
              className="col-span-4 h-64 w-full rounded-xl object-cover md:col-span-3 md:h-96"
              alt={stay.name}
            />
            <div className="col-span-4 grid grid-cols-4 gap-2 md:col-span-1 md:grid-cols-1">
              {(stay.gallery || []).slice(1, 5).map((src, i) => (
                <img key={i} src={src} className="h-24 w-full rounded-xl object-cover md:h-[92px]" />
              ))}
            </div>
          </div>
        </div>

        {/* Summary card */}
        <aside className="md:col-span-1">
          <div className="rounded-2xl bg-white p-4 shadow">
            <div className="text-sm text-gray-600">{stay.city}</div>
            <h1 className="text-xl font-semibold text-gray-900">{stay.name}</h1>

            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                {stay.refundable ? "Fully refundable" : "Rules apply"}
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-700">{(stay.rating ?? 8.8).toFixed(1)} rating</span>
            </div>

            <div className="mt-4">
              <div className="text-xl font-bold text-gray-900">${price.nightly.toLocaleString()}</div>
              <div className="text-xs text-gray-500">nightly rate</div>
              <div className="mt-2 text-sm text-gray-600">
                Est. tonight:{" "}
                <span className="font-semibold text-gray-900">
                  ${price.totalTonight.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={scrollToRooms}
              className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
            >
              Select a room
            </button>

            <div className="mt-4 text-sm text-gray-700">
              <div className="font-medium">Explore the area</div>
              <div className="rounded-lg bg-gray-100 p-3 text-center text-xs text-gray-500">
                Map placeholder
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Tabs-ish sections */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <section className="md:col-span-2 rounded-2xl bg-white p-5 shadow">
          <div className="mb-3 flex gap-4 text-sm">
            <span className="border-b-2 border-indigo-600 pb-1 font-medium text-indigo-700">Overview</span>
            <span className="text-gray-500">Rooms</span>
            <span className="text-gray-500">Policies</span>
          </div>

          <p className="text-gray-700">{stay.description}</p>

          <div className="mt-4">
            <div className="font-medium text-gray-900">Amenities</div>
            <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700 md:grid-cols-3">
              {(stay.amenities || []).map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Rooms (Checkout links live here) */}
        <section ref={roomsRef} className="md:col-span-1 rounded-2xl bg-white p-5 shadow">
          <div className="mb-2 font-medium text-gray-900">Available rooms</div>
          <ul className="space-y-3">
            {(stay.rooms || []).map((r) => {
              const to = `/checkout?stay=${encodeURIComponent(stay.id)}&room=${encodeURIComponent(
                r.code
              )}&guests=${encodeURIComponent(guests)}`;

              return (
                <li key={r.code} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-emerald-700">
                        {r.refundable ? "Fully refundable" : "Rules apply"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        ${r.nightlyRate.toLocaleString()}
                      </div>
                      <Link
                        to={to}
                        className="mt-1 inline-block rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        Select
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
