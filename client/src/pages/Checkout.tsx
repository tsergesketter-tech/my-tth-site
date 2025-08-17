// src/pages/Checkout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

// NEW: imports for simulation + pill
import { usePointsSimulation } from "../hooks/usePointsSimulation";
import EstimatedPoints from "../components/EstimatedPoints";

type Room = { code: string; name: string; nightlyRate: number; refundable: boolean };
type Stay = {
  id: string;
  name: string;
  city: string;
  nightlyRate: number;
  currency?: string; // optional currency code, defaults to USD
  gallery?: string[];
  rooms?: Room[];
  fees?: { taxesPct: number; resortFee: number }; // per-night assumption
};

export default function Checkout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const stayId = params.get("stay") || "";
  const roomCode = params.get("room") || "";
  const guests = params.get("guests") || "1";
  const nightsParam = Number(params.get("nights"));
  const nights = Number.isFinite(nightsParam) && nightsParam > 0 ? nightsParam : 1;

  // NEW: bring in check-in/out passed from StayDetail
  const checkInISO = params.get("checkIn") || "";
  const checkOutISO = params.get("checkOut") || "";

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

        let res = await fetch(`${base}/api/stays/${encodeURIComponent(stayId)}`, {
          credentials: "include",
        });
        if (!res.ok) {
          res = await fetch(`${base}/api/stays/by-slug/${encodeURIComponent(stayId)}`, {
            credentials: "include",
          });
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
  const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency });

  // Multi-night price calc
  const price = useMemo(() => {
    const nightly = selectedRoom?.nightlyRate ?? stay?.nightlyRate ?? 0;
    const taxesPct = stay?.fees?.taxesPct ?? 0;
    const resortFeePerNight = stay?.fees?.resortFee ?? 0;

    const subtotalNights = nightly * nights;
    const resortFees = resortFeePerNight * nights;
    const taxes = +(subtotalNights * taxesPct).toFixed(2);
    const total = +(subtotalNights + resortFees + taxes).toFixed(2);

    return { nightly, taxesPct, resortFeePerNight, subtotalNights, resortFees, taxes, total };
  }, [stay, selectedRoom, nights]);

  // === NEW: Points Simulation ===
  const membershipNumber = "DL12345"; // replace with real member context
  const program = "Cars and Stays by Delta";

  const simInput = useMemo(() => {
    if (!stay || !checkInISO || !checkOutISO) return [];
    const nightly = selectedRoom?.nightlyRate ?? stay.nightlyRate ?? 0;
    if (!nightly) return [];
    return [
      {
        stayId: stay.id,
        propertyName: stay.name,
        city: stay.city,
        checkInISO,
        checkOutISO,
        nightlyRate: nightly,
        currency: stay.currency ?? "USD",
        nights,
      },
    ];
  }, [stay?.id, stay?.name, stay?.city, stay?.currency, selectedRoom?.nightlyRate, checkInISO, checkOutISO, nights]);

  const { getEstimate, error: simError } = usePointsSimulation({
    stays: simInput,
    program,
    membershipNumber,
    maxBatch: 1,
  });
  const estimate = simInput.length ? getEstimate(simInput[0]) : null;

  if (loading) return <div className="mx-auto max-w-4xl p-6">Loading checkout…</div>;

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
    const backHref = `/stay/${encodeURIComponent(s.id)}?guests=${encodeURIComponent(
      guests
    )}&nights=${encodeURIComponent(String(nights))}&checkIn=${encodeURIComponent(
      checkInISO
    )}&checkOut=${encodeURIComponent(checkOutISO)}`;
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

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stayId: s.id,
          roomCode: r.code,
          guests,
          nights,
          total: price.total,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        bookingId = json.bookingId || bookingId;
      }
    } catch {
      // ignore; keep fallback id
    }

    navigate(
      `/confirmation?booking=${encodeURIComponent(
        bookingId
      )}&stay=${encodeURIComponent(s.id)}&room=${encodeURIComponent(
        r.code
      )}&guests=${encodeURIComponent(guests)}&nights=${encodeURIComponent(
        String(nights)
      )}&checkIn=${encodeURIComponent(checkInISO)}&checkOut=${encodeURIComponent(checkOutISO)}`
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 grid gap-6 md:grid-cols-3">
      {/* Order summary */}
      <aside className="md:col-span-1">
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

            <div className="mt-2 border-t pt-2 flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>{fmt(price.total)}</span>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Guests: {guests} • Nights: {nights}
          </div>

          {/* NEW: Estimated Points pill */}
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-1">Estimated Points</div>
            <EstimatedPoints byCurrency={estimate} preferred={["Miles", "MQDs", "PTS"]} />
            {simError && (
              <div className="mt-2 text-xs text-yellow-800 bg-yellow-50 inline-block px-2 py-1 rounded">
                Points estimate unavailable right now.
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Guest & payment form (demo) */}
      <section className="md:col-span-2 rounded-2xl bg-white p-5 shadow">
        <div className="mb-4 text-lg font-semibold text-gray-900">Guest details</div>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700">First name</label>
              <input name="firstName" className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Last name</label>
              <input name="lastName" className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700">Email</label>
            <input name="email" className="mt-1 w-full rounded-md border px-3 py-2" />
          </div>

          <div className="mb-2 text-lg font-semibold text-gray-900">Payment</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700">Card number</label>
              <input name="cardNumber" className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Expiry (MM/YY)</label>
              <input name="expiry" className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700">CVC</label>
              <input name="cvc" className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Postal code</label>
              <input name="postal" className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            Confirm and pay
          </button>

          <div className="mt-3">
            <Link
              to={`/stay/${encodeURIComponent(s.id)}?guests=${encodeURIComponent(
                guests
              )}&nights=${encodeURIComponent(String(nights))}&checkIn=${encodeURIComponent(
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
  );
}

