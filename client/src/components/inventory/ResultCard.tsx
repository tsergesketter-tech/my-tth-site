// src/components/inventory/ResultCard.tsx
import { Link } from "react-router-dom";
import React from "react";

type Stay = {
  id: string;
  slug?: string;
  name: string;
  city?: string;
  nightlyRate?: number;
  thumbnailUrl?: string;
  refundable?: boolean;
  rating?: number;
  reviews?: number;
};

type Props = {
  stay: Stay;
  guests?: string; // <-- add this
};

export default function ResultCard({ stay, guests = "1" }: Props) {
  const href = `/stay/${encodeURIComponent(stay.slug ?? stay.id)}?guests=${encodeURIComponent(
    guests
  )}`;

  return (
    <article className="rounded-xl bg-white p-4 shadow flex gap-3">
      {stay.thumbnailUrl && (
        <img src={stay.thumbnailUrl} alt="" className="h-20 w-20 rounded object-cover" />
      )}
      <div className="flex-1">
        <Link to={href} className="block text-lg font-semibold hover:underline">
          {stay.name}
        </Link>
        {stay.city && <div className="text-sm text-gray-600">{stay.city}</div>}
        {typeof stay.nightlyRate === "number" && (
          <div className="mt-1 text-sm">${stay.nightlyRate.toLocaleString()} / night</div>
        )}
        {typeof stay.rating === "number" && (
          <div className="mt-1 text-xs text-gray-600">
            {stay.rating.toFixed(1)} • {stay.reviews ?? 0} reviews
          </div>
        )}
      </div>
      <div className="self-center">
        <Link to={href} className="rounded-md bg-indigo-600 px-3 py-1 text-white">
          View details
        </Link>
      </div>
    </article>
  );
}

