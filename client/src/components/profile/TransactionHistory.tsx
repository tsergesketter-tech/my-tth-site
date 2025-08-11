import React, { useEffect, useMemo, useState } from "react";

type Txn = {
  id: string;
  date: string | null;
  type?: string | null;
  subType?: string | null;
  description?: string;
  pointsDelta?: number;
  currencyAmount?: number | null;
  currencyCode?: string | null;
  partner?: string | null;
  status?: string | null;
  balanceAfter?: number | null;
  _raw?: any;
};

type ApiResponse = {
  page: number;
  pageSize?: number;
  totalPages?: number;
  nextPage?: number | null;
  prevPage?: number | null;
  items: Txn[];
  raw?: any;
};

export default function TransactionHistory() {
  // Defaults from your example
  const [membershipNumber, setMembershipNumber] = useState("DL12345");
  const [journalType, setJournalType] = useState<string>("Accrual");
  const [journalSubType, setJournalSubType] = useState<string>("Social");
  const [start, setStart] = useState("2024-12-31");
  const [end, setEnd] = useState("2025-12-31");

  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ISO strings the API expects
  const isoStart = useMemo(() => new Date(`${start}T00:00:00Z`).toISOString(), [start]);
  const isoEnd = useMemo(() => new Date(`${end}T00:00:00Z`).toISOString(), [end]);

  const fetchPage = async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/loyalty/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program: "Cars and Stays by Delta",
          page: p,
          membershipNumber,
          journalType: journalType || undefined,
          journalSubType: journalSubType || undefined,
          periodStartDate: isoStart,
          periodEndDate: isoEnd,
        }),
      });
      const json = (await res.json()) as ApiResponse | { message?: string };
      if (!res.ok) throw new Error((json as any)?.message || `HTTP ${res.status}`);
      setData(json as ApiResponse);
      setPage((json as ApiResponse).page ?? p);
    } catch (e: any) {
      setError(e?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmtDate = (s?: string | null) =>
    s ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(new Date(s)) : "";

  const fmtNum = (n?: number | null) => (n === undefined || n === null ? "" : new Intl.NumberFormat().format(n));

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Transaction History</h1>

      {/* Filters */}
      <section className="bg-white border rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Membership #</label>
            <input className="w-full border rounded-md px-3 py-2" value={membershipNumber}
                   onChange={(e) => setMembershipNumber(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Journal Type</label>
            <select className="w-full border rounded-md px-3 py-2" value={journalType}
                    onChange={(e) => setJournalType(e.target.value)}>
              <option value="">Any</option>
              <option value="Accrual">Accrual</option>
              <option value="Redemption">Redemption</option>
              <option value="Adjustment">Adjustment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sub-Type</label>
            <input className="w-full border rounded-md px-3 py-2" value={journalSubType}
                   onChange={(e) => setJournalSubType(e.target.value)} placeholder="e.g., Social" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start</label>
            <input type="date" className="w-full border rounded-md px-3 py-2" value={start}
                   onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End</label>
            <input type="date" className="w-full border rounded-md px-3 py-2" value={end}
                   onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => fetchPage(1)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold"
              disabled={loading}
            >
              {loading ? "Loading…" : "Apply Filters"}
            </button>
          </div>
        </div>
      </section>

      {/* Errors */}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Table */}
      <section className="bg-white border rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Date</th>
                <th className="text-left font-semibold px-4 py-3">Type</th>
                <th className="text-left font-semibold px-4 py-3">Sub-Type</th>
                <th className="text-left font-semibold px-4 py-3">Description</th>
                <th className="text-right font-semibold px-4 py-3">Points Δ</th>
                <th className="text-right font-semibold px-4 py-3">Amount</th>
                <th className="text-left font-semibold px-4 py-3">Partner</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-right font-semibold px-4 py-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td className="px-4 py-6 text-gray-400" colSpan={9}>Loading…</td></tr>
              )}
              {!loading && data?.items?.length === 0 && (
                <tr><td className="px-4 py-6 text-gray-500" colSpan={9}>No transactions found.</td></tr>
              )}
              {!loading && data?.items?.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3">{fmtDate(t.date)}</td>
                  <td className="px-4 py-3">{t.type || "—"}</td>
                  <td className="px-4 py-3">{t.subType || "—"}</td>
                  <td className="px-4 py-3">{t.description || "—"}</td>
                  <td className="px-4 py-3 text-right">{fmtNum(t.pointsDelta)}</td>
                  <td className="px-4 py-3 text-right">
                    {t.currencyAmount != null ? `${fmtNum(t.currencyAmount)} ${t.currencyCode ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-3">{t.partner || "—"}</td>
                  <td className="px-4 py-3">{t.status || "—"}</td>
                  <td className="px-4 py-3 text-right">{t.balanceAfter != null ? fmtNum(t.balanceAfter) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <div className="text-xs text-gray-500">
            Page {data?.page ?? page}
            {data?.totalPages ? ` of ${data.totalPages}` : ""}
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded border bg-white disabled:opacity-50"
              disabled={!data?.prevPage || loading}
              onClick={() => data?.prevPage && fetchPage(data.prevPage)}
            >
              Prev
            </button>
            <button
              className="px-3 py-1.5 rounded border bg-white disabled:opacity-50"
              disabled={!data?.nextPage || loading}
              onClick={() => data?.nextPage && fetchPage(data.nextPage)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Debug (optional) */}
      {/* <pre className="mt-4 text-xs bg-gray-100 p-3 rounded overflow-x-auto">{JSON.stringify(data?.raw, null, 2)}</pre> */}
    </main>
  );
}
