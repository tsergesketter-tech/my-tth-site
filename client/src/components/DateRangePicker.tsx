import React, { useEffect, useRef, useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import { format, isBefore, startOfToday } from "date-fns";

type Props = {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  minDate?: Date; // default: today (no past dates)
  label?: string; // e.g., "Dates"
  className?: string;
};

export default function DateRangePicker({
  value,
  onChange,
  minDate = startOfToday(),
  label = "Dates",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const fromStr = value?.from ? format(value.from, "MMM d, yyyy") : "Check-in";
  const toStr =
    value?.to && value?.from
      ? format(value.to, "MMM d, yyyy")
      : "Check-out";

  const canReset = !!value?.from || !!value?.to;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className="truncate text-gray-800">
          {fromStr} — {toStr}
        </span>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

{open && (
  <div className="tth-datepicker absolute z-50 mt-2 w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
    <DayPicker
      mode="range"
      selected={value}
      onSelect={(range) => {
        if (range?.from && range?.to && range.to < range.from) {
          onChange({ from: range.to, to: range.from });
        } else {
          onChange(range);
        }
      }}
      numberOfMonths={2}
      weekStartsOn={0}
      showOutsideDays
      disabled={{ before: new Date() }}
      fromMonth={new Date()}
      className="mx-auto"
      classNames={{
        /* base day: no bg, no rounding */
        day: "h-9 w-9 text-gray-900 rounded-none focus:outline-none hover:bg-gray-100",
        row: "grid grid-cols-7 gap-0 px-1",
        cell: "text-center p-0",

        /* IMPORTANT: neutralize generic selected so it does nothing */
        day_selected: "",

        /* use these to style range states */
        day_range_middle: "",
        day_range_start: "",
        day_range_end: "",
      }}
    />

    <div className="mt-2 flex items-center justify-between text-sm">
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className={`underline ${value ? "text-gray-700" : "text-gray-300 cursor-default"}`}
        disabled={!value}
      >
        Reset
      </button>
      <button
        type="button"
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
        onClick={() => setOpen(false)}
      >
        Done
      </button>
    </div>
  </div>
)}
    </div>
  );
}
