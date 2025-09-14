// src/pages/Checkout.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";

import { usePointsSimulation } from "../hooks/usePointsSimulation";
import { useEligiblePromotions } from "../hooks/useEligiblePromotions";
import EstimatedPoints from "../components/EstimatedPoints";
import RedemptionForm from "../components/RedemptionForm";
import PromotionDisplay from "../components/PromotionDisplay";
import { 
  postStayAccrual, 
  buildAccrualFromCheckout,
  postStayRedemption,
  buildRedemptionFromCheckout
} from "../utils/loyaltyTransactions";
import { 
  POINT_VALUE_USD, 
  pointsToUSD, 
  formatPointsAsCurrency,
  MIN_REDEMPTION_POINTS,
  MAX_REDEMPTION_POINTS
} from "@teddy/shared";

type Room = {
  code: string;
  name: string;
  nightlyRate: number;
  refundable: boolean;
};
type Stay = {
  id: string;
  name: string;
  city: string;
  nightlyRate: number;
  currency?: string;
  gallery?: string[];
  rooms?: Room[];
  fees?: { taxesPct: number; resortFee: number };
};

export default function Checkout() {
  const [params] = useSearchParams();
  const location = useLocation() as any;
  const navigate = useNavigate();

  // 1) From query params
  const stayFromUrl = params.get("stay") || params.get("stayId") || "";
  const roomFromUrl = params.get("room") || "";
  const guestsFromUrl = params.get("guests") || "1";
  const nightsParam = Number(params.get("nights"));
  const nightsFromUrl =
    Number.isFinite(nightsParam) && nightsParam > 0 ? nightsParam : 1;
  const checkInFromUrl = params.get("checkIn") || "";
  const checkOutFromUrl = params.get("checkOut") || "";

  // 2) From router state (set during post-login restore)
  const stateCtx = location.state?.ctx || null;

  // 3) Defensive session fallback
  const stored = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("postLogin") || "null");
    } catch {
      return null;
    }
  })();

  const stayId =
    stayFromUrl || stateCtx?.stayId || stored?.ctx?.stayId || "";
  const roomCode =
    roomFromUrl || stateCtx?.roomCode || stored?.ctx?.roomCode || "";
  const guests =
    guestsFromUrl || stateCtx?.guests || stored?.ctx?.guests || "1";
  const nights =
    nightsFromUrl || stateCtx?.nights || stored?.ctx?.nights || 1;
  const checkInISO =
    checkInFromUrl || stateCtx?.checkIn || stored?.ctx?.checkIn || "";
  const checkOutISO =
    checkOutFromUrl || stateCtx?.checkOut || stored?.ctx?.checkOut || "";

  const [loading, setLoading] = useState(true);
  const [stay, setStay] = useState<Stay | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (!stayId) throw new Error("Missing stay id");
        const base = window.location.origin;

        let res = await fetch(
          `${base}/api/stays/${encodeURIComponent(stayId)}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          res = await fetch(
            `${base}/api/stays/by-slug/${encodeURIComponent(stayId)}`,
            { credentials: "include" }
          );
          if (!res.ok) throw new Error(`Stay not found (${stayId})`);
        }
        const data: Stay = await res.json();
        setStay(data || null);
      } catch (e: any) {
        setError(e.message || "Failed to load checkout");
        setStay(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [stayId]);

  const selectedRoom = useMemo(
    () => (stay?.rooms || []).find((r) => r.code === roomCode) || null,
    [stay, roomCode]
  );

  const currency = stay?.currency || "USD";
  const fmt = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency });

  const price = useMemo(() => {
    const nightly = selectedRoom?.nightlyRate ?? stay?.nightlyRate ?? 0;
    const taxesPct = stay?.fees?.taxesPct ?? 0;
    const resortFeePerNight = stay?.fees?.resortFee ?? 0;

    const subtotalNights = nightly * nights;
    const resortFees = resortFeePerNight * nights;
    const taxes = +(subtotalNights * taxesPct).toFixed(2);
    const total = +(subtotalNights + resortFees + taxes).toFixed(2);

    return {
      nightly,
      taxesPct,
      resortFeePerNight,
      subtotalNights,
      resortFees,
      taxes,
      total,
    };
  }, [stay, selectedRoom, nights]);

  // === Points Simulation ===
  const membershipNumber = "DL12345";
  const program = "Cars and Stays by Delta";

  // === Eligible Promotions ===
  const promotions = useEligiblePromotions({
    membershipNumber,
    debugMode: false
  });

  // Fetch promotions when stay and pricing are available
  useEffect(() => {
    if (stay && !loading && price.total > 0) {
      const stayForPromotion = {
        id: stay.id,
        name: stay.name,
        pricePerNight: selectedRoom?.nightlyRate || stay.nightlyRate || 0,
        checkIn: checkInISO
      };

      promotions.fetchPromotionsForStay(stayForPromotion, nights);
    }
  }, [stay, loading, price.total, nights, selectedRoom, checkInISO]);

  // Calculate final price with promotions applied
  const promotionDiscount = promotions.calculation?.totalDiscount || 0;
  const priceAfterPromotions = useMemo(
    () => Math.max(0, price.total - promotionDiscount),
    [price.total, promotionDiscount]
  );

  // === Redemption (Real implementation) ===
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [redemptionError, setRedemptionError] = useState<string | null>(null);
  
  // Calculate redemption credit using configurable point value
  const redeemCredit = useMemo(
    () => pointsToUSD(Math.max(0, redeemPoints)),
    [redeemPoints]
  );
  
  // Calculate final total after promotions and point redemption
  const adjustedTotal = useMemo(
    () => +(Math.max(0, priceAfterPromotions - redeemCredit)).toFixed(2),
    [priceAfterPromotions, redeemCredit]
  );

  const simInput = useMemo(() => {
    if (!stay || !checkInISO || !checkOutISO) return [];
    const originalNightly = selectedRoom?.nightlyRate ?? stay.nightlyRate ?? 0;
    if (!originalNightly) return [];
    
    // Calculate adjusted nightly rate after redemption
    const originalTotal = originalNightly * nights;
    const adjustedNightly = originalTotal > 0 
      ? (adjustedTotal / nights) 
      : 0;
    
    return [
      {
        stayId: stay.id,
        propertyName: stay.name,
        city: stay.city,
        checkInISO,
        checkOutISO,
        nightlyRate: Math.max(0, adjustedNightly), // Use adjusted rate for simulation
        currency: stay.currency ?? "USD",
        nights,
      },
    ];
  }, [
    stay?.id,
    stay?.name,
    stay?.city,
    stay?.currency,
    selectedRoom?.nightlyRate,
    checkInISO,
    checkOutISO,
    nights,
    adjustedTotal, // Include adjustedTotal in dependencies
  ]);

  const {
    loading: simLoading,
    getEstimate,
    error: simError,
  } = usePointsSimulation({
    stays: simInput,
    program,
    membershipNumber,
    maxBatch: 1,
  });
  const estimate = simInput.length ? getEstimate(simInput[0]) : null;


  if (loading)
    return <div className="mx-auto max-w-4xl p-6">Loading checkout…</div>;

  if (error || !stay) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl bg-red-50 p-6 text-red-700 shadow">
          {error || "Not found"}
        </div>
        <div className="mt-4">
          <Link to="/search" className="text-indigo-600 hover:underline">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const s = stay as NonNullable<typeof stay>;

  if (!selectedRoom) {
    const backHref = `/stay/${encodeURIComponent(
      s.id
    )}?guests=${encodeURIComponent(guests)}&nights=${encodeURIComponent(
      String(nights)
    )}&checkIn=${encodeURIComponent(checkInISO)}&checkOut=${encodeURIComponent(
      checkOutISO
    )}`;
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl bg-yellow-50 p-6 text-yellow-800 shadow">
          Room not found. Please pick another room.
        </div>
        <div className="mt-4">
          <Link to={backHref} className="text-indigo-600 hover:underline">
            Back to property
          </Link>
        </div>
      </div>
    );
  }

  const r = selectedRoom as NonNullable<typeof selectedRoom>;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    let bookingId = `BK-${Date.now()}`;

    // 1. Create booking in your local system
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalTransactionNumber: bookingId,
          membershipNumber: "DL12345", // Use consistent member number
          channel: "Web",
          posa: "US",
          bookingDate: new Date().toISOString().slice(0, 10),
          tripStartDate: checkInISO.slice(0, 10),
          tripEndDate: checkOutISO.slice(0, 10),
          lineItems: [{
            lob: "HOTEL",
            productCode: r.code,
            productName: r.name,
            productDescription: `${s.name} - ${s.city}`,
            quantity: nights,
            unitPrice: r.nightlyRate,
            cashAmount: adjustedTotal,
            taxes: price.taxes,
            fees: price.resortFees,
            pointsRedeemed: redeemPoints,
            startDate: checkInISO,
            endDate: checkOutISO,
            destinationCity: s.city,
            destinationCountry: "US"
          }]
        }),
      });
      if (res.ok) {
        const json = await res.json();
        bookingId = json.bookingId || bookingId;
      }
    } catch {
      // ignore booking errors, still try to post journal
    }

    // 2. Post Accrual / Stay journal to Loyalty Management
    try {
      const payload = buildAccrualFromCheckout({
        bookingId,
        currency: stay?.currency ?? "USD",
        total: adjustedTotal, // Use final total after point redemption
        taxes: price.taxes,
        nights,
        checkInISO,
        checkOutISO,
        city: s.city,
        posa: "US",                 // hardcoded example, replace if dynamic
        memberId: undefined,        // supply Program Member Id if you have it
        channel: "Web",
        paymentMethod: "Delta Card",
        paymentType: "Cash",
        destinationCountry: "US",   // set if you know
        bookingDate: new Date().toISOString().slice(0, 10),
      });

      await postStayAccrual(payload);
      console.log("Accrual journal posted:", payload);
    } catch (err) {
      console.warn("Accrual journal failed:", err);
      // non-blocking: user still proceeds to confirmation
    }

    // 3. Post Redemption journal if points are being redeemed
    if (redeemPoints > 0) {
      try {
        const redemptionPayload = buildRedemptionFromCheckout({
          bookingId: `${bookingId}-REDEEM`,
          points: redeemPoints,
          nights,
          checkInISO,
          checkOutISO,
          city: s.city,
          posa: "US",
          memberId: undefined,        // supply Program Member Id if you have it
          destinationCountry: "US",
          bookingDate: new Date().toISOString().slice(0, 10),
          comment: `Point redemption for booking ${bookingId}: ${redeemPoints} points = ${formatPointsAsCurrency(redeemPoints)}`,
        });

        await postStayRedemption(redemptionPayload);
        console.log("Redemption journal posted:", redemptionPayload);
      } catch (err) {
        console.warn("Redemption journal failed:", err);
        // non-blocking: user still proceeds to confirmation
      }
    }

    // 3. Navigate to confirmation page
    navigate(
      `/confirmation?booking=${encodeURIComponent(
        bookingId
      )}&stay=${encodeURIComponent(s.id)}&room=${encodeURIComponent(
        r.code
      )}&guests=${encodeURIComponent(guests)}&nights=${encodeURIComponent(
        String(nights)
      )}&checkIn=${encodeURIComponent(
        checkInISO
      )}&checkOut=${encodeURIComponent(checkOutISO)}`
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Demo Site Disclaimer */}
      <div className="mb-6 rounded-xl bg-amber-50 border-2 border-amber-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="text-2xl">⚠️</div>
          </div>
          <div>
            <h3 className="font-bold text-amber-800 text-lg">Demo Site - Do Not Enter Real Information</h3>
            <p className="text-amber-700 text-sm mt-1">
              This is a <strong>Salesforce demo application</strong> for demonstration purposes only. 
              Please do not enter real credit card numbers, personal information, or payment details. 
              Use test data only.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Order summary */}
        <aside className="md:col-span-1">
          {/* Promotions Display */}
          {promotions.hasPromotions && promotions.calculation && (
            <div className="mb-4">
              <PromotionDisplay
                promotions={promotions.promotions}
                appliedPromotions={promotions.calculation.appliedPromotions}
                originalAmount={price.total}
                finalAmount={priceAfterPromotions}
                totalDiscount={promotionDiscount}
                loading={promotions.loading}
              />
            </div>
          )}

        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="text-sm text-gray-600">{s.city}</div>
          <div className="font-semibold text-gray-900">{s.name}</div>

          <div className="mt-2 text-sm text-gray-700">
            <div className="font-medium">Room</div>
            <div>{r.name}</div>
          </div>

          <div className="mt-4 text-sm text-gray-700 space-y-1">
            <div className="flex justify-between">
              <span>
                {fmt(price.nightly)} × {nights} night{nights > 1 ? "s" : ""}
              </span>
              <span>{fmt(price.subtotalNights)}</span>
            </div>

            {price.resortFeePerNight > 0 && (
              <div className="flex justify-between">
                <span>
                  Resort fee {fmt(price.resortFeePerNight)} × {nights}
                </span>
                <span>{fmt(price.resortFees)}</span>
              </div>
            )}

            {price.taxesPct > 0 && (
              <div className="flex justify-between">
                <span>Taxes ({(price.taxesPct * 100).toFixed(1)}%)</span>
                <span>{fmt(price.taxes)}</span>
              </div>
            )}

            {/* Promotion discount */}
            {promotionDiscount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Promotion discount</span>
                <span>-{fmt(promotionDiscount)}</span>
              </div>
            )}

            {/* Points credit (UI only) */}
            {redeemPoints > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Points credit ({redeemPoints.toLocaleString()} pts)</span>
                <span>-{fmt(redeemCredit)}</span>
              </div>
            )}

            <div className="mt-2 border-t pt-2 flex justify-between font-semibold text-gray-900">
              <span>{redeemPoints > 0 ? "Pay today" : "Total"}</span>
              <span>{fmt(redeemPoints > 0 ? adjustedTotal : priceAfterPromotions)}</span>
            </div>

            {redeemPoints > 0 && (
              <div className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                {redeemPoints.toLocaleString()} points = {fmt(redeemCredit)} credit applied
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Guests: {guests} • Nights: {nights}
          </div>

          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-1">Estimated Points</div>
            <EstimatedPoints
              byCurrency={estimate}
              preferred={["Miles", "MQDs", "PTS"]}
              loading={simLoading && !estimate}
            />
            {simError && (
              <div className="mt-2 text-xs text-yellow-800 bg-yellow-50 inline-block px-2 py-1 rounded">
                Points estimate unavailable right now.
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Guest & payment form */}
      <section className="md:col-span-2 rounded-2xl bg-white p-5 shadow">
        <div className="mb-4 text-lg font-semibold text-gray-900">
          Guest details
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700">First name</label>
              <input
                name="firstName"
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Last name</label>
              <input
                name="lastName"
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700">Email</label>
            <input
              name="email"
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>

          {/* Redemption UI (elegant placement before Payment) */}
          <div className="pt-2">
            <div className="mb-2 text-lg font-semibold text-gray-900">
              Apply points (optional)
            </div>
            <div className="rounded-xl border p-4 shadow-sm bg-white">
              <RedemptionForm
                bookingId={`preview-${Date.now()}`}
                maxPoints={50000} // Demo: could fetch actual balance from member API
                onPreview={(pts) => {
                  setRedeemPoints(Math.max(0, Math.floor(pts)));
                  setRedemptionError(null);
                }}
                onSubmit={(pts) => {
                  const validPoints = Math.max(0, Math.floor(pts));
                  setRedeemPoints(validPoints);
                  setRedemptionError(null);
                  console.log(`Points applied: ${validPoints} = ${formatPointsAsCurrency(validPoints)}`);
                }}
              />
              
              {/* Redemption preview */}
              {redeemPoints > 0 && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-sm text-emerald-800">
                    <div className="font-medium">Point Redemption Applied</div>
                    <div className="mt-1">
                      <strong>{redeemPoints.toLocaleString()} points</strong> = <strong>{formatPointsAsCurrency(redeemPoints)}</strong> credit
                    </div>
                    <div className="text-xs mt-2 text-emerald-600">
                      This redemption will be processed when you complete your booking.
                    </div>
                  </div>
                </div>
              )}
              
              {/* Redemption error */}
              {redemptionError && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-sm text-red-800">
                    <div className="font-medium">Redemption Error</div>
                    <div className="mt-1">{redemptionError}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 text-lg font-semibold text-gray-900">Payment</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700">Card number</label>
              <input
                name="cardNumber"
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">
                Expiry (MM/YY)
              </label>
              <input
                name="expiry"
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700">CVC</label>
              <input
                name="cvc"
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Postal code</label>
              <input
                name="postal"
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            Confirm and pay {redeemPoints > 0 ? `• ${fmt(adjustedTotal)}` : ""}
          </button>

          <div className="mt-3">
            <Link
              to={`/stay/${encodeURIComponent(
                s.id
              )}?guests=${encodeURIComponent(
                guests
              )}&nights=${encodeURIComponent(
                String(nights)
              )}&checkIn=${encodeURIComponent(
                checkInISO
              )}&checkOut=${encodeURIComponent(checkOutISO)}`}
              className="text-indigo-600 hover:underline"
            >
              ← Back to property
            </Link>
          </div>
        </form>
      </section>
      </div>
    </div>
  );
}

