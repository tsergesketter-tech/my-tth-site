// client/src/utils/vouchersApi.ts
import type { Voucher } from '../data/memberDemo';

type VouchersResponse = {
  vouchers: Voucher[];
  totalCount: number;
  _meta: {
    membershipNumber: string;
    program: string;
    fetchedAt: string;
    sourceApi: string;
  };
};

/**
 * Fetch vouchers for a member from Salesforce
 */
export async function fetchMemberVouchers(membershipNumber: string = "DL12345"): Promise<VouchersResponse> {
  const response = await fetch(`/api/loyalty/member/${encodeURIComponent(membershipNumber)}/vouchers`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
      errorData.message ||
      `Failed to fetch vouchers: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Redeem a voucher by ID (placeholder for future implementation)
 */
export async function redeemVoucher(voucherId: string, redemptionDetails?: any): Promise<any> {
  const response = await fetch(`/api/loyalty/vouchers/${voucherId}/redeem`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(redemptionDetails || {}),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || 
      errorData.message || 
      `Failed to redeem voucher: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}