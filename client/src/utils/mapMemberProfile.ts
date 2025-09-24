import type { MemberProfile } from "../types/member";

export function mapSFMemberProfile(sf: any): MemberProfile {
  // Names
  const firstName = sf?.associatedContact?.firstName ?? "";
  const lastName = sf?.associatedContact?.lastName ?? "";

  // Membership basics
  const membershipNumber = sf?.membershipNumber ?? "";
  const memberSince = sf?.enrollmentDate ?? null;

  // Tier
  const tierRec = Array.isArray(sf?.memberTiers) ? sf.memberTiers[0] : null;
  const tierName = tierRec?.loyaltyMemberTierName ?? "";
  const tier: MemberProfile["tier"] = {
    name: tierName,
    // If you later expose next-tier in API, map here:
    nextTierName: undefined,
    progressPercent: undefined,
  };

  // Currencies: fold into dictionary by name ("Miles", "MQDs", etc.)
  const currenciesArr = Array.isArray(sf?.memberCurrencies)
    ? sf.memberCurrencies
    : [];

  const byName: Record<string, any> = {};
  for (const c of currenciesArr) {
    const key = c?.loyaltyMemberCurrencyName;
    if (key) byName[key] = c;
  }

  // Balances
  const milesBal = byName["Miles"]?.pointsBalance;
  const mqdsBal  = byName["MQDs"]?.pointsBalance;
  const escrowBal = byName["Miles"]?.escrowPointsBalance;

  // Keep "availablePoints" as your main headline (use Miles balance)
  const availablePoints = typeof milesBal === "number" ? milesBal : 0;
  const escrowPoints = typeof escrowBal === "number" ? escrowBal : 0;

  // Optional: keep lifetimePoints if your org ever provides it elsewhere
  const lifetimePoints =
    typeof sf?.lifetimePoints === "number" ? sf.lifetimePoints : 0;

  // Vouchers/offers counts (placeholders until API exposes real values)
  const vouchersCount =
    typeof sf?.vouchersCount === "number" ? sf.vouchersCount : undefined;
  const offersCount =
    typeof sf?.offersCount === "number" ? sf.offersCount : undefined;

  // Avatar (demo)
  const avatarUrl =
    sf?.additionalLoyaltyProgramMemberFields?.Avatar__c || "";

  return {
    memberId: sf?.loyaltyProgramMemberId,
    membershipNumber,
    firstName,
    lastName,
    availablePoints,
    lifetimePoints,
    miles: typeof milesBal === "number" ? milesBal : undefined,
    mqds: typeof mqdsBal === "number" ? mqdsBal : undefined,
    escrowPoints,
    memberSince,
    avatarUrl,
    vouchersCount,
    offersCount,
    tier,
  };
}
