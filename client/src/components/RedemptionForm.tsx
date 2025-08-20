// client/src/components/RedemptionForm.tsx
import React, { useState } from "react";

type RedemptionFormProps = {
  bookingId: string;          // use same id you send on accrual
  maxPoints?: number;         // optional cap (e.g. member balance)
  onPreview?: (points: number) => void; // optional callback for preview/estimate
  onSubmit?: (points: number) => void;  // later will hook to API
};

export default function RedemptionForm({
  bookingId,
  maxPoints,
  onPreview,
  onSubmit,
}: RedemptionFormProps) {
  const [points, setPoints] = useState<number>(0);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    if (!Number.isNaN(val)) {
      setPoints(val);
      onPreview?.(val);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (points <= 0) return;
    onSubmit?.(points);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border p-4 shadow-sm bg-white"
    >
      <div className="font-semibold text-gray-900 mb-2">
        Redeem points for this stay
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={maxPoints}
          value={points}
          onChange={handleChange}
          className="w-32 rounded-md border px-3 py-2"
          placeholder="0"
        />
        <span className="text-sm text-gray-600">points</span>
      </div>
      {maxPoints && (
        <div className="text-xs text-gray-500 mt-1">
          Available balance: {maxPoints.toLocaleString()}
        </div>
      )}
      <button
        type="submit"
        className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700"
        disabled={points <= 0}
      >
        Apply Redemption
      </button>
    </form>
  );
}
