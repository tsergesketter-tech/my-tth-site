import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar() {
  const nav = useNavigate();
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({
      location: location.trim(),
      checkIn,
      checkOut,
      guests: String(guests),
    });
    nav(`/search?${q.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="w-full bg-white rounded-2xl shadow p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-gray-700">Where to?</label>
        <input
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="City, landmark, etc."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Check-in</label>
        <input
          type="date"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Check-out</label>
        <input
          type="date"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
        />
      </div>
      <div className="flex items-end">
        <div className="flex w-full gap-2">
          <input
            type="number"
            min={1}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value || "1", 10))}
            aria-label="Guests"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}