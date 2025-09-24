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

export interface PromotionBenefit {
  type: string; // 'Discount', 'Points', 'Voucher', 'Badge', 'FreeProduct'
  discountLevel?: string;
  discountType?: string; // 'Amount', 'Percent'
  discountValue?: number;
  points?: string;
  loyaltyProgramCurrencyName?: string;
  voucherDefinition?: string;
  voucherExpiryDate?: string;
  loyaltyProgramBadgeName?: string;
  lineItemid?: string;
  lines?: Array<{ id: string; quantity: number }>;
}

export interface PromotionRule {
  ruleName: string;
  benefits: PromotionBenefit[];
}

export interface PromotionDetails {
  id: string;
  promotionCode?: string;
  displayName: string;
  priority: number;
  currencyCode: string;
  additionalFields?: Record<string, any>;
  rules: PromotionRule[];
}

export interface PromotionDiscount {
  promotionId: string;
  promotionName: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'POINTS';
  discountValue: number;
  discountAmount: number;
  pointsAwarded?: number;
  pointsCurrency?: string;
  description?: string;
  eligibleCartLines?: number[];
}

// Actual Salesforce API response structures
export interface SalesforceRewardDetails {
  discountLevel?: string;
  discountType?: string; // "PercentageOff", "FixedAmountOff", etc.
  discountValue?: string;
  loyaltyProgramCurrencyName?: string;
  points?: string;
}

export interface SalesforceReward {
  rewardType: string; // "ProvideDiscount", "CreditFixedPoints", etc.
  rewardDetails: SalesforceRewardDetails;
}

export interface SalesforcePromotionRule {
  ruleName: string;
  rulePriority: number;
  ruleRewards: SalesforceReward[];
}

export interface SalesforcePromotion {
  promotionId: string;
  displayName: string;
  isAutomatic: boolean;
  currencyIsoCode: string;
  promotionEligibleRules: SalesforcePromotionRule[];
  additionalPromotionFields: Record<string, any>;
  promotionLimits: any[];
}

export interface EligiblePromotionsResponse {
  eligiblePromotions?: PromotionDiscount[];
  totalDiscountAmount?: number;
  totalPointsAwarded?: number;
  originalAmount?: number;
  finalAmount?: number;
  appliedPromotions?: PromotionDiscount[];
  _meta?: {
    requestedAt: string;
    sourceApi: string;
    apiVersion: string;
  };
}

// Salesforce API response format
export interface SalesforcePromotionsResponse {
  eligiblePromotions: SalesforcePromotion[];
  _meta: {
    requestedAt: string;
    sourceApi: string;
    apiVersion: string;
  };
}

/**
 * Transform Salesforce promotion to our PromotionDiscount format
 * Returns an array to support multiple rewards per promotion
 */
function transformSalesforcePromotion(
  sfPromotion: SalesforcePromotion,
  originalAmount: number
): PromotionDiscount[] {
  const discounts: PromotionDiscount[] = [];

  for (const rule of sfPromotion.promotionEligibleRules) {
    for (const reward of rule.ruleRewards) {
      if (reward.rewardType === 'ProvideDiscount') {
        const details = reward.rewardDetails;
        const discountValue = parseFloat(details.discountValue || '0');
        let discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
        let discountAmount: number;

        switch (details.discountType) {
          case 'PercentageOff':
            discountType = 'PERCENTAGE';
            discountAmount = (originalAmount * discountValue) / 100;
            break;
          case 'FixedAmountOff':
            discountType = 'FIXED_AMOUNT';
            discountAmount = discountValue;
            break;
          default:
            console.warn(`Unsupported discount type: ${details.discountType}`);
            continue;
        }

        const discount: PromotionDiscount = {
          promotionId: sfPromotion.promotionId,
          promotionName: sfPromotion.displayName || rule.ruleName || `Promotion ${sfPromotion.promotionId}`,
          discountType,
          discountValue,
          discountAmount: Math.round(discountAmount * 100) / 100,
          description: `${discountValue}${discountType === 'PERCENTAGE' ? '%' : ' USD'} off`
        };

        discounts.push(discount);

      } else if (reward.rewardType === 'CreditFixedPoints') {
        // Points credits are auto-redeemed to reduce cost
        const details = reward.rewardDetails;
        const pointsRedeemed = parseInt(details.points || '0', 10);
        const pointsCurrency = details.loyaltyProgramCurrencyName || 'Miles';

        // Convert points to dollar value (assuming Miles = $0.01 each, adjust as needed)
        const pointValue = pointsCurrency === 'Miles' ? 0.01 : 0.01;
        const pointsDiscountAmount = pointsRedeemed * pointValue;

        const pointsDiscount: PromotionDiscount = {
          promotionId: sfPromotion.promotionId,
          promotionName: sfPromotion.displayName || `Auto-redeem ${pointsRedeemed} ${pointsCurrency}`,
          discountType: 'POINTS',
          discountValue: pointsRedeemed,
          discountAmount: Math.round(pointsDiscountAmount * 100) / 100,
          pointsAwarded: 0, // These are redeemed, not awarded
          pointsCurrency,
          description: `${pointsRedeemed} ${pointsCurrency} auto-redeemed ($${pointsDiscountAmount.toFixed(2)} value)`
        };

        discounts.push(pointsDiscount);
      }
    }
  }

  // Return all discounts found, or a fallback if none
  if (discounts.length > 0) {
    return discounts;
  }

  // Fallback for other reward types
  const firstRule = sfPromotion.promotionEligibleRules[0];
  return [{
    promotionId: sfPromotion.promotionId,
    promotionName: sfPromotion.displayName || firstRule?.ruleName || `Promotion ${sfPromotion.promotionId}`,
    discountType: 'FIXED_AMOUNT',
    discountValue: 0,
    discountAmount: 0,
    description: 'Special promotion benefits available'
  }];
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

  const salesforceResponse: SalesforcePromotionsResponse = await response.json();
  console.log('[eligiblePromotions] Received Salesforce response:', salesforceResponse);

  // Calculate original amount from cart request
  const originalAmount = cartRequest.cart.cartDetails.reduce(
    (total, cart) => total + cart.transactionAmount, 0
  );

  // Transform Salesforce promotions to our format - flatten since each promotion can have multiple rewards
  const eligiblePromotions: PromotionDiscount[] = salesforceResponse.eligiblePromotions.flatMap(
    (sfPromotion) => transformSalesforcePromotion(sfPromotion, originalAmount)
  );



  // Apply best promotion logic
  const { finalAmount, appliedPromotions, totalDiscount } = applyBestPromotions(
    originalAmount,
    eligiblePromotions
  );

  return {
    eligiblePromotions,
    totalDiscountAmount: totalDiscount,
    originalAmount,
    finalAmount,
    appliedPromotions,
    _meta: salesforceResponse._meta
  };
}

/**
 * Map city names to location codes for promotions
 */
function getCityCode(city: string): string {
  const cityMapping: Record<string, string> = {
    'New York': 'NY',
    'Chicago': 'CHI',
    'Seattle': 'SEA',
    'Los Angeles': 'LAX',
    'Miami': 'MIA',
    'Boston': 'BOS'
  };

  return cityMapping[city] || city.toUpperCase().substring(0, 3);
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

  // Get the city code for product identification
  const cityCode = getCityCode(stay.city || '');
  const cityName = stay.city || 'Unknown City';

  console.log('[createCartRequestFromStay] Input stay:', {
    name: stay.name,
    city: stay.city,
    cityCode,
    pricePerNight: stay.pricePerNight
  });

  return {
    cart: {
      cartDetails: [{
        activityStartDate,
        membershipNumber,
        currencyISOCode: 'USD',
        transactionAmount: stay.pricePerNight * quantity,
        cartLineDetails: [{
          cartLineProduct: cityName,
          cartLineProductCode: cityCode,
          cartLineProductStockKeepingUnit: cityCode,
          cartLineItemQuantity: quantity,
          cartLineItemAmount: stay.pricePerNight,
          cartLineProductCatalog: 'Expedia Stay Catalog'
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
 * Apply all available promotions to a cart total
 */
export function applyBestPromotions(
  originalAmount: number,
  eligiblePromotions: PromotionDiscount[]
): { finalAmount: number; appliedPromotions: PromotionDiscount[]; totalDiscount: number; totalPointsAwarded: number } {
  // All promotions (including points redemptions) provide discounts
  const allDiscountPromotions = eligiblePromotions.filter(p => p.discountAmount > 0);

  if (allDiscountPromotions.length === 0) {
    return {
      finalAmount: originalAmount,
      appliedPromotions: [],
      totalDiscount: 0,
      totalPointsAwarded: 0
    };
  }

  // Apply all promotions - both percentage discounts and points redemptions
  const totalDiscount = allDiscountPromotions.reduce(
    (total, promo) => total + (promo.discountAmount || 0), 0
  );

  const finalAmount = Math.max(0, originalAmount - totalDiscount);

  return {
    finalAmount,
    appliedPromotions: allDiscountPromotions,
    totalDiscount,
    totalPointsAwarded: 0 // All points are redeemed (used for discounts), not awarded
  };
}