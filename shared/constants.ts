// shared/constants.ts - Configurable values for the loyalty program

// ===== POINT REDEMPTION CONFIGURATION =====

/**
 * Point value in USD cents (1 cent = $0.01)
 * Change this value to adjust how much each point is worth
 * 
 * Examples:
 * - 1 = 1 cent per point ($0.01)
 * - 2 = 2 cents per point ($0.02) 
 * - 0.5 = 0.5 cents per point ($0.005)
 */
export const POINT_VALUE_CENTS = 1;

/**
 * Point value in USD dollars (derived from POINT_VALUE_CENTS)
 * This is calculated automatically - don't change this directly
 */
export const POINT_VALUE_USD = POINT_VALUE_CENTS / 100;

/**
 * Minimum points required for redemption
 */
export const MIN_REDEMPTION_POINTS = 100;

/**
 * Maximum points that can be redeemed in a single transaction
 * Set to null for no limit
 */
export const MAX_REDEMPTION_POINTS = 100000;

/**
 * Convert points to USD dollar amount
 */
export function pointsToUSD(points: number): number {
  return +(points * POINT_VALUE_USD).toFixed(2);
}

/**
 * Convert USD dollar amount to points
 */
export function usdToPoints(usd: number): number {
  return Math.floor(usd / POINT_VALUE_USD);
}

/**
 * Format points as currency string
 */
export function formatPointsAsCurrency(points: number, currency = 'USD'): string {
  const amount = pointsToUSD(points);
  return amount.toLocaleString(undefined, { 
    style: 'currency', 
    currency 
  });
}

// ===== LOYALTY PROGRAM CONFIGURATION =====

/**
 * Default membership number for demo purposes
 */
export const DEFAULT_DEMO_MEMBERSHIP = "DL12345";

/**
 * Default loyalty program name
 */
export const DEFAULT_PROGRAM_NAME = "Cars and Stays by Delta";