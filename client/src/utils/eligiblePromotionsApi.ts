// client/src/utils/eligiblePromotionsApi.ts

export interface CartLineDetail {
  cartLineProductId?: string;
  cartLineProduct?: string;
  cartLineProductCode: string;
  cartLineProductStockKeepingUnit: string;
  cartLineItemQuantity: number;
  cartLineItemAmount: number;
  cartLineProductCatalogId?: string;
  cartLineProductCatalog?: string;
}

export interface CartDetail {
  activityStartDate: string; // ISO date string
  contactId?: string;
  loyaltyProgramMemberId?: string;
  accountId?: string;
  currencyISOCode: string;
  transactionAmount: number;
  membershipNumber: string;
  cartLineDetails: CartLineDetail[];
}

export interface EligiblePromotionsRequest {
  cart: {
    cartDetails: CartDetail[];
  };
}

export interface PromotionDiscount {
  promotionId: string;
  promotionName: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'POINTS';
  discountValue: number;
  discountAmount: number;
  description?: string;
  eligibleCartLines?: number[];
}

export interface EligiblePromotionsResponse {
  eligiblePromotions?: PromotionDiscount[];
  totalDiscountAmount?: number;
  originalAmount?: number;
  finalAmount?: number;
  appliedPromotions?: PromotionDiscount[];
  _meta?: {
    requestedAt: string;
    sourceApi: string;
    apiVersion: string;
  };
}

/**
 * Get eligible promotions for a cart from Salesforce Global Promotions Management
 */
export async function getEligiblePromotions(
  cartRequest: EligiblePromotionsRequest
): Promise<EligiblePromotionsResponse> {
  console.log('[eligiblePromotions] Requesting promotions for cart:', cartRequest);

  const response = await fetch('/api/loyalty/eligible-promotions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(cartRequest),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[eligiblePromotions] API error:', errorData);
    throw new Error(
      errorData.error ||
      errorData.message ||
      `Failed to fetch eligible promotions: ${response.status} ${response.statusText}`
    );
  }

  const promotionsData = await response.json();
  console.log('[eligiblePromotions] Received promotions:', promotionsData);

  return promotionsData;
}

/**
 * Create a cart request from booking/stay data
 */
export function createCartRequestFromStay(
  stay: any,
  membershipNumber: string = 'DL12345',
  quantity: number = 1
): EligiblePromotionsRequest {
  const activityStartDate = stay.checkIn
    ? new Date(stay.checkIn).toISOString()
    : new Date().toISOString();

  return {
    cart: {
      cartDetails: [{
        activityStartDate,
        membershipNumber,
        currencyISOCode: 'USD',
        transactionAmount: stay.pricePerNight * quantity,
        cartLineDetails: [{
          cartLineProduct: stay.name || 'Hotel Stay',
          cartLineProductCode: stay.id || 'HOTEL_STAY',
          cartLineProductStockKeepingUnit: stay.id || 'HOTEL_SKU',
          cartLineItemQuantity: quantity,
          cartLineItemAmount: stay.pricePerNight,
          cartLineProductCatalog: 'Hotels'
        }]
      }]
    }
  };
}

/**
 * Calculate total discount amount from eligible promotions
 */
export function calculateTotalDiscount(promotions: PromotionDiscount[]): number {
  return promotions.reduce((total, promo) => total + (promo.discountAmount || 0), 0);
}

/**
 * Apply the best available promotions to a cart total
 */
export function applyBestPromotions(
  originalAmount: number,
  eligiblePromotions: PromotionDiscount[]
): { finalAmount: number; appliedPromotions: PromotionDiscount[]; totalDiscount: number } {
  // Sort promotions by discount amount descending to get best deals first
  const sortedPromotions = [...eligiblePromotions].sort(
    (a, b) => (b.discountAmount || 0) - (a.discountAmount || 0)
  );

  // For now, apply the single best promotion (can be enhanced for stacking)
  const bestPromotion = sortedPromotions[0];

  if (!bestPromotion) {
    return {
      finalAmount: originalAmount,
      appliedPromotions: [],
      totalDiscount: 0
    };
  }

  const totalDiscount = bestPromotion.discountAmount || 0;
  const finalAmount = Math.max(0, originalAmount - totalDiscount);

  return {
    finalAmount,
    appliedPromotions: [bestPromotion],
    totalDiscount
  };
}