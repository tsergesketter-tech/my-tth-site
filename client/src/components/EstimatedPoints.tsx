// client/src/components/EstimatedPoints.tsx
import React from "react";

type Props = {
  byCurrency: Record<string, number> | null;
  preferred?: string | string[];
  show?: string[];
  label?: string;
  className?: string;
  maxBadges?: number;
  loading?: boolean;

  /** NEW: layout + size tweaks for tight spaces like Checkout */
  variant?: "inline" | "split"; // inline = old behavior, split = label left, chips right
  size?: "md" | "sm";           // sm = smaller chips/label
};

export default function EstimatedPoints({
  byCurrency,
  preferred = ["Miles", "MQDs", "PTS", "Points"],
  show,
  label = "Estimated Points",
  className = "",
  maxBadges = 3,
  loading = false,
  variant = "inline",
  size = "md",
}: Props) {
  const order = Array.isArray(show) ? show : Array.isArray(preferred) ? preferred : [preferred];

  const boxBase =
    "rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800 " +
    (variant === "split"
      ? "flex items-center gap-2 px-3 py-2"
      : "inline-flex flex-wrap items-center gap-2 px-2 py-1") +
    " " + className;

  const labelCls =
    (size === "sm" ? "text-[11px]" : "text-xs") + " font-medium " + (variant === "split" ? "flex-none" : "");

  const chipCls =
    "inline-flex items-center rounded-full bg-indigo-600 text-white " +
    (size === "sm" ? "px-2 py-[2px] text-[11px]" : "px-2 py-0.5 text-xs") +
    "";

  const chipsWrapCls =
    "flex items-center gap-2 " +
    // Let chips stay on one line on medium+ widths; wrap gracefully on very small
    (variant === "split" ? "flex-1 min-w-0 flex-wrap md:flex-nowrap overflow-x-auto" : "");

  const Skeleton = () => (
    <div className={boxBase} aria-busy aria-live="polite">
      <span className={labelCls}>{label}:</span>
      <div className={chipsWrapCls}>
        <span className={(size === "sm" ? "h-5 w-20" : "h-6 w-24") + " animate-pulse rounded-full bg-indigo-200/80"} />
        <span className={(size === "sm" ? "h-5 w-16" : "h-6 w-20") + " animate-pulse rounded-full bg-indigo-200/80"} />
        <span className="sr-only">Loading estimated points…</span>
      </div>
    </div>
  );

  if (loading) return <Skeleton />;

  if (!byCurrency || Object.keys(byCurrency).length === 0) {
    return (
      <div className={boxBase} aria-label={`${label}: unavailable`}>
        <span className={labelCls}>{label}:</span>
        <div className={chipsWrapCls}>
          <span className={chipCls}>—</span>
        </div>
      </div>
    );
  }

  const entries = Object.entries(byCurrency).sort((a, b) => {
    const ia = order.indexOf(a[0]);
    const ib = order.indexOf(b[0]);
    if (ia === -1 && ib === -1) return a[0].localeCompare(b[0]);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const chips = entries.slice(0, maxBadges);

  return (
    <div className={boxBase} aria-label={label}>
      <span className={labelCls}>{label}:</span>
      <div className={chipsWrapCls}>
        {chips.map(([name, value]) => (
          <span key={name} className={chipCls} title={`${value} ${name}`}>
            {Number(value).toLocaleString()} {name}
          </span>
        ))}
        {entries.length > chips.length && (
          <span className={size === "sm" ? "text-[11px] text-indigo-700" : "text-xs text-indigo-700"}>
            +{entries.length - chips.length}
          </span>
        )}
      </div>
    </div>
  );
}


