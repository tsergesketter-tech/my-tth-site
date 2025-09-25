// client/src/pages/AdminConsole.tsx
import React, { useState } from 'react';

type TierOption = {
  value: string;
  label: string;
};

const TIER_OPTIONS: TierOption[] = [
  { value: 'Member', label: 'Member' },
  { value: 'Silver Medallion', label: 'Silver Medallion' },
  { value: 'Gold Medallion', label: 'Gold Medallion' },
  { value: 'Platinum Medallion', label: 'Platinum Medallion' },
  { value: 'Diamond Medallion', label: 'Diamond Medallion' },
];

export default function AdminConsole() {
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Mock SSO enrollment form state
  const [ssoForm, setSsoForm] = useState({
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@example.test',
    membershipNumber: 'DL54321',
    tier: 'Gold Medallion',
    milesBalance: 50000,
    mqdsBalance: 15000
  });
  const [ssoProcessing, setSsoProcessing] = useState(false);
  const [ssoMessage, setSsoMessage] = useState<string>('');
  const [ssoError, setSsoError] = useState<string>('');

  const membershipNumber = 'DL12345'; // Hardcoded as specified

  const handleUpdateTier = async () => {
    if (!selectedTier) {
      setError('Please select a tier');
      return;
    }

    try {
      setUpdating(true);
      setError('');
      setMessage('');

      const response = await fetch('/api/loyalty/update-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipNumber,
          tierName: selectedTier,
          loyaltyProgramName: 'Cars and Stays by Delta'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update tier: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setMessage(`Successfully updated member ${membershipNumber} to ${selectedTier} tier`);
      console.log('Tier update result:', result);

    } catch (err: any) {
      setError(err.message || 'Failed to update member tier');
      console.error('Tier update error:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSsoEnrollment = async () => {
    try {
      setSsoProcessing(true);
      setSsoError('');
      setSsoMessage('');

      const response = await fetch('/api/loyalty/sso-enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ssoForm),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to process SSO enrollment: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setSsoMessage(`Successfully processed SSO enrollment for ${ssoForm.firstName} ${ssoForm.lastName}. ${result.action}: ${result.membershipNumber}`);
      console.log('SSO enrollment result:', result);

    } catch (err: any) {
      setSsoError(err.message || 'Failed to process SSO enrollment');
      console.error('SSO enrollment error:', err);
    } finally {
      setSsoProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Admin Console
          </h1>

          <div className="space-y-8">
            {/* Update Member Tier Section */}
            <div className="border rounded-lg p-6 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Update Member Tier
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Member
                  </label>
                  <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded border">
                    {membershipNumber}
                  </div>
                </div>

                <div>
                  <label htmlFor="tier-select" className="block text-sm font-medium text-gray-700 mb-1">
                    New Tier
                  </label>
                  <select
                    id="tier-select"
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select a tier...</option>
                    {TIER_OPTIONS.map((tier) => (
                      <option key={tier.value} value={tier.value}>
                        {tier.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleUpdateTier}
                  disabled={updating || !selectedTier}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    updating || !selectedTier
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {updating ? 'Updating...' : 'Update Tier'}
                </button>

                {/* Success/Error Messages */}
                {message && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="text-sm text-green-800">{message}</div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Mock SSO Enrollment Section */}
            <div className="border rounded-lg p-6 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Mock SSO Enrollment
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Simulate SSO enrollment: checks if member exists, enrolls if new, updates tier/points if existing.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={ssoForm.firstName}
                      onChange={(e) => setSsoForm({...ssoForm, firstName: e.target.value})}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={ssoForm.lastName}
                      onChange={(e) => setSsoForm({...ssoForm, lastName: e.target.value})}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={ssoForm.email}
                    onChange={(e) => setSsoForm({...ssoForm, email: e.target.value})}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Membership Number
                  </label>
                  <input
                    type="text"
                    value={ssoForm.membershipNumber}
                    onChange={(e) => setSsoForm({...ssoForm, membershipNumber: e.target.value})}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tier
                  </label>
                  <select
                    value={ssoForm.tier}
                    onChange={(e) => setSsoForm({...ssoForm, tier: e.target.value})}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {TIER_OPTIONS.map((tier) => (
                      <option key={tier.value} value={tier.value}>
                        {tier.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Miles Balance
                    </label>
                    <input
                      type="number"
                      value={ssoForm.milesBalance}
                      onChange={(e) => setSsoForm({...ssoForm, milesBalance: parseInt(e.target.value) || 0})}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      MQDs Balance
                    </label>
                    <input
                      type="number"
                      value={ssoForm.mqdsBalance}
                      onChange={(e) => setSsoForm({...ssoForm, mqdsBalance: parseInt(e.target.value) || 0})}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSsoEnrollment}
                  disabled={ssoProcessing}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    ssoProcessing
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {ssoProcessing ? 'Processing SSO...' : 'Process SSO Enrollment'}
                </button>

                {/* Success/Error Messages */}
                {ssoMessage && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="text-sm text-green-800">{ssoMessage}</div>
                  </div>
                )}

                {ssoError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="text-sm text-red-800">{ssoError}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Placeholder for future admin features */}
            <div className="border rounded-lg p-6 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Billing & Reconciliation
              </h2>
              <p className="text-gray-600 text-sm">
                Coming soon: View billing data, reconciliation reports, and transaction history.
              </p>
            </div>

            <div className="border rounded-lg p-6 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Member Management
              </h2>
              <p className="text-gray-600 text-sm">
                Coming soon: Update member details, manage member status, and more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}