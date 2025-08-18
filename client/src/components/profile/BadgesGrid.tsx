import React from "react";
import { DEMO_BADGES } from "../../data/memberDemo";

export default function BadgesGrid() {
  return (
    <div className="rounded-2xl bg-white border shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">Badges</h3>
        <div className="text-sm text-gray-500">{DEMO_BADGES.length} earned</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {DEMO_BADGES.map(b => (
          <div key={b.id} className="rounded-xl border p-3 bg-gray-50">
            <div className="text-2xl">{b.icon}</div>
            <div className="font-medium text-gray-900">{b.name}</div>
            <div className="text-xs text-gray-500">{new Date(b.earnedOn).toLocaleDateString()}</div>
            {b.description && <div className="text-xs text-gray-600 mt-1">{b.description}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
export{};
