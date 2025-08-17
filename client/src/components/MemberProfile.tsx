// src/components/MemberProfile.tsx
import React, { useEffect, useState } from 'react';
import MemberProfileCard from './MemberProfileCard';
import { mapSFMemberProfile } from '../utils/mapMemberProfile';
import type { MemberProfile as UIProfile } from '../types/member';

type Props = {
  /** e.g., "DL12345" */
  membershipNumber: string;
  /** e.g., "Cars and Stays by Delta" */
  loyaltyProgramName: string;

  /**
   * Optional overrides for local testing. In production, use a backend proxy and DO NOT expose tokens.
   * If omitted, the component will read from:
   *   process.env.REACT_APP_SF_INSTANCE_URL
   *   process.env.REACT_APP_SF_TOKEN
   */
  instanceUrl?: string;
  token?: string;
};

export default function MemberProfile({
  membershipNumber,
  loyaltyProgramName,
  instanceUrl,
  token,
}: Props) {
  const [data, setData] = useState<UIProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Prefer props (for tests), else env vars
const SF_INSTANCE_URL = 'https://trailsignup-87374d74afe7a0.my.salesforce.com';
  const SF_TOKEN = '00DKY00000DQufe!AR4AQDMDGbLOj61wddPSrpoem7meYlLIPp9hE6hoaczt5kiMN9qhfG3lCz7FfOVdF7ZyU1TWuP3YDlRyWYrTF10hkrqQ8lsH';
useEffect(() => {
  let alive = true;

  (async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
          `/api/loyalty/members?program=${encodeURIComponent(loyaltyProgramName)}&membershipNumber=${encodeURIComponent(membershipNumber)}`
      );

      if (!res.ok) {
        let details = '';
        try {
          const body = await res.json();
          details = JSON.stringify(body);
        } catch {}
        throw new Error(`API error: ${res.status} ${res.statusText}${details ? ` - ${details}` : ''}`);
      }

      const json = await res.json();
      const memberRecord: any = Array.isArray(json) ? json[0] : json;

      if (!memberRecord || typeof memberRecord !== 'object') {
        throw new Error('Member not found');
      }

      const mapped = mapSFMemberProfile(memberRecord);
      if (alive) setData(mapped);

    } catch (e: any) {
      if (alive) setError(e?.message || 'Failed to load member profile');
    } finally {
      if (alive) setLoading(false);
    }
  })();

  return () => {
    alive = false;
  };
}, [loyaltyProgramName, membershipNumber]);

  return (
    <MemberProfileCard
      profile={
        data || {
          memberId: '',
          firstName: '',
          lastName: '',
          tier: { name: '' },
          availablePoints: 0,
        }
      }
      loading={loading}
      error={error}
    />
  );
}

export{};