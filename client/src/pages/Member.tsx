// src/pages/Member.tsx
import React from 'react';
import MemberProfile from '../components/MemberProfile';

export default function MemberPage() {
  return (
    <div style={{ padding: 24 }}>
      <MemberProfile
        membershipNumber="DL12345"         // your Contact or Loyalty Member ID
        loyaltyProgramName="Cars and Stays by Delta" // your Loyalty Program Name
        // token={process.env.REACT_APP_SF_TOKEN} // if you must
      />
    </div>
  );
}