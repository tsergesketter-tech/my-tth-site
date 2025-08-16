import React from "react";

type Props = {
  stay: {
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
};

export default function ResultCard({ stay }: Props) {
  return (
    <div className="flex gap-4 rounded-2xl bg-white p-3 shadow hover:shadow-md transition">
      <img
        src={stay.thumbnailUrl || "/images/seattle.jpg"}
        alt={stay.name}
        className="h-32 w-48 rounded-xl object-cover"
      />
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{stay.name}</h3>
            <p className="text-sm text-gray-600">{stay.city}</p>
            <div className="mt-1 text-xs text-emerald-700">
              {stay.refundable ? "Fully refundable" : "Rules apply"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900">
              ${stay.nightlyRate.toLocaleString()}/night
            </div>
            <div className="text-xs text-gray-500">includes fees & taxes</div>
          </div>
        </div>
        <div className="mt-3 text-sm text-indigo-700">
          {/* Placeholder for earn estimate; you’ll wire to /api/loyalty/estimate-earn */}
          Estimated points: <span className="font-semibold">—</span>
        </div>
      </div>
    </div>
  );
}
