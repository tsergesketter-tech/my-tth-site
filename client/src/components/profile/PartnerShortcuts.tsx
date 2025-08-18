import React from "react";

const items = [
  { id: "p1", name: "Reverie Hotels", href: "#", desc: "Book partner stays" },
  { id: "p2", name: "Avis", href: "#", desc: "Car rentals & bonuses" },
  { id: "p3", name: "Dining", href: "#", desc: "Earn with restaurants" },
];

export default function PartnerShortcuts() {
  return (
    <div className="rounded-2xl bg-white border shadow p-4">
      <h3 className="font-semibold text-gray-900 mb-2">Partners</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map(i => (
          <a key={i.id} href={i.href} className="rounded-lg border p-3 bg-gray-50 hover:bg-gray-100 transition">
            <div className="font-medium text-gray-900">{i.name}</div>
            <div className="text-sm text-gray-600">{i.desc}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
export{};
