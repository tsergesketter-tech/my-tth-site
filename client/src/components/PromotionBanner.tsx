// components/PromotionBanner.tsx
import React from "react";
import { useFirstPromotion } from "../hooks/useFirstPromotion";

export default function PromotionBanner() {
  const { promotion, loading, error } = useFirstPromotion();

  if (error) {
    return null; // Don't show anything if there's an error
  }

  if (loading) {
    // Shimmer loading state
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-red-200 rounded-full"></div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-red-200 rounded w-3/4"></div>
            <div className="h-3 bg-red-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!promotion) {
    return null; // Don't show anything if no promotion
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {promotion.name || "Special Promotion"}
          </h3>
          {promotion.description && (
            <p className="text-xs text-red-700 mt-1">
              {promotion.description}
            </p>
          )}
          {promotion.enrollmentRequired && (
            <p className="text-xs text-red-600 mt-1 font-medium">
              Enrollment required
            </p>
          )}
        </div>
      </div>
    </div>
  );
}