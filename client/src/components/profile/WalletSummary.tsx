import React from "react";
import { DEMO_WALLET } from "../../data/memberDemo";

export default function WalletSummary() {
  const total = DEMO_WALLET.reduce((acc, w) => acc + w.amount, 0);
  return (
    <div className="rounded-2xl bg-white border shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">Wallet</h3>
        <div className="text-sm text-gray-500">Total: <b>${total.toFixed(0)}</b></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DEMO_WALLET.map((w) => (
          <div key={w.id} className="rounded-lg border p-3 bg-gray-50">
            <div className="text-xs text-gray-500">{w.kind}</div>
            <div className="text-lg font-semibold text-gray-900">
              {w.currency} {w.amount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-700">{w.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
export{};
