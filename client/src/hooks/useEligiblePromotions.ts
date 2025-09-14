// client/src/hooks/useEligiblePromotions.ts
import { useState, useEffect, useCallback } from 'react';
import {
  getEligiblePromotions,
  createCartRequestFromStay,
  applyBestPromotions,
  type EligiblePromotionsRequest,
  type EligiblePromotionsResponse,
  type PromotionDiscount
} from '../utils/eligiblePromotionsApi';

interface UseEligiblePromotionsOptions {
  membershipNumber?: string;
  autoFetch?: boolean;
  debugMode?: boolean;
}

interface PromotionCalculation {
  originalAmount: number;
  totalDiscount: number;
  finalAmount: number;
  appliedPromotions: PromotionDiscount[];
  eligiblePromotions: PromotionDiscount[];
}

export function useEligiblePromotions(options: UseEligiblePromotionsOptions = {}) {
  const {
    membershipNumber = 'DL12345',
    autoFetch = false,
    debugMode = false
  } = options;

  const [promotions, setPromotions] = useState<PromotionDiscount[]>([]);
  const [calculation, setCalculation] = useState<PromotionCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<EligiblePromotionsRequest | null>(null);

  const fetchPromotions = useCallback(async (cartRequest: EligiblePromotionsRequest) => {
    try {
      setLoading(true);
      setError(null);
      setLastRequest(cartRequest);

      if (debugMode) {
        console.log('[useEligiblePromotions] Fetching promotions for cart:', cartRequest);
      }

      const response: EligiblePromotionsResponse = await getEligiblePromotions(cartRequest);

      const eligiblePromotions = response.eligiblePromotions || [];
      const originalAmount = cartRequest.cart.cartDetails[0]?.transactionAmount || 0;

      // Calculate best promotion application
      const promotionResult = applyBestPromotions(originalAmount, eligiblePromotions);

      const calculation: PromotionCalculation = {
        originalAmount,
        eligiblePromotions,
        ...promotionResult
      };

      setPromotions(eligiblePromotions);
      setCalculation(calculation);

      if (debugMode) {
        console.log('[useEligiblePromotions] Promotion calculation:', calculation);
      }

      return calculation;

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch eligible promotions';
      setError(errorMessage);
      console.error('[useEligiblePromotions] Error:', err);

      // Return empty calculation on error
      const originalAmount = cartRequest.cart.cartDetails[0]?.transactionAmount || 0;
      const fallbackCalculation: PromotionCalculation = {
        originalAmount,
        totalDiscount: 0,
        finalAmount: originalAmount,
        appliedPromotions: [],
        eligiblePromotions: []
      };

      setCalculation(fallbackCalculation);
      return fallbackCalculation;
    } finally {
      setLoading(false);
    }
  }, [debugMode]);

  // Helper to fetch promotions for a specific stay
  const fetchPromotionsForStay = useCallback(async (
    stay: any,
    quantity: number = 1
  ) => {
    const cartRequest = createCartRequestFromStay(stay, membershipNumber, quantity);
    return await fetchPromotions(cartRequest);
  }, [fetchPromotions, membershipNumber]);

  // Helper to refresh last request
  const refresh = useCallback(async () => {
    if (lastRequest) {
      return await fetchPromotions(lastRequest);
    }
    return null;
  }, [fetchPromotions, lastRequest]);

  // Clear promotions
  const clear = useCallback(() => {
    setPromotions([]);
    setCalculation(null);
    setError(null);
    setLastRequest(null);
  }, []);

  // Helper to check if there are any promotions available
  const hasPromotions = promotions.length > 0;
  const hasAppliedPromotions = calculation?.appliedPromotions.length || 0 > 0;
  const totalSavings = calculation?.totalDiscount || 0;

  return {
    // Data
    promotions,
    calculation,
    loading,
    error,

    // Actions
    fetchPromotions,
    fetchPromotionsForStay,
    refresh,
    clear,

    // Computed values
    hasPromotions,
    hasAppliedPromotions,
    totalSavings,

    // Debug info
    lastRequest: debugMode ? lastRequest : undefined
  };
}