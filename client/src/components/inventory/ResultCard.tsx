// client/src/components/inventory/ResultCard.tsx
import React from "react";
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
  guests?: string | number;  // optional override
  nights?: number;           // optional override
  membershipNumber: string;
  program: string;
  dates?: { checkInISO?: string; checkOutISO?: string };
};

export default function ResultCard({
  stay,
  guests: guestsProp,
  nights: nightsProp,
  membershipNumber,
  program,
  dates,
}: Props) {
  const { search } = useSearch();
  const [params] = useSearchParams();

  // Read from props → URL → context → fallback
  const guestsFromUrl = params.get("guests");
  const guests =
    (guestsProp !== undefined ? String(guestsProp) : guestsFromUrl) ??
    (search.guests ? String(search.guests) : "1");

  const nightsFromUrl = Number(params.get("nights")) || undefined;
  const nights = nightsProp ?? nightsFromUrl ?? search.nights ?? 1;

  const perNight = typeof stay.nightlyRate === "number" ? stay.nightlyRate : undefined;
  const total = perNight !== undefined ? perNight * nights : undefined;

  // Build href (propagate dates if provided)
  const qp = new URLSearchParams();
  if (guests) qp.set("guests", guests);
  if (nights) qp.set("nights", String(nights));
  if (dates?.checkInISO) qp.set("checkIn", dates.checkInISO);
  if (dates?.checkOutISO) qp.set("checkOut", dates.checkOutISO);

  const href = `/stay/${encodeURIComponent(stay.slug ?? stay.id)}?${qp.toString()}`;

  // ---- Simulation (single-stay) ----
  const simStay =
    dates?.checkInISO && dates?.checkOutISO && typeof perNight === "number"
      ? {
          stayId: stay.id,
          propertyName: stay.name,
          city: stay.city,
          checkInISO: dates.checkInISO,
          checkOutISO: dates.checkOutISO,
          nightlyRate: perNight,
          currency: stay.currency ?? "USD",
          nights,
        }
      : null;

  const { loading: simLoading, getEstimate } = usePointsSimulation({
    stays: simStay ? [simStay] : [],
    program,
    membershipNumber,
    maxBatch: 1,
  });

  const estimate = simStay ? getEstimate(simStay) : null;
  const isSimLoading = simLoading && !estimate;

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
            Total for {nights} night{nights > 1 ? "s" : ""}:{" "}
            <b>${total.toFixed(2)}</b>
          </div>
        )}

        {/* Estimated Points pill (with shimmer while loading) */}
        <div className="mt-2">
          <EstimatedPoints
            byCurrency={estimate}
            preferred={["Miles", "MQDs", "PTS"]}
            loading={isSimLoading}
          />
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



