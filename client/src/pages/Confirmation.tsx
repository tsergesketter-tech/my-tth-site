import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

type Room = { code: string; name: string; nightlyRate: number; refundable: boolean };
type Stay = {
  id: string;
  name: string;
  city: string;
  gallery?: string[];
  rooms?: Room[];
  fees?: { taxesPct: number; resortFee: number };
};

export default function Confirmation() {
  const [params] = useSearchParams();
  const bookingId = params.get("booking") || "";
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

        // fetch stay by id, then by slug as fallback
        const base = window.location.origin;
        let res = await fetch(`${base}/api/stays/${encodeURIComponent(stayId)}`);
        if (!res.ok) {
          res = await fetch(`${base}/api/stays/by-slug/${encodeURIComponent(stayId)}`);
          if (!res.ok) throw new Error(`Stay not found (${stayId})`);
        }
        const data: Stay = await res.json();
        setStay(data);
      } catch (e: any) {
        setError(e.message || "Failed to load confirmation");
      } finally {
        setLoading(false);
      }
    })();
  }, [stayId]);

  const room = useMemo(
    () => (stay?.rooms || []).find((r) => r.code === roomCode) || null,
    [stay, roomCode]
  );

  if (loading) return <div className="mx-auto max-w-4xl p-6">Loading confirmation…</div>;
  if (error || !stay) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl bg-red-50 p-6 text-red-700 shadow">{error || "Not found"}</div>
        <div className="mt-4">
          <Link to="/search" className="text-indigo-600 hover:underline">Back to search</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header card */}
      <div className="rounded-2xl bg-white p-6 shadow flex items-start gap-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
          aria-hidden
        >
          ✓
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-600">Booking confirmed</div>
          <h1 className="text-2xl font-semibold text-gray-900">{stay.name}</h1>
          <div className="mt-1 text-sm text-gray-700">
            {stay.city} • Guests: {guests}
            {room ? <> • Room: {room.name}</> : roomCode ? <> • Room code: {roomCode}</> : null}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Confirmation #: <span className="font-mono text-gray-900">{bookingId}</span>
          </div>
        </div>
        {stay.gallery?.[0] && (
          <img
            src={stay.gallery[0]}
            className="h-20 w-28 rounded-lg object-cover"
            alt={stay.name}
          />
        )}
      </div>

      {/* Next steps */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <section className="md:col-span-2 rounded-2xl bg-white p-5 shadow">
          <div className="mb-3 text-lg font-semibold text-gray-900">What’s next</div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• We’ve sent a confirmation email with your booking details.</li>
            <li>• You can manage your stay, change guests, or update payment from your account.</li>
            <li>• Bring a valid ID and the card used to book at check-in.</li>
          </ul>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to={`/member`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Go to My Trips
            </Link>
            <Link
              to={`/stay/${encodeURIComponent(stay.id)}?guests=${encodeURIComponent(guests)}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-50"
            >
              View property
            </Link>
            <Link
              to={`/search?location=${encodeURIComponent(stay.city)}&guests=${encodeURIComponent(
                guests
              )}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-50"
            >
              Keep browsing
            </Link>
          </div>
        </section>

        {/* Summary */}
        <aside className="md:col-span-1 rounded-2xl bg-white p-5 shadow">
          <div className="font-medium text-gray-900">Summary</div>
          <div className="mt-2 text-sm text-gray-700">
            <div>Hotel: {stay.name}</div>
            <div>City: {stay.city}</div>
            <div>Guests: {guests}</div>
            <div>Room: {room?.name || roomCode || "—"}</div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Need help? Contact support with your confirmation number.
          </div>
        </aside>
      </div>
    </div>
  );
}
