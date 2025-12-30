// src/pages/admin/AdminPayments.jsx
import React, { useEffect, useState } from 'react';
import { get } from '../../services/api';
import LoadingBlock from '../../components/LoadingBlock';
import ErrorBanner from '../../components/ErrorBanner';
import PaymentBadge from '../../components/PaymentBadge';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await get('/admin/payments');
      const list = res?.payments || res || [];
      setPayments(Array.isArray(list) ? list : []);
    } catch (e) {
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingBlock text="Loading payments…" />;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Payments</h1>

      <ErrorBanner message={error} />

      {payments.length === 0 ? (
        <div className="text-slate-400">No payments found.</div>
      ) : (
        <table className="w-full text-sm border border-white/6">
          <thead className="bg-white/3 text-slate-300">
            <tr>
              <th className="p-2 text-left">Booking</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Provider</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p._id} className="border-t border-white/6">
                <td className="p-2">{p.bookingRef || p.bookingId}</td>
                <td className="p-2">
                  {p.currency || 'INR'} {p.amount}
                </td>
                <td className="p-2">
                  <PaymentBadge status={p.status} />
                </td>
                <td className="p-2">{p.provider || 'stripe'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
