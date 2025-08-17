import React from "react";

type Props = {
  byCurrency: Record<string, number> | null;
  /** Accept a string or a list in priority order */
  preferred?: string | string[];
  /** Optional label override */
  label?: string;
};

export default function EstimatedPoints({ byCurrency, preferred = ["Miles", "MQDs", "PTS", "Points"], label = "Estimated Points" }: Props) {
  if (!byCurrency) {
    return (
      <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs text-gray-600">
        {label}: —
      </span>
    );
  }

  const prefList = Array.isArray(preferred) ? preferred : [preferred];
  const keys = Object.keys(byCurrency);

  // pick a primary value by priority, otherwise first available
  const primaryKey =
    prefList.find(k => byCurrency[k] != null) ??
    (keys.length ? keys[0] : null);

  const primary = primaryKey != null ? byCurrency[primaryKey] : null;

  // also surface a simple breakdown if there are multiple currencies
  const others = keys.filter(k => k !== primaryKey);

  return (
    <div className="inline-flex items-center gap-2">
      <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs">
        {label}: <b className="ml-1">{primary != null ? Number(primary).toLocaleString() : "—"}</b>
        {primaryKey ? <span className="ml-1 text-gray-600">({primaryKey})</span> : null}
      </span>
      {others.length > 0 && (
        <span className="text-[11px] text-gray-500">
          {others.map(k => `${Number(byCurrency[k]).toLocaleString()} ${k}`).join(" • ")}
        </span>
      )}
    </div>
  );
}

