import React, { useMemo, useState } from "react";
import { DEMO_VOUCHERS, type Voucher } from "../../data/memberDemo";

const statusColors: Record<Voucher["status"], string> = {
  Active: "bg-emerald-100 text-emerald-800",
  Used: "bg-gray-100 text-gray-700",
  Expired: "bg-rose-100 text-rose-800",
};

export default function VouchersList() {
  const [show, setShow] = useState<"All" | Voucher["status"]>("All");

  const list = useMemo(() => {
    return show === "All" ? DEMO_VOUCHERS : DEMO_VOUCHERS.filter(v => v.status === show);
  }, [show]);

  return (
    <div className="rounded-2xl bg-white border shadow p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="font-semibold text-gray-900">Vouchers & Certificates</h3>
        <div className="flex gap-2">
          {(["All", "Active", "Used", "Expired"] as const).map(s => (
            <button
              key={s}
              onClick={() => setShow(s as any)}
              className={[
                "px-3 py-1.5 rounded-full text-sm border",
                show === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-3">
        {list.map(v => (
          <li key={v.id} className="rounded-xl border p-3 flex items-start justify-between">
            <div>
              <div className="font-medium text-gray-900">{v.type}</div>
              <div className="text-sm text-gray-600">Code: <span className="font-mono">{v.code}</span></div>
              {typeof v.value === "number" && v.currency && (
                <div className="text-sm text-gray-700">{v.currency} {v.value.toLocaleString()}</div>
              )}
              {v.notes && <div className="text-xs text-gray-500 mt-1">{v.notes}</div>}
            </div>
            <div className="text-right">
              <div className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusColors[v.status]}`}>{v.status}</div>
              <div className="text-xs text-gray-500 mt-1">Expires {new Date(v.expiresOn).toLocaleDateString()}</div>
              <button className="mt-2 text-indigo-600 text-sm hover:underline">View details</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
export{};
