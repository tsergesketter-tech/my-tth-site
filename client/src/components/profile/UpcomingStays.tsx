import { useState } from "react";
import { useBookings } from "../../hooks/useBookings";
import { getBookingStatusDisplay, calculateBookingTotals } from "../../utils/bookingApi";
import CancellationModal from "../CancellationModal";
import type { TripBooking, BookingLineItem } from "../../../../shared/bookingTypes";

export default function UpcomingStays() {
  const { upcomingBookings, loading, error, refreshBooking } = useBookings();
  const [selectedBooking, setSelectedBooking] = useState<TripBooking | null>(null);
  const [selectedLineItems, setSelectedLineItems] = useState<BookingLineItem[]>([]);
  const [showCancellationModal, setShowCancellationModal] = useState(false);

  const handleCancelBooking = (booking: TripBooking) => {
    setSelectedBooking(booking);
    setSelectedLineItems([]); // Cancel entire booking
    setShowCancellationModal(true);
  };

  const handleCancelLineItem = (booking: TripBooking, lineItem: BookingLineItem) => {
    setSelectedBooking(booking);
    setSelectedLineItems([lineItem]); // Cancel specific line item
    setShowCancellationModal(true);
  };

  const handleCancellationSuccess = async (updatedBooking: TripBooking) => {
    await refreshBooking(updatedBooking.id);
    setShowCancellationModal(false);
    setSelectedBooking(null);
    setSelectedLineItems([]);
  };

  const handleCloseCancellation = () => {
    setShowCancellationModal(false);
    setSelectedBooking(null);
    setSelectedLineItems([]);
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Upcoming Stays</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white border shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Upcoming Stays</h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">Failed to load bookings: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-white border shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Upcoming Stays</h3>
          <div className="text-sm text-gray-500">
            {upcomingBookings.length} booking{upcomingBookings.length !== 1 ? "s" : ""}
          </div>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="text-sm text-gray-600">
            No upcoming stays. 
            <span className="text-indigo-600 hover:underline cursor-pointer ml-1">
              Find a property
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingBookings.map(booking => {
              const { status, color, canCancel } = getBookingStatusDisplay(booking);
              const totals = calculateBookingTotals(booking);
              const activeItems = booking.lineItems.filter(item => item.status === "ACTIVE");

              return (
                <div key={booking.id} className="rounded-xl border p-4 space-y-3">
                  {/* Booking Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-gray-900">
                          Booking #{booking.externalTransactionNumber}
                        </div>
                        <span className={`inline-block text-xs px-2 py-1 rounded-full ${color}`}>
                          {status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {booking.bookingDate && (
                          <>Booked on {new Date(booking.bookingDate).toLocaleDateString()}</>
                        )}
                        {booking.membershipNumber && (
                          <> • Member {booking.membershipNumber}</>
                        )}
                      </div>
                    </div>
                    {canCancel && (
                      <button
                        onClick={() => handleCancelBooking(booking)}
                        className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>

                  {/* Line Items */}
                  <div className="space-y-2">
                    {booking.lineItems.map(lineItem => {
                      const isActive = lineItem.status === "ACTIVE";
                      const startDate = lineItem.startDate ? new Date(lineItem.startDate) : null;
                      const endDate = lineItem.endDate ? new Date(lineItem.endDate) : null;

                      return (
                        <div
                          key={lineItem.id}
                          className={`flex items-start justify-between p-3 rounded-lg border ${
                            isActive ? 'bg-white' : 'bg-gray-50 opacity-75'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <div className="font-medium text-gray-900">
                                {lineItem.productName || `${lineItem.lob} Service`}
                              </div>
                              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                {lineItem.lob}
                              </span>
                              <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                                isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {lineItem.status}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 mt-1">
                              {lineItem.destinationCity && lineItem.destinationCountry && (
                                <div>{lineItem.destinationCity}, {lineItem.destinationCountry}</div>
                              )}
                              {startDate && endDate && (
                                <div>
                                  {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                                  {lineItem.nights && ` • ${lineItem.nights} night${lineItem.nights !== 1 ? 's' : ''}`}
                                </div>
                              )}
                            </div>

                            {/* Payment breakdown */}
                            <div className="text-xs text-gray-500 mt-2 space-y-1">
                              {lineItem.cashAmount && lineItem.cashAmount > 0 && (
                                <div>💵 ${lineItem.cashAmount.toFixed(2)} cash</div>
                              )}
                              {lineItem.pointsRedeemed && lineItem.pointsRedeemed > 0 && (
                                <div>🎯 {lineItem.pointsRedeemed.toLocaleString()} points redeemed</div>
                              )}
                              {lineItem.pointsEarned && lineItem.pointsEarned > 0 && (
                                <div>⭐ {lineItem.pointsEarned.toLocaleString()} points earned</div>
                              )}
                              {((lineItem.taxes || 0) + (lineItem.fees || 0)) > 0 && (
                                <div>📊 ${((lineItem.taxes || 0) + (lineItem.fees || 0)).toFixed(2)} taxes & fees</div>
                              )}
                            </div>

                            {/* Cancellation info */}
                            {!isActive && lineItem.cancelledAt && (
                              <div className="text-xs text-gray-500 mt-2">
                                Cancelled on {new Date(lineItem.cancelledAt).toLocaleDateString()}
                                {lineItem.cancellationReason && (
                                  <div className="italic">Reason: {lineItem.cancellationReason}</div>
                                )}
                              </div>
                            )}
                          </div>

                          {isActive && canCancel && (
                            <button
                              onClick={() => handleCancelLineItem(booking, lineItem)}
                              className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded ml-2"
                            >
                              Cancel Item
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Booking Totals */}
                  {activeItems.length > 0 && (
                    <div className="border-t pt-3">
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Active Items Total:</span>
                          <span className="font-medium">${totals.totalCash}</span>
                        </div>
                        {parseInt(totals.totalPoints) > 0 && (
                          <div className="flex justify-between">
                            <span>Points Used:</span>
                            <span className="font-medium">{totals.totalPoints} points</span>
                          </div>
                        )}
                        {parseFloat(totals.totalTaxesAndFees) > 0 && (
                          <div className="flex justify-between">
                            <span>Taxes & Fees:</span>
                            <span className="font-medium">${totals.totalTaxesAndFees}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium pt-1 border-t">
                          <span>Grand Total:</span>
                          <span>${totals.grandTotal}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {selectedBooking && (
        <CancellationModal
          booking={selectedBooking}
          isOpen={showCancellationModal}
          onClose={handleCloseCancellation}
          onSuccess={handleCancellationSuccess}
          selectedLineItems={selectedLineItems.length > 0 ? selectedLineItems : undefined}
        />
      )}
    </>
  );
}
export{};
