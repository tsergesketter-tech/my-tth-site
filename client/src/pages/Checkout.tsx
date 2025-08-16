// src/pages/Checkout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

type Room = { code: string; name: string; nightlyRate: number; refundable: boolean };
type Stay = {
  id: string;
  name: string;
  city: string;
  nightlyRate: number;
  gallery?: string[];
  rooms?: Room[];
  fees?: { taxesPct: number; resortFee: number };
};

export default function Checkout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const stayId = params.get("stay") || "";
  const roomCode = params.get("room") || "";
  const guests = params.get("guests") || "1";

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

  const price = useMemo(() => {
    const nightly = selectedRoom?.nightlyRate ?? stay?.nightlyRate ?? 0;
    const taxesPct = stay?.fees?.taxesPct ?? 0;
    const resortFee = stay?.fees?.resortFee ?? 0;
    const taxes = Math.round(nightly * taxesPct * 100) / 100;
    const total = Math.round((nightly + resortFee + taxes) * 100) / 100;
    return { nightly, taxes, resortFee, total };
  }, [stay, selectedRoom]);

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

  // From here down, stay is non-null
  const s = stay as NonNullable<typeof stay>;

  if (!selectedRoom) {
    const backHref = `/stay/${encodeURIComponent(s.id)}?guests=${encodeURIComponent(guests)}`;
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
    e.preventDefault(); // stay in SPA

    // DEMO: ignore field contents entirely; just create a booking id and go
    let bookingId = `BK-${Date.now()}`;

    // If you later wire a real API, you can keep this try/catch:
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stayId: s.id,
          roomCode: r.code,
          guests,
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
      `/confirmation?booking=${encodeURIComponent(bookingId)}&stay=${encodeURIComponent(
        s.id
      )}&room=${encodeURIComponent(r.code)}&guests=${encodeURIComponent(guests)}`
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
              <span>Nightly</span>
              <span>${price.nightly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Resort fee</span>
              <span>${price.resortFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes</span>
              <span>${price.taxes.toLocaleString()}</span>
            </div>
            <div className="mt-2 border-t pt-2 flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>${price.total.toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">Guests: {guests}</div>
        </div>
      </aside>

      {/* Guest & payment form (no validation) */}
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
            {/* type="text" to avoid any browser validation popups */}
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
              to={`/stay/${encodeURIComponent(s.id)}?guests=${encodeURIComponent(guests)}`}
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
