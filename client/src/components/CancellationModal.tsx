// client/src/components/CancellationModal.tsx
// Modal component for cancellation workflow with points-first priority preview

import { useState, useEffect } from "react";
import type { TripBooking, BookingLineItem } from "../../../shared/bookingTypes";
import { useCancellation } from "../hooks/useBookings";
import { pointsToUSD } from "@teddy/shared";

interface CancellationModalProps {
  booking: TripBooking;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedBooking: TripBooking) => void;
  selectedLineItems?: BookingLineItem[];
}

export default function CancellationModal({
  booking,
  isOpen,
  onClose,
  onSuccess,
  selectedLineItems
}: CancellationModalProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'confirm' | 'executing' | 'complete'>('select');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false);

  const { previewData, loading, executing, error, preview, execute, clearPreview } = useCancellation(booking.id);

  useEffect(() => {
    if (selectedLineItems) {
      // Pre-select specific line items if provided
      const itemIds = selectedLineItems.map(item => item.id);
      setSelectedItems(itemIds);
      setStep('preview');
      handlePreview(itemIds);
    } else {
      // Reset to select mode when modal opens
      setStep('select');
      setSelectedItems([]);
      clearPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedLineItems, clearPreview]);

  const activeLineItems = booking.lineItems.filter(item => item.status === "ACTIVE");
  
  const handlePreview = async (itemIds: string[] = selectedItems) => {
    if (itemIds.length === 0) return;

    try {
      await preview({
        lineItemIds: itemIds,
        reason: reason || "Customer requested cancellation",
        requestedBy: "customer-portal"
      });
      setStep('preview');
    } catch (err) {
      console.error("Preview failed:", err);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;

    setStep('executing');
    
    try {
      const result = await execute({
        lineItemIds: selectedItems,
        reason: reason || "Customer requested cancellation",
        requestedBy: "customer-portal"
      });
      
      setStep('complete');
      setTimeout(() => {
        onSuccess(result.booking);
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Cancellation failed:", err);
      setStep('preview'); // Go back to preview on error
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedItems([]);
    setReason("");
    clearPreview();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {step === 'complete' ? 'Cancellation Complete' : 'Cancel Booking'}
            </h2>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Booking: {booking.externalTransactionNumber}
          </p>
        </div>

        <div className="p-6">
          {step === 'select' && (
            <>
              <h3 className="font-medium text-gray-900 mb-4">Select items to cancel:</h3>
              <div className="space-y-3">
                {activeLineItems.map(item => (
                  <label key={item.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {item.productName || `${item.lob} Service`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {item.destinationCity && `${item.destinationCity} • `}
                        {item.startDate && item.endDate && (
                          <>
                            {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {item.cashAmount && `$${item.cashAmount.toFixed(2)} cash`}
                        {item.cashAmount && item.pointsRedeemed && " + "}
                        {item.pointsRedeemed && `${item.pointsRedeemed.toLocaleString()} points`}
                      </div>
                    </div>
                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      {item.status}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cancellation reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional cancellation reason..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                />
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePreview()}
                  disabled={selectedItems.length === 0 || loading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Loading..." : "Preview Cancellation"}
                </button>
              </div>
            </>
          )}

          {step === 'preview' && previewData && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">🎯 Points-First Priority Preview</h3>
                <p className="text-sm text-blue-700">
                  We'll process your cancellation in the order that maximizes your benefit:
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 flex items-center">
                    <span className="bg-green-600 text-white rounded-full w-6 h-6 text-sm flex items-center justify-center mr-2">1</span>
                    Points Refunded to Your Account
                  </h4>
                  <div className="mt-2 text-green-800">
                    <div className="text-lg font-bold">+{previewData.plan.totalPointsToRefund.toLocaleString()} points</div>
                    <div className="text-sm text-green-600">
                      ≈ ${pointsToUSD(previewData.plan.totalPointsToRefund).toFixed(2)} value
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 flex items-center">
                    <span className="bg-yellow-600 text-white rounded-full w-6 h-6 text-sm flex items-center justify-center mr-2">2</span>
                    Earned Points Cancelled
                  </h4>
                  <div className="mt-2 text-yellow-800">
                    <div className="text-lg font-bold">-{previewData.plan.totalPointsToCancel.toLocaleString()} points</div>
                    <div className="text-sm text-yellow-600">
                      Points from this booking removed
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <span className="bg-gray-600 text-white rounded-full w-6 h-6 text-sm flex items-center justify-center mr-2">3</span>
                    Cash Refund
                  </h4>
                  <div className="mt-2 text-gray-800">
                    <div className="text-lg font-bold">${previewData.plan.totalCashRefund.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">
                      Includes taxes and fees
                    </div>
                  </div>
                </div>

                {/* Net Result */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-medium text-indigo-900">Net Points Change</h4>
                  <div className="mt-2 text-indigo-800">
                    <div className="text-xl font-bold">
                      {previewData.plan.netPointsChange >= 0 ? '+' : ''}{previewData.plan.netPointsChange.toLocaleString()} points
                    </div>
                    <div className="text-sm text-indigo-600">
                      Total impact to your account
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-step breakdown */}
              <button
                onClick={() => setShowPointsBreakdown(!showPointsBreakdown)}
                className="text-sm text-gray-600 hover:text-gray-800 mb-4"
              >
                {showPointsBreakdown ? 'Hide' : 'Show'} detailed steps ({previewData.plan.steps.length})
              </button>

              {showPointsBreakdown && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
                  <h5 className="font-medium text-gray-900 mb-3">Cancellation Steps:</h5>
                  <div className="space-y-3">
                    {previewData.plan.steps.map((step, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">
                              {step.type === 'REDEMPTION_REFUND' ? 'Refund Redemption' : 'Cancel Accrual'}
                            </span>
                            <span className="text-gray-600 ml-2">
                              ({step.lob})
                            </span>
                          </div>
                          <div className={step.type === 'REDEMPTION_REFUND' ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                            {step.type === 'REDEMPTION_REFUND' ? '+' : '-'}{step.amount.toLocaleString()} points total
                          </div>
                        </div>
                        
                        {step.loyaltyLedgers && step.loyaltyLedgers.length > 0 && (
                          <div className="text-xs text-gray-500 space-y-1">
                            <div className="font-medium">Specific ledger entries to be cancelled:</div>
                            {step.loyaltyLedgers.map((ledger) => (
                              <div key={ledger.id} className="flex justify-between items-center pl-2">
                                <span>
                                  {ledger.loyaltyProgramCurrency} ({ledger.eventType})
                                </span>
                                <span className={step.type === 'REDEMPTION_REFUND' ? 'text-green-600' : 'text-yellow-600'}>
                                  {step.type === 'REDEMPTION_REFUND' ? '+' : '-'}{ledger.points.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  ← Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={executing}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm Cancellation
                </button>
              </div>
            </>
          )}

          {step === 'executing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Cancellation</h3>
              <p className="text-gray-600">Please wait while we process your cancellation...</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Cancellation Complete!</h3>
              <p className="text-gray-600">Your booking has been successfully cancelled.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}