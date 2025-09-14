// client/src/components/PromotionDisplay.tsx
import React from 'react';
import type { PromotionDiscount } from '../utils/eligiblePromotionsApi';

interface PromotionDisplayProps {
  promotions: PromotionDiscount[];
  appliedPromotions?: PromotionDiscount[];
  originalAmount: number;
  finalAmount: number;
  totalDiscount: number;
  loading?: boolean;
  className?: string;
}

export default function PromotionDisplay({
  promotions,
  appliedPromotions = [],
  originalAmount,
  finalAmount,
  totalDiscount,
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
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-green-800 mb-2">
            🎉 Promotions Available
          </h3>

          {/* Applied Promotions */}
          {appliedPromotions.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-green-700 mb-1">Applied:</h4>
              {appliedPromotions.map((promo, index) => (
                <div key={index} className="flex items-center justify-between bg-green-100 rounded px-2 py-1 mb-1">
                  <span className="text-xs text-green-800 font-medium">
                    {promo.promotionName}
                  </span>
                  <span className="text-xs text-green-800 font-bold">
                    -{formatDiscount(promo)}
                  </span>
                </div>
              ))}
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
        </div>

        {/* Savings Summary */}
        {totalDiscount > 0 && (
          <div className="ml-4 text-right">
            <div className="text-xs text-green-700">You Save</div>
            <div className="text-lg font-bold text-green-800">
              ${totalDiscount.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      {totalDiscount > 0 && (
        <div className="mt-3 pt-3 border-t border-green-200">
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
    return `${promo.discountValue} points`;
  }

  // Fallback to discount amount if type is unclear
  return `$${(promo.discountAmount || 0).toFixed(2)} off`;
}