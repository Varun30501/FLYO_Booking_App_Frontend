// src/pages/admin/ReconcileBookingList.jsx
import React, { useEffect, useState } from "react";
import api from "../../services/api";

/**
 * Fetch suggested bookings from a custom endpoint you may create (optional)
 * If you don't have such endpoint, you can reuse /api/admin/reconcile/logs or create /api/admin/bookings/reconcile-candidates
 */
export default function ReconcileBookingList() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  async function fetchCandidates() {
    setLoading(true);
    setError(null);
    try {
      // Example: backend route to return bookings needing reconciliation
      const res = await api.get("/admin/bookings/reconcile-candidates");
      if (res.data && res.data.ok) setCandidates(res.data.bookings || []);
      else setError("Failed to fetch candidates");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function retry(bookingId) {
    setProcessing((s) => ({ ...s, [bookingId]: true }));
    try {
      const res = await axios.post(`/api/admin/reconcile/booking/${bookingId}/retry`);
      if (res.data && res.data.ok) {
        // optionally remove from list or refetch
        setCandidates((c) => c.filter((b) => String(b._id) !== String(bookingId)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing((s) => ({ ...s, [bookingId]: false }));
    }
  }

  return (
    <div className="p-4 bg-white border rounded">
      <h3 className="mb-3 font-medium">Reconcile Candidates</h3>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading ? <div>Loading...</div> : (
        <ul className="space-y-2">
          {candidates.map((b) => (
            <li key={b._id} className="flex items-center justify-between border p-2 rounded">
              <div className="text-sm">
                <div><strong>{b._id}</strong></div>
                <div className="text-xs text-gray-500">Status: {b.paymentStatus} • Intent: {b.paymentIntentId || "—"}</div>
              </div>
              <div>
                <button
                  onClick={() => retry(b._id)}
                  disabled={!!processing[b._id]}
                  className="px-3 py-1 rounded border"
                >
                  {processing[b._id] ? "Retrying..." : "Retry"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
