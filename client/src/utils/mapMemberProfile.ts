// src/utils/mapMemberProfile.ts
import type { MemberProfile as UIProfile } from '../types/member';

export function mapSFMemberProfile(apiData: any): UIProfile {
  const contact = apiData.associatedContact ?? {};
  const tierObj = apiData.memberTiers?.[0] ?? {};
  
  // Find reward points & tier points from memberCurrencies
  const rewardPoints = apiData.memberCurrencies?.find(
    (c: any) => c.loyaltyMemberCurrencyName === 'Miles'
  )?.pointsBalance ?? 0;

  const tierPoints = apiData.memberCurrencies?.find(
    (c: any) => c.loyaltyMemberCurrencyName === 'MQDs'
  )?.pointsBalance ?? 0;

  return {
    memberId: apiData.loyaltyProgramMemberId,
    membershipNumber: apiData.membershipNumber,
    firstName: contact.firstName ?? '',
    lastName: contact.lastName ?? '',
    email: contact.email ?? '',
    tier: {
      name: tierObj.loyaltyMemberTierName ?? '',
      rank: tierObj.tierSequenceNumber, // smaller number = higher rank depending on config
      // Optional: If you know the sequence of tiers, you can set nextTierName
      progressPercent: calcTierProgress(tierPoints), // placeholder calc
    },
    availablePoints: rewardPoints,
    lifetimePoints: undefined, // This API doesn’t return lifetime, unless you repurpose totalPointsAccrued
    memberSince: apiData.enrollmentDate,
    vouchersCount: undefined, // Could map from a separate vouchers API
    offersCount: undefined,   // Could map from available offers API
    avatarUrl: undefined,     // Could map from contact image if stored
  };
}

function calcTierProgress(tierPoints: number): number {
  // Dummy example: 0–5000 = Silver → Gold
  const nextTierThreshold = 5000;
  return Math.min(100, (tierPoints / nextTierThreshold) * 100);
}

export{};
