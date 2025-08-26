// client/src/components/RedemptionForm.tsx
import React, { useState } from "react";
import { 
  MIN_REDEMPTION_POINTS, 
  MAX_REDEMPTION_POINTS, 
  pointsToUSD,
  formatPointsAsCurrency
} from "@teddy/shared";

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
  const [error, setError] = useState<string | null>(null);

  // Calculate effective limits
  const effectiveMax = Math.min(
    maxPoints || Number.MAX_SAFE_INTEGER,
    MAX_REDEMPTION_POINTS || Number.MAX_SAFE_INTEGER
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    setError(null);
    
    if (!Number.isNaN(val) && val >= 0) {
      // Enforce maximum limit
      const constrainedVal = Math.min(val, effectiveMax);
      setPoints(constrainedVal);
      onPreview?.(constrainedVal);
      
      // Show validation messages
      if (val > effectiveMax) {
        setError(`Maximum ${effectiveMax.toLocaleString()} points allowed`);
      } else if (val > 0 && val < MIN_REDEMPTION_POINTS) {
        setError(`Minimum ${MIN_REDEMPTION_POINTS.toLocaleString()} points required`);
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (points < MIN_REDEMPTION_POINTS) {
      setError(`Minimum ${MIN_REDEMPTION_POINTS.toLocaleString()} points required`);
      return;
    }
    
    if (points > effectiveMax) {
      setError(`Maximum ${effectiveMax.toLocaleString()} points allowed`);
      return;
    }
    
    setError(null);
    onSubmit?.(points);
  }

  const isValidRedemption = points >= MIN_REDEMPTION_POINTS && points <= effectiveMax;

  return (
    <div className="space-y-3">
      <div className="font-semibold text-gray-900">
        Redeem points for this stay
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={MIN_REDEMPTION_POINTS}
            max={effectiveMax}
            value={points || ''}
            onChange={handleChange}
            className={`w-32 rounded-md border px-3 py-2 ${
              error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'
            }`}
            placeholder={MIN_REDEMPTION_POINTS.toString()}
          />
          <span className="text-sm text-gray-600">points</span>
          
          {points > 0 && (
            <span className="text-sm font-medium text-emerald-600">
              = {formatPointsAsCurrency(points)}
            </span>
          )}
        </div>

        {/* Validation error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
            {error}
          </div>
        )}

        {/* Helper information */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>Min: {MIN_REDEMPTION_POINTS.toLocaleString()} points</div>
          <div>Max: {effectiveMax.toLocaleString()} points</div>
          {maxPoints && (
            <div>Available balance: {maxPoints.toLocaleString()} points</div>
          )}
        </div>

        <button
          type="submit"
          className={`rounded-lg px-4 py-2 text-white font-medium transition-colors ${
            isValidRedemption && !error
              ? 'bg-indigo-600 hover:bg-indigo-700' 
              : 'bg-gray-400 cursor-not-allowed'
          }`}
          disabled={!isValidRedemption || !!error}
        >
          {points > 0 
            ? `Apply ${points.toLocaleString()} Points (${formatPointsAsCurrency(points)})`
            : 'Apply Redemption'
          }
        </button>
      </form>
    </div>
  );
}
