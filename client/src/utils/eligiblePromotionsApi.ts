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

// Salesforce API response structures
export interface SalesforceRewardDetail {
  discountLevel: string;
  discountType: string; // "PercentageOff", "FixedAmountOff", etc.
  discountValue: string;
}

export interface SalesforceReward {
  rewardType: string;
  rewardDetails: SalesforceRewardDetail;
}

export interface SalesforcePromotionRule {
  ruleName: string;
  rulePriority: number;
  ruleRewards: SalesforceReward[];
}

export interface SalesforcePromotion {
  promotionId: string;
  isAutomatic: boolean;
  currencyIsoCode: string;
  promotionEligibleRules: SalesforcePromotionRule[];
  additionalPromotionFields: Record<string, any>;
  promotionLimits: any[];
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
 */
function transformSalesforcePromotion(
  sfPromotion: SalesforcePromotion,
  originalAmount: number
): PromotionDiscount {
  // Get the first rule and first reward (most promotions have one rule with one reward)
  const firstRule = sfPromotion.promotionEligibleRules[0];
  const firstReward = firstRule?.ruleRewards[0];

  if (!firstReward || firstReward.rewardType !== 'ProvideDiscount') {
    throw new Error(`Unsupported reward type: ${firstReward?.rewardType}`);
  }

  const rewardDetails = firstReward.rewardDetails;
  const discountValue = parseFloat(rewardDetails.discountValue);

  let discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'POINTS';
  let discountAmount: number;

  switch (rewardDetails.discountType) {
    case 'PercentageOff':
      discountType = 'PERCENTAGE';
      discountAmount = (originalAmount * discountValue) / 100;
      break;
    case 'FixedAmountOff':
      discountType = 'FIXED_AMOUNT';
      discountAmount = discountValue;
      break;
    default:
      throw new Error(`Unsupported discount type: ${rewardDetails.discountType}`);
  }

  return {
    promotionId: sfPromotion.promotionId,
    promotionName: firstRule.ruleName || `Promotion ${sfPromotion.promotionId}`,
    discountType,
    discountValue,
    discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
    description: `${discountValue}${discountType === 'PERCENTAGE' ? '%' : ' USD'} off`
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

  const salesforceResponse: SalesforcePromotionsResponse = await response.json();
  console.log('[eligiblePromotions] Received Salesforce response:', salesforceResponse);

  // Calculate original amount from cart request
  const originalAmount = cartRequest.cart.cartDetails.reduce(
    (total, cart) => total + cart.transactionAmount, 0
  );

  // Transform Salesforce promotions to our format
  const eligiblePromotions: PromotionDiscount[] = salesforceResponse.eligiblePromotions.map(
    (sfPromotion) => transformSalesforcePromotion(sfPromotion, originalAmount)
  );

  console.log('[eligiblePromotions] Transformed promotions:', eligiblePromotions);

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