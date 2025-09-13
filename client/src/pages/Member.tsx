// src/pages/Member.tsx
import React from "react";

// Existing components
import MemberProfile from "../components/MemberProfile";
import TransactionHistory from "../components/profile/TransactionHistory"; // keep if you already have this

// New components (from my previous message)
import WalletSummary from "../components/profile/WalletSummary";
import VouchersList from "../components/profile/VouchersList";
import BadgesGrid from "../components/profile/BadgesGrid";
import UpcomingStays from "../components/profile/UpcomingStays";
import PartnerShortcuts from "../components/profile/PartnerShortcuts";
import EngagementTrail from "../components/profile/EngagementTrail";

export default function MemberPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-8">
      {/* Page header */}
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Member Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here’s a quick snapshot of your membership activity and perks.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/offers"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-700"
          >
            View Offers
          </a>
          <a
            href="/search"
            className="inline-flex items-center rounded-md border px-4 py-2 font-semibold hover:bg-gray-50"
          >
            Book a Stay
          </a>
        </div>
      </header>

      {/* Profile summary */}
      <section aria-labelledby="member-profile">
        <h2 id="member-profile" className="sr-only">Member Profile</h2>
        <MemberProfile
          membershipNumber="DL12345"
          loyaltyProgramName="Cars and Stays by Delta"
        />
      </section>

      {/* Row 1: Upcoming + Wallet */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-labelledby="plans-and-wallet">
        <h2 id="plans-and-wallet" className="sr-only">Bookings and Wallet</h2>
        <div className="md:col-span-2">
          <UpcomingStays />
        </div>
        <div>
          <WalletSummary />
        </div>
      </section>

      {/* Row 2: Vouchers + Badges */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-labelledby="value-and-badges">
        <h2 id="value-and-badges" className="sr-only">Vouchers and Badges</h2>
        <div className="md:col-span-2">
          <VouchersList />
        </div>
        <div>
          <BadgesGrid />
        </div>
      </section>

      {/* Row 3: Engagement Trails */}
      <section aria-labelledby="engagement-trails">
        <h2 id="engagement-trails" className="sr-only">Engagement Trails</h2>
        <EngagementTrail membershipNumber="DL12345" />
      </section>

      {/* Row 4: Transaction history (existing) */}
      <section aria-labelledby="txn-history" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="txn-history" className="text-xl font-semibold text-gray-900">
            Recent Activity
          </h2>
          <a href="/transactions" className="text-sm text-indigo-600 hover:underline">
            See all
          </a>
        </div>
        <TransactionHistory />
      </section>

      {/* Row 5: Partner shortcuts */}
      <section aria-labelledby="partners-shortcuts">
        <h2 id="partners-shortcuts" className="sr-only">Partners</h2>
        <PartnerShortcuts />
      </section>
    </div>
  );
}
