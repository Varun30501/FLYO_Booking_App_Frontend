// src/pages/admin/ReconciliationRunView.jsx
import React, { useEffect, useState } from "react";
import { get, post } from "../../services/api";

/**
 * ReconciliationRunView
 * - Shows run summary and entries table
 * - Allows retrying a booking via POST /api/admin/reconcile/booking/:id/retry
 */
export default function ReconciliationRunView({ logId }) {
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!logId) return;
    fetchLog();
    // eslint-disable-next-line
  }, [logId]);

  async function fetchLog() {
    setLoading(true);
    setError(null);
    try {
      const res = await get(`/admin/reconcile/logs/${encodeURIComponent(logId)}`);

      if (!res) {
        setError("Empty response from server");
        setLog(null);
        return;
      }

      // Possible shapes:
      // { ok: true, log: { ... } }
      // { log: { ... } }
      // log object directly
      // sometimes nested under data: { data: { log: {...} } } (unlikely)
      let payloadLog = null;
      if (res.ok && res.log) payloadLog = res.log;
      else if (res.log) payloadLog = res.log;
      else if (res._id || res.entries || res.results) payloadLog = res;
      else if (res.data && (res.data.log || res.data._id || res.data.entries)) payloadLog = res.data.log || res.data;
      else {
        console.warn("[ReconciliationRunView] unexpected run response", res);
        setError("Failed to load run (unexpected response)");
        setLog(null);
        return;
      }

      setLog(payloadLog);
    } catch (err) {
      console.error("fetchLog error", err);
      setError(err?.response?.data?.error || err?.message || String(err));
      setLog(null);
    } finally {
      setLoading(false);
    }
  }

  async function retryBooking(bookingIdRaw) {
    const bookingId = bookingIdRaw || bookingIdRaw === 0 ? bookingIdRaw : null;
    if (!bookingId) {
      setError("Invalid booking id for retry");
      return;
    }

    setRetrying((s) => ({ ...s, [bookingId]: true }));
    setError(null);
    try {
      const res = await post(`/admin/reconcile/booking/${encodeURIComponent(String(bookingId))}/retry`, {});

      if (!res) {
        setError("Empty response from retry endpoint");
        return;
      }

      if (res.ok === false) {
        setError(res.error || "Retry failed");
        return;
      }

      // success -> refresh log
      await fetchLog();
    } catch (err) {
      console.error("retryBooking error", err);
      setError(err?.response?.data?.error || err?.message || String(err));
    } finally {
      setRetrying((s) => ({ ...s, [bookingId]: false }));
    }
  }

  if (loading) return <div>Loading run...</div>;
  if (!log) return <div className="text-sm text-gray-500">No run selected</div>;

  // normalize counts (support different field names)
  const processed = typeof log.processed === "number" ? log.processed : (log.processedCount ?? '-');
  const updated = typeof log.updated === "number" ? log.updated : (log.updatedCount ?? '-');
  const failed = typeof log.failed === "number" ? log.failed : (log.failedCount ?? '-');

  // normalize entries array from possible fields
  const entries = Array.isArray(log.entries)
    ? log.entries
    : (Array.isArray(log.results) ? log.results : (Array.isArray(log.entriesList) ? log.entriesList : []));

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Run details</h3>
          <div className="text-sm text-gray-500">
            {new Date(log.runAt || log.createdAt || Date.now()).toLocaleString()} — By: {log.runBy || 'system'}
          </div>
        </div>
        <div className="text-sm">
          <div>Processed: {processed}</div>
          <div>Updated: {updated}</div>
          <div className="text-red-600">Failed: {failed}</div>
        </div>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      <div className="overflow-auto max-h-[55vh]">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Booking ID</th>
              <th className="p-2">PaymentIntent</th>
              <th className="p-2">Before</th>
              <th className="p-2">After</th>
              <th className="p-2">Result</th>
              <th className="p-2">Message</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td className="p-4 text-sm text-gray-500" colSpan={7}>No entries</td></tr>
            )}
            {entries.map((e, idx) => {
              const bookKey = e.bookingId || e._id || e.booking || idx;
              const paymentIntent = e.paymentIntentId || e.paymentIntent || e.paymentIdUsed || e.paymentId || "-";
              const before = [
                e.beforePaymentStatus,
                e.beforeBookingStatus
              ].filter(Boolean).join(" / ") || "-";

              const after = [
                e.afterPaymentStatus,
                e.afterBookingStatus
              ].filter(Boolean).join(" / ") || "-";

              const result = e.result || "-";
              const message = e.message || "-";

              return (
                <tr key={bookKey} className="border-b">
                  <td className="p-2 align-top text-xs break-all">{String(bookKey)}</td>
                  <td className="p-2 align-top text-xs break-all">{paymentIntent}</td>
                  <td className="p-2 align-top text-sm">{before}</td>
                  <td className="p-2 align-top text-sm">{after}</td>
                  <td className="p-2 align-top text-sm">{result}</td>
                  <td className="p-2 align-top text-sm break-words">{message}</td>
                  <td className="p-2 align-top">
                    {e.result !== 'MATCH' && (
                      <button
                        onClick={() => retryBooking(e.bookingId || e._id || e.booking)}
                        disabled={!!retrying[e.bookingId || e._id || e.booking]}
                        className="px-2 py-1 text-sm rounded border hover:bg-white/10"
                      >
                        {retrying[e.bookingId || e._id || e.booking] ? "Retrying..." : "Retry"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
