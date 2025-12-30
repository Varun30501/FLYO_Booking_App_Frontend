import React, { useEffect, useState } from "react";
import { get, post } from "../../services/api";

export default function PaymentRetryDashboard() {
  const [items, setItems] = useState([]);

  async function load() {
    const res = await get("/admin/payments/retries");
    setItems(res.bookings || []);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl mb-4">Payment Retries</h1>

      <div className="panel-3d p-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Status</th>
              <th>Retries</th>
              <th>Last Error</th>
            </tr>
          </thead>
          <tbody>
            {items.map(b => (
              <tr key={b._id} className="border-b border-white/10">
                <td className="font-mono">{b.bookingRef}</td>
                <td>{b.paymentStatus}</td>
                <td>{b.paymentRetryCount || 0}</td>
                <td className="text-red-400">
                  {b.lastPaymentError || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
