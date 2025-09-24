// client/src/components/PromotionDisplay.tsx
import React from 'react';
import type { PromotionDiscount } from '../utils/eligiblePromotionsApi';

interface PromotionDisplayProps {
  promotions: PromotionDiscount[];
  appliedPromotions?: PromotionDiscount[];
  originalAmount: number;
  finalAmount: number;
  totalDiscount: number;
  totalPointsAwarded?: number;
  loading?: boolean;
  className?: string;
}

export default function PromotionDisplay({
  promotions,
  appliedPromotions = [],
  originalAmount,
  finalAmount,
  totalDiscount,
  totalPointsAwarded = 0,
  loading = false,
  className = ""
}: PromotionDisplayProps) {
  if (loading) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2 w-32"></div>
          <div className="h-3 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    );
  }

  if (promotions.length === 0) {
    return null;
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-2 ${className}`}>
      {/* Header with You Save section */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-green-800">
          🎉 Promotions Available
        </h3>

        {/* Savings/Points Summary */}
        {(totalDiscount > 0 || totalPointsAwarded > 0) && (
          <div className="text-right">
            {totalDiscount > 0 && (
              <>
                <div className="text-xs text-green-700">You Save</div>
                <div className="text-lg font-bold text-green-800">
                  ${totalDiscount.toFixed(2)}
                </div>
              </>
            )}
            {totalPointsAwarded > 0 && (
              <>
                <div className="text-xs text-green-700 mt-1">You Earn</div>
                <div className="text-sm font-bold text-green-800">
                  {totalPointsAwarded} pts
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Applied Promotions - Full Width */}
      {appliedPromotions.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-green-700 mb-1">Applied:</h4>
          <div className="space-y-1">
            {appliedPromotions.map((promo, index) => (
              <div key={index} className="grid grid-cols-5 gap-3 bg-green-100 rounded px-2 py-1.5 items-start">
                <span className="text-xs text-green-800 font-medium leading-tight col-span-3">
                  {promo.promotionName}
                </span>
                <span className="text-xs text-green-800 font-bold leading-tight text-right col-span-2">
                  -{formatDiscount(promo)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Eligible Promotions */}
      {promotions.length > appliedPromotions.length && (
        <div>
          <h4 className="text-xs font-medium text-green-700 mb-1">Also Available:</h4>
          {promotions
            .filter(promo => !appliedPromotions.some(applied => applied.promotionId === promo.promotionId))
            .map((promo, index) => (
              <div key={index} className="text-xs text-green-600 mb-1">
                • {promo.promotionName} ({formatDiscount(promo)})
              </div>
            ))}
        </div>
      )}

      {/* Description for applied promotions */}
      {appliedPromotions.length > 0 && appliedPromotions[0].description && (
        <p className="text-xs text-green-600 mt-2 italic">
          {appliedPromotions[0].description}
        </p>
      )}

      {/* Price Breakdown */}
      {totalDiscount > 0 && (
        <div className="mt-2 pt-2 border-t border-green-200">
          <div className="flex justify-between text-xs text-green-700">
            <span>Original Price:</span>
            <span>${originalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-green-700">
            <span>Promotion Discount:</span>
            <span>-${totalDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-green-800 mt-1">
            <span>Final Price:</span>
            <span>${finalAmount.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format discount display
function formatDiscount(promo: PromotionDiscount): string {
  if (promo.discountType === 'PERCENTAGE') {
    return `${promo.discountValue}% off`;
  } else if (promo.discountType === 'FIXED_AMOUNT') {
    return `$${promo.discountValue} off`;
  } else if (promo.discountType === 'POINTS') {
    // Points are auto-redeemed for value, show both points used and dollar value
    const pointsUsed = promo.discountValue;
    const dollarValue = promo.discountAmount.toFixed(2);
    return `${pointsUsed} ${promo.pointsCurrency || 'pts'} redeemed ($${dollarValue} value)`;
  }

  // Fallback to discount amount if type is unclear
  return `$${(promo.discountAmount || 0).toFixed(2)} off`;
}