// client/src/components/SearchBar.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// Demo list for typeahead (trim/extend as you like)
const CITY_OPTIONS = [
  "Chicago, Illinois, United States",
  "New York, New York, United States",
  "Los Angeles, California, United States",
  "Miami, Florida, United States",
  "Seattle, Washington, United States",
  "San Francisco, California, United States",
  "Boston, Massachusetts, United States",
  "Atlanta, Georgia, United States",
  "Dallas, Texas, United States",
  "Denver, Colorado, United States",
];

export default function SearchBar() {
  const nav = useNavigate();

  // Form state
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  // Typeahead state
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const checkInRef = useRef<HTMLInputElement | null>(null);

  // Filter suggestions
  const suggestions = useMemo(() => {
    const q = location.trim().toLowerCase();
    if (!q) return CITY_OPTIONS.slice(0, 8);
    return CITY_OPTIONS.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [location]);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Helpers
  function buildQuery(params: Record<string, string>) {
    const qp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v.trim() !== "") qp.set(k, v.trim());
    });
    return qp.toString();
  }

function submitNow() {
  // dates are optional; we only navigate with location (+ guests)
  const qp = new URLSearchParams();
  if (location.trim()) qp.set("location", location.trim());
  // optional: keep guests in URL for display
  qp.set("guests", String(guests || 1));
  nav(`/search?${qp.toString()}`);
}


  // Form submit → navigate
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitNow();
  }

  // Keyboard interaction on the location input
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Commit highlighted suggestion into the field, do NOT navigate yet
      e.preventDefault();
      const chosen =
        highlightIndex >= 0 && suggestions[highlightIndex]
          ? suggestions[highlightIndex]
          : location;
      if (chosen.trim()) {
        setLocation(chosen);
        setOpen(false);
        checkInRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full bg-white rounded-2xl shadow p-4 grid grid-cols-1 md:grid-cols-5 gap-3"
    >
      {/* Location + typeahead */}
      <div className="md:col-span-2 relative" ref={wrapRef}>
        <label className="text-sm font-medium text-gray-700">Where to?</label>
        <input
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="City, landmark, etc."
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="typeahead-listbox"
          role="combobox"
        />
        {open && suggestions.length > 0 && (
          <ul
            id="typeahead-listbox"
            role="listbox"
            className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            {suggestions.map((city, idx) => (
              <li
                key={city}
                role="option"
                aria-selected={idx === highlightIndex}
                className={`flex cursor-pointer items-start gap-3 px-3 py-2 ${
                  idx === highlightIndex ? "bg-indigo-50" : "hover:bg-gray-50"
                }`}
                onMouseEnter={() => setHighlightIndex(idx)}
                onMouseDown={(e) => {
                  // Keep focus so click works cleanly; fill but don't navigate
                  e.preventDefault();
                  setLocation(city);
                  setOpen(false);
                  checkInRef.current?.focus();
                }}
              >
                <span className="mt-0.5">📍</span>
                <div>
                  <div className="font-medium text-gray-900">
                    {city.split(",")[0]}
                  </div>
                  <div className="text-xs text-gray-600">
                    {city.split(",").slice(1).join(",")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dates */}
      <div>
        <label className="text-sm font-medium text-gray-700">Check-in</label>
        <input
          ref={checkInRef}
          type="date"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Check-out</label>
        <input
          type="date"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
        />
      </div>

      {/* Guests + submit */}
      {/* Guests + submit */}
<div className="flex items-end gap-2">
  <div className="flex-1">
    <label className="text-sm font-medium text-gray-700">Guests</label>
    <input
      type="number"
      min={1}
      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      value={guests}
      onChange={(e) => setGuests(Number(e.target.value))}
    />
  </div>
  <button
    type="submit"
    className="h-10 self-end rounded-lg bg-indigo-500 px-5 text-white font-medium hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
  >
    Search
  </button>
</div>

    </form>
  );
}
