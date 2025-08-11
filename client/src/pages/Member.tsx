// src/pages/Member.tsx
import React from "react";
import MemberProfile from "../components/MemberProfile";
import TransactionHistory from "../components/profile/TransactionHistory"; // adjust path

export default function MemberPage() {
  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left: Profile (40%) */}
        <section className="lg:basis-[40%] w-full bg-white border rounded-xl shadow-sm p-4">
          <MemberProfile
            membershipNumber="DL12345"
            loyaltyProgramName="Cars and Stays by Delta"
          />
        </section>

        {/* Right: Transactions (60%) */}
        <section className="lg:basis-[60%] w-full bg-white border rounded-xl shadow-sm p-4 min-w-0">
          {/* If your TransactionHistory has its own outer <main>, you can remove it or add a prop for 'compact' */}
          <TransactionHistory />
        </section>
      </div>
    </main>
  );
}