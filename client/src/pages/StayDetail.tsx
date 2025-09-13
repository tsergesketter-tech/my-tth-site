// src/pages/StayDetail.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useSearch } from "../context/SearchContext";
import { usePointsSimulation } from "../hooks/usePointsSimulation";
import EstimatedPoints from "../components/EstimatedPoints";
import { useMCP } from "../hooks/useMCP";
import { PersonalizationZone } from "../components/personalization/PersonalizationZone";

type Room = { code: string; name: string; nightlyRate: number; refundable: boolean };
type StayDetail = {
  id: string;
  name: string;
  city: string;
  address?: string;
  nightlyRate: number;
  currency?: string; // e.g., "USD"
  refundable?: boolean;
  rating?: number;
  reviews?: number;
  gallery?: string[];
  amenities?: string[];
  description?: string;
  rooms?: Room[];
  // Assumption: resortFee is per-night (common). Adjust if per-stay.
  fees?: { taxesPct: number; resortFee: number };
};

export default function StayDetail() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const { search } = useSearch();
  
  // MCP tracking
  const { trackEvent, isReady } = useMCP({ autoInit: true });

  // Pull guests + nights from URL → context → fallback
  const guests = params.get("guests") || (search.guests ? String(search.guests) : "1");
  const nightsFromUrl = Number(params.get("nights"));
  const nights = Number.isFinite(nightsFromUrl) && nightsFromUrl > 0 ? nightsFromUrl : (search.nights ?? 1);

  // Date helpers
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (baseISO: string, n: number) => {
    const d = new Date(baseISO || iso(new Date()));
    d.setDate(d.getDate() + n);
    return iso(d);
  };

  // Prefer URL → context → fallback(today / today+nights)
  const urlCheckIn = params.get("checkIn") || "";
  const urlCheckOut = params.get("checkOut") || "";
  const ctxCheckIn = (search as any)?.checkIn || "";
  const ctxCheckOut = (search as any)?.checkOut || "";

  const checkInISO = urlCheckIn || ctxCheckIn || iso(new Date());
  const checkOutISO = urlCheckOut || ctxCheckOut || addDays(checkInISO, Math.max(1, nights));

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

        // Try by ID, fall back to slug
        let data: StayDetail | null = null;
        try {
          data = await fetchAndValidate(`${apiBase}/api/stays/${encodeURIComponent(id)}`);
        } catch {
          data = await fetchAndValidate(`${apiBase}/api/stays/by-slug/${encodeURIComponent(id)}`);
        }
        setStay(data);
        
        // Track stay view event
        if (isReady && data) {
          trackEvent({
            type: 'viewStay',
            data: {
              stayId: data.id,
              stayName: data.name,
              city: data.city,
              nightlyRate: data.nightlyRate,
              currency: data.currency || 'USD',
              category: 'accommodation',
              rating: data.rating,
              checkIn: checkInISO,
              checkOut: checkOutISO,
              nights: nights,
              guests: Number(guests),
            },
          });
        }
      } catch (e: any) {
        setError(e.message || "Failed to load stay");
        setStay(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Price calc using top-level nightlyRate
  const price = useMemo(() => {
    const nightly = stay?.nightlyRate ?? 0;
    const taxesPct = stay?.fees?.taxesPct ?? 0;
    const resortFeePerNight = stay?.fees?.resortFee ?? 0;

    const subtotalNights = nightly * nights;
    const resortFees = resortFeePerNight * nights; // per-night fee
    const taxes = +(subtotalNights * taxesPct).toFixed(2);
    const total = +(subtotalNights + resortFees + taxes).toFixed(2);

    return {
      nightly,
      nights,
      taxesPct,
      resortFeePerNight,
      subtotalNights,
      resortFees,
      taxes,
      total,
    };
  }, [stay, nights]);

  const currency = stay?.currency || "USD";
  const fmt = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency });

  // --- Estimated Points (Simulation) — keep hooks ABOVE early returns ---
  const membershipNumber = "DL12345"; // swap to session/context when ready
  const program = "Cars and Stays by Delta";

  const simInput = useMemo(() => {
    if (!stay || !stay.nightlyRate || !checkInISO || !checkOutISO) return [];
    return [
      {
        stayId: stay.id,
        propertyName: stay.name,
        city: stay.city,
        checkInISO,
        checkOutISO,
        nightlyRate: stay.nightlyRate,
        currency: stay.currency ?? "USD",
        nights,
      },
    ];
  }, [stay?.id, stay?.name, stay?.city, stay?.nightlyRate, stay?.currency, checkInISO, checkOutISO, nights]);

  const { loading: simLoading, getEstimate, error: simError } = usePointsSimulation({
    stays: simInput,
    program,
    membershipNumber,
    maxBatch: 1,
  });
  const estimate = simInput.length ? getEstimate(simInput[0]) : null;

  const scrollToRooms = () =>
    roomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Early returns (no hooks below this line)
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
          <Link className="text-indigo-600 hover:underline" to="/search">
            Back to results
          </Link>
        </div>
      </div>
    );
  }

  // Build back link keeping city/guests/nights/dates for continuity
  const backQs = new URLSearchParams();
  if (stay.city) backQs.set("city", stay.city);
  if (guests) backQs.set("guests", guests);
  if (nights) backQs.set("nights", String(nights));
  if (checkInISO) backQs.set("checkIn", checkInISO);
  if (checkOutISO) backQs.set("checkOut", checkOutISO);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-3">
        <Link
          to={`/search?${backQs.toString()}`}
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
                <img
                  key={i}
                  src={src}
                  className="h-24 w-full rounded-xl object-cover md:h-[92px]"
                  alt={`${stay.name} ${i + 2}`}
                />
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
              <span
                className={`rounded-full px-2 py-0.5 ${
                  stay.refundable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                }`}
              >
                {stay.refundable ? "Fully refundable" : "Rules apply"}
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-700">
                {(stay.rating ?? 8.8).toFixed(1)} rating
              </span>
              {!!stay.reviews && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-500">{stay.reviews} reviews</span>
                </>
              )}
            </div>

            <div className="mt-4">
              <div className="text-xl font-bold text-gray-900">
                {fmt(price.nightly)}
              </div>
              <div className="text-xs text-gray-500">per night</div>

              <div className="mt-3 text-sm text-gray-700 space-y-1">
                <div>
                  {fmt(price.nightly)} × {price.nights} night{price.nights > 1 ? "s" : ""} ={" "}
                  <b>{fmt(price.subtotalNights)}</b>
                </div>
                {price.resortFeePerNight > 0 && (
                  <div>
                    Resort fee {fmt(price.resortFeePerNight)} × {price.nights} ={" "}
                    <b>{fmt(price.resortFees)}</b>
                  </div>
                )}
                {price.taxesPct > 0 && (
                  <div>
                    Taxes ({(price.taxesPct * 100).toFixed(1)}%): <b>{fmt(price.taxes)}</b>
                  </div>
                )}
                <div className="pt-1 border-t border-gray-200">
                  Est. total: <span className="font-semibold">{fmt(price.total)}</span>
                </div>
              </div>

              {/* Estimated Points pill */}
              <div className="mt-3">
                <EstimatedPoints byCurrency={estimate} preferred={["Miles", "MQDs", "PTS"]} loading={simLoading && !estimate}/>
                {simError && (
                  <div className="mt-2 text-xs text-yellow-800 bg-yellow-50 inline-block px-2 py-1 rounded">
                    Points estimate unavailable right now.
                  </div>
                )}
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
            <span className="border-b-2 border-indigo-600 pb-1 font-medium text-indigo-700">
              Overview
            </span>
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
              // Room totals (per-night price × nights)
              const roomSubtotal = r.nightlyRate * nights;
              const roomResortFees = (stay.fees?.resortFee ?? 0) * nights;
              const roomTaxes = +(roomSubtotal * (stay.fees?.taxesPct ?? 0)).toFixed(2);
              const roomTotal = +(roomSubtotal + roomResortFees + roomTaxes).toFixed(2);

              const qs = new URLSearchParams({
                stay: stay.id,
                room: r.code,
                guests,
                nights: String(nights),
                checkIn: checkInISO || "",
                checkOut: checkOutISO || "",
              });

              return (
                <li key={r.code} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-emerald-700">
                        {r.refundable ? "Fully refundable" : "Rules apply"}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {fmt(r.nightlyRate)} / night • est. total {fmt(roomTotal)} for {nights} night{nights > 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {fmt(r.nightlyRate)}
                      </div>
                      <Link
                        to={`/checkout?${qs.toString()}`}
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

