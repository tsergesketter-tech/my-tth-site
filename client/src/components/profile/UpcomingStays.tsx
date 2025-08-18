import React from "react";
import { DEMO_TRIPS } from "../../data/memberDemo";

export default function UpcomingStays() {
  const upcoming = DEMO_TRIPS.filter(t => t.status === "Booked" || t.status === "Hold");

  return (
    <div className="rounded-2xl bg-white border shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">Upcoming Stays</h3>
        <div className="text-sm text-gray-500">{upcoming.length} booking{upcoming.length !== 1 ? "s" : ""}</div>
      </div>

      {upcoming.length === 0 ? (
        <div className="text-sm text-gray-600">No upcoming stays. <span className="text-indigo-600 hover:underline cursor-pointer">Find a property</span></div>
      ) : (
        <ul className="space-y-3">
          {upcoming.map(t => (
            <li key={t.id} className="rounded-xl border p-3 flex items-start justify-between">
              <div>
                <div className="font-medium text-gray-900">{t.propertyName}</div>
                <div className="text-sm text-gray-600">{t.city}</div>
                <div className="text-xs text-gray-500">
                  {t.checkInISO && new Date(t.checkInISO).toLocaleDateString()} – {t.checkOutISO && new Date(t.checkOutISO).toLocaleDateString()}
                </div>
                {typeof t.estMiles === "number" && (
                  <div className="text-xs text-emerald-700 mt-1">Est. {t.estMiles.toLocaleString()} miles</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Conf: {t.confirmation}</div>
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">{t.status}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export{};
