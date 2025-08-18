// client/src/types/member.ts

export type TierInfo = {
  /** e.g., "Platinum Medallion" */
  name: string;
  /** Lower is usually higher rank; optional depending on org config */
  rank?: number;
  /** Optional display for the progress bar */
  nextTierName?: string;
  /** 0–100 (you can compute server-side) */
  progressPercent?: number;
};

export type MemberProfile = {
  /** Loyalty Program Member ID (0lM...) */
  memberId: string;
  /** Human-friendly number shown to member, e.g., "DL12345" */
  membershipNumber?: string;

  firstName: string;
  lastName: string;
  email?: string;

  /** Current tier info */
  tier: TierInfo;

  miles?: number;
  mqds?: number;

  /** Redeemable balance (points/miles) */
  availablePoints?: number;

  /** Optional extras */
  lifetimePoints?: number;
  memberSince?: string;     // ISO date (YYYY-MM-DD)
  vouchersCount?: number;
  offersCount?: number;
  avatarUrl?: string;       // URL or data URI
};
