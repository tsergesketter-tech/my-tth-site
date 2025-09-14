import { useEffect, useMemo, useState } from "react";
import { DEMO_VOUCHERS, type Voucher } from "../../data/memberDemo";
import { fetchMemberVouchers } from "../../utils/vouchersApi";

const statusColors: Record<Voucher["status"], string> = {
  Active: "bg-emerald-100 text-emerald-800",
  Used: "bg-gray-100 text-gray-700",
  Expired: "bg-rose-100 text-rose-800",
};

type VouchersListProps = {
  /** Set to true to use demo data instead of fetching from Salesforce */
  useDemoData?: boolean;
};

export default function VouchersList({ useDemoData = false }: VouchersListProps) {
  const [show, setShow] = useState<"All" | Voucher["status"]>("All");
  const [vouchers, setVouchers] = useState<Voucher[]>(useDemoData ? DEMO_VOUCHERS : []);
  const [loading, setLoading] = useState(!useDemoData);
  const [error, setError] = useState<string | null>(null);

  // Fetch vouchers from Salesforce API
  useEffect(() => {
    if (useDemoData) return;

    async function loadVouchers() {
      try {
        setLoading(true);
        setError(null);

        // fetchMemberVouchers now handles session creation internally
        const response = await fetchMemberVouchers();
        setVouchers(response.vouchers);
      } catch (err: any) {
        console.error('Failed to fetch vouchers:', err);
        setError(err.message || 'Failed to load vouchers');
        // Fallback to demo data on error
        setVouchers(DEMO_VOUCHERS);
      } finally {
        setLoading(false);
      }
    }

    loadVouchers();
  }, [useDemoData]);

  const list = useMemo(() => {
    return show === "All" ? vouchers : vouchers.filter(v => v.status === show);
  }, [show, vouchers]);

  return (
    <div className="rounded-2xl bg-white border shadow p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="font-semibold text-gray-900">
          Vouchers & Certificates
          {loading && <span className="ml-2 text-sm text-gray-500">(Loading...)</span>}
          {error && <span className="ml-2 text-sm text-red-500" title={error}>(Error)</span>}
        </h3>
        <div className="flex gap-2">
          {(["All", "Active", "Used", "Expired"] as const).map(s => (
            <button
              key={s}
              onClick={() => setShow(s as any)}
              className={[
                "px-3 py-1.5 rounded-full text-sm border",
                show === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-3"></div>
          Loading vouchers...
        </div>
      ) : error && vouchers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>{error}</p>
          <p className="text-sm mt-2">Using demo data as fallback</p>
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No vouchers found</p>
          {show !== "All" && (
            <p className="text-sm mt-2">Try selecting "All" to see all vouchers</p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map(v => (
          <li key={v.id} className="rounded-xl border p-3 flex items-start justify-between">
            <div>
              <div className="font-medium text-gray-900">
                {v.type}
                {v.originalType && v.originalType !== v.type && (
                  <span className="ml-2 text-sm font-normal text-gray-500">({v.originalType})</span>
                )}
              </div>
              <div className="text-sm text-gray-600">Code: <span className="font-mono">{v.code}</span></div>
              {typeof v.value === "number" && (
                <div className="text-sm text-gray-700">
                  {/* Handle different value display formats */}
                  {v.type?.toLowerCase().includes("% off") || v.type?.toLowerCase().includes("percent") 
                    ? `${v.value}% discount` 
                    : `${v.currency || "USD"} ${v.value.toLocaleString()}`
                  }
                </div>
              )}
              {v.notes && <div className="text-xs text-gray-500 mt-1">{v.notes}</div>}
            </div>
            <div className="text-right">
              <div className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusColors[v.status]}`}>{v.status}</div>
              <div className="text-xs text-gray-500 mt-1">Expires {new Date(v.expiresOn).toLocaleDateString()}</div>
              <button className="mt-2 text-indigo-600 text-sm hover:underline">View details</button>
            </div>
          </li>
        ))}
        </ul>
      )}
    </div>
  );
}
export{};
