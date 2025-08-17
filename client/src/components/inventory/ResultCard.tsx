// src/components/inventory/ResultCard.tsx
import React, { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSearch } from "../../context/SearchContext";
import { usePointsSimulation } from "../../hooks/usePointsSimulation";
import EstimatedPoints from "../EstimatedPoints";

type Stay = {
  id: string;
  slug?: string;
  name: string;
  city?: string;
  nightlyRate?: number;
  currency?: string;
  thumbnailUrl?: string;
  refundable?: boolean;
  rating?: number;
  reviews?: number;
};

type Props = {
  stay: Stay;
  guests?: string | number; // optional override
  nights?: number;          // optional override
  // NEW (optional to keep callers flexible)
  membershipNumber?: string;
  program?: string;
  dates?: { checkInISO?: string; checkOutISO?: string };
};

export default function ResultCard({
  stay,
  guests: guestsProp,
  nights: nightsProp,
  membershipNumber = "DL12345",
  program = "Cars and Stays by Delta",
  dates
}: Props) {
  const { search } = useSearch();
  const [params] = useSearchParams();

  // Read from props → URL → context → fallback
  const guestsFromUrl = params.get("guests");
  const guests =
    (guestsProp !== undefined ? String(guestsProp) : guestsFromUrl) ??
    (search.guests ? String(search.guests) : "1");

  const nightsFromUrl = Number(params.get("nights")) || undefined;
  const nightsNum = nightsProp ?? nightsFromUrl ?? search.nights ?? 1;

  const perNight = typeof stay.nightlyRate === "number" ? stay.nightlyRate : undefined;
  const total = perNight !== undefined ? perNight * nightsNum : undefined;

  const qp = new URLSearchParams();
  if (guests) qp.set("guests", guests);
  if (nightsNum) qp.set("nights", String(nightsNum));
  const href = `/stay/${encodeURIComponent(stay.slug ?? stay.id)}?${qp.toString()}`;

  // ====== Estimated Points (read from shared sim cache) ======
  const checkInISO = dates?.checkInISO || "";
  const checkOutISO = dates?.checkOutISO || "";

  // We only need getEstimate; calling the hook with {stays: []} is fine.
  const { getEstimate } = usePointsSimulation({
    stays: [],
    program,
    membershipNumber, // can be undefined if server uses session
    maxBatch: 0
  });

  const simStay = useMemo(() => {
    if (!checkInISO || !checkOutISO) return null;
    const nightly = typeof stay.nightlyRate === "number" ? stay.nightlyRate : 0;
    return {
      stayId: stay.id,
      propertyName: stay.name,
      city: stay.city || "",
      checkInISO,
      checkOutISO,
      nightlyRate: nightly,
      currency: stay.currency ?? "USD",
      nights: nightsNum
    };
  }, [stay.id, stay.name, stay.city, stay.currency, stay.nightlyRate, checkInISO, checkOutISO, nightsNum]);

  const estimate = simStay ? getEstimate(simStay) : null;

  return (
    <article className="rounded-xl bg-white p-4 shadow flex gap-3">
      {stay.thumbnailUrl && (
        <img
          src={stay.thumbnailUrl}
          alt={stay.name}
          className="h-20 w-20 rounded object-cover"
          loading="lazy"
        />
      )}

      <div className="flex-1">
        <Link to={href} className="block text-lg font-semibold hover:underline">
          {stay.name}
        </Link>

        {stay.city && <div className="text-sm text-gray-600">{stay.city}</div>}

        {perNight !== undefined && (
          <div className="mt-1 text-sm">
            ${perNight.toLocaleString(undefined, { maximumFractionDigits: 0 })} / night
          </div>
        )}

        {typeof stay.rating === "number" && (
          <div className="mt-1 text-xs text-gray-600">
            {stay.rating.toFixed(1)} • {stay.reviews ?? 0} reviews
            {stay.refundable ? " • Free cancellation" : ""}
          </div>
        )}

        {total !== undefined && (
          <div className="mt-2 text-sm">
            Total for {nightsNum} night{nightsNum > 1 ? "s" : ""}: <b>${total.toFixed(2)}</b>
          </div>
        )}

        {/* Estimated Points pill */}
        <div className="mt-2">
          <EstimatedPoints byCurrency={estimate} preferred={["Miles", "MQDs", "PTS"]} />
        </div>
      </div>

      <div className="self-center">
        <Link
          to={href}
          className="rounded-md bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700"
        >
          View details
        </Link>
      </div>
    </article>
  );
}


