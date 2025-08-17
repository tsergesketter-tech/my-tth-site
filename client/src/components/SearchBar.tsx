// src/components/SearchBar.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, startOfToday, addDays, isBefore } from "date-fns";
import { useSearch } from "../context/SearchContext";

// If you have CITY_OPTIONS elsewhere, import it. Otherwise, small fallback:
const CITY_OPTIONS = [
  "Chicago, IL, USA",
  "New York, NY, USA",
  "San Francisco, CA, USA",
  "Miami, FL, USA",
  "Los Angeles, CA, USA",
  "Boston, MA, USA",
  "Seattle, WA, USA",
  "Austin, TX, USA",
];

export default function SearchBar() {
  const navigate = useNavigate();
  const { setSearch, computeNights } = useSearch();

  // Form state
  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState(2);

  // Date range state (replaces two <input type="date">)
  const [range, setRange] = useState<DateRange | undefined>({
    from: startOfToday(),
    to: addDays(startOfToday(), 1),
  });

  // Derived ISO strings for URL/context (keeps your existing flow intact)
  const checkIn = range?.from ? range.from.toISOString().slice(0, 10) : "";
  const checkOut = range?.to
    ? range.to.toISOString().slice(0, 10)
    : range?.from
    ? addDays(range.from, 1).toISOString().slice(0, 10)
    : "";

  // Typeahead state
  const [openList, setOpenList] = useState(false);
  const [hi, setHi] = useState<number>(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Calendar popover state
  const [openCal, setOpenCal] = useState(false);
  const calWrapRef = useRef<HTMLDivElement | null>(null);

  // Suggestions
  const suggestions = useMemo(() => {
    const q = location.trim().toLowerCase();
    if (!q) return CITY_OPTIONS.slice(0, 8);
    return CITY_OPTIONS.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [location]);

  // Close list on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenList(false);
      }
      if (calWrapRef.current && !calWrapRef.current.contains(e.target as Node)) {
        setOpenCal(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Helpers
  function buildQuery(params: Record<string, string | number | undefined>) {
    const qp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && String(v).trim() !== "") qp.set(k, String(v).trim());
    });
    return qp.toString();
  }

  // Submit handler (calculates nights, stores context, navigates with params)
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nights = computeNights(checkIn || undefined, checkOut || undefined);

    setSearch({
      city: location || undefined,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      guests,
      nights,
    });

    const qs = buildQuery({
      city: location,
      checkIn,
      checkOut,
      guests,
      nights,
    });

    navigate(`/search?${qs}`);
  }

  // Keyboard interaction on the location input
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!openList && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpenList(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = hi >= 0 && suggestions[hi] ? suggestions[hi] : location;
      if (chosen.trim()) {
        setLocation(chosen);
        setOpenList(false);
        setOpenCal(true);
      }
    } else if (e.key === "Escape") {
      setOpenList(false);
    }
  }

  // Display label for date button
  const dateLabel =
    range?.from && range?.to
      ? `${format(range.from, "MMM d, yyyy")} — ${format(range.to, "MMM d, yyyy")}`
      : range?.from
      ? `${format(range.from, "MMM d, yyyy")} — Pick check-out`
      : "Select dates";

  return (
    <form
      onSubmit={onSubmit}
      className="w-full bg-white rounded-2xl shadow p-4 grid grid-cols-1 md:grid-cols-5 gap-3"
      role="search"
      aria-label="Stay search"
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
            setOpenList(true);
            setHi(-1);
          }}
          onFocus={() => setOpenList(true)}
          onKeyDown={onKeyDown}
          aria-autocomplete="list"
          aria-expanded={openList}
          aria-controls="typeahead-listbox"
          role="combobox"
        />
        {openList && suggestions.length > 0 && (
          <ul
            id="typeahead-listbox"
            role="listbox"
            className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            {suggestions.map((city, idx) => (
              <li
                key={city}
                role="option"
                aria-selected={idx === hi}
                className={`flex cursor-pointer items-start gap-3 px-3 py-2 ${
                  idx === hi ? "bg-indigo-50" : "hover:bg-gray-50"
                }`}
                onMouseEnter={() => setHi(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setLocation(city);
                  setOpenList(false);
                  setOpenCal(true);
                }}
              >
                <span className="mt-0.5">📍</span>
                <div>
                  <div className="font-medium text-gray-900">{city.split(",")[0]}</div>
                  <div className="text-xs text-gray-600">
                    {city.split(",").slice(1).join(",")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Date range popover */}
      <div className="relative md:col-span-2" ref={calWrapRef}>
        <label className="text-sm font-medium text-gray-700">Dates</label>
        <button
          type="button"
          onClick={() => setOpenCal((s) => !s)}
          className="mt-1 w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <span className="truncate text-gray-800">{dateLabel}</span>
          <svg
            className={`h-4 w-4 text-gray-500 transition-transform ${openCal ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {openCal && (
          <div className="absolute z-40 mt-2 w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={(r) => {
                if (r?.from && r?.to && isBefore(r.to, r.from)) {
                  setRange({ from: r.to, to: r.from });
                } else {
                  setRange(r);
                }
              }}
              defaultMonth={range?.from ?? startOfToday()}
              disabled={{ before: startOfToday() }}
              numberOfMonths={1}
              weekStartsOn={0}
              classNames={{
                caption: "flex justify-between items-center px-1 py-2",
                nav: "flex items-center gap-2",
                nav_button_previous: "p-1 rounded hover:bg-gray-100",
                nav_button_next: "p-1 rounded hover:bg-gray-100",
                months: "flex gap-4",
                table: "w-full border-collapse",
                head_row: "grid grid-cols-7 gap-1 text-xs text-gray-500 px-1",
                head_cell: "text-center py-1",
                row: "grid grid-cols-7 gap-1 px-1",
                cell: "text-center",
                day: "h-9 w-9 rounded-full hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500",
                day_selected: "bg-black text-white hover:bg-black focus:bg-black",
                day_range_start: "bg-black text-white hover:bg-black rounded-full",
                day_range_end: "bg-black text-white hover:bg-black rounded-full",
                day_range_middle: "bg-gray-200 text-black hover:bg-gray-200",
              }}
            />
            <div className="mt-2 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setRange(undefined)}
                className={`underline ${range ? "text-gray-700" : "text-gray-300 cursor-default"}`}
                disabled={!range}
              >
                Reset
              </button>
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
                onClick={() => setOpenCal(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guests + submit */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">Guests</label>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={guests}
            onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
          />
        </div>
        <button
          type="submit"
          className="h-10 self-end rounded-lg bg-indigo-600 px-5 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          Search
        </button>
      </div>
    </form>
  );
}
