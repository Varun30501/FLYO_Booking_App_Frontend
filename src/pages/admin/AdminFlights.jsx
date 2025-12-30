// src/pages/admin/AdminFlights.jsx
import React, { useEffect, useState } from 'react';
import { get, del, patch } from '../../services/api';

export default function AdminFlights() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // provider health (diagnostic only – MUST NOT block table)
  const [providerStatus, setProviderStatus] = useState(null);

  async function loadFlights() {
    setLoading(true);
    setError(null);

    try {
      const res = await get('/admin/flights');

      /**
       * IMPORTANT:
       * api.get() NORMALIZES responses.
       *
       * - Backend returns { ok, flights }
       * - api.get() returns flights[] directly
       */
      const flights = Array.isArray(res) ? res : [];

      console.debug('[AdminFlights] resolved flights:', flights);

      setFlights(flights);
    } catch (e) {
      console.error('[AdminFlights] load error', e);
      setError('Failed to load flights');
      setFlights([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadProviderStatus() {
    try {
      const res = await get('/providers/status');
      setProviderStatus(res || null);
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    loadFlights();
    loadProviderStatus();
  }, []);

  async function toggle(id) {
    if (!id) return alert('Invalid flight ID');
    try {
      await patch(`/admin/flights/${id}/toggle`);
      loadFlights();
    } catch {
      alert('Failed to toggle flight');
    }
  }

  async function remove(id) {
    if (!id) return alert('Invalid flight ID');
    if (!window.confirm('Delete flight?')) return;
    try {
      await del(`/admin/flights/${id}`);
      loadFlights();
    } catch {
      alert('Failed to delete flight');
    }
  }

  if (loading) {
    return <div className="p-6 text-slate-300">Loading flights…</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Flights</h1>

      {/* Provider diagnostic banner (NON-BLOCKING) */}
      {providerStatus?.ok === false && (
        <div className="mb-4 p-3 rounded bg-yellow-600/90 text-black">
          <div className="font-semibold">
            Live provider unavailable — showing stored flights
          </div>
          <div className="text-xs mt-1">
            {providerStatus.diagnostic?.message || 'Provider returned no flights'}
          </div>
        </div>
      )}

      {error && <div className="mb-4 text-red-400">{error}</div>}

      {flights.length === 0 ? (
        <div className="p-6 text-slate-400 bg-white/3 rounded">
          No flights found in database.
        </div>
      ) : (
        <table className="w-full text-sm border border-white/6">
          <thead className="text-slate-400 bg-white/3">
            <tr>
              <th className="p-2 text-left">Flight</th>
              <th className="p-2 text-left">Route</th>
              <th className="p-2 text-left">Provider</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((f) => {
              const flightId = f._id;

              return (
                <tr
                  key={flightId}
                  className="border-t border-white/6 hover:bg-white/4 transition"
                >
                  <td className="p-2">
                    {f.airline} {f.flightNumber}
                  </td>
                  <td className="p-2">
                    {f.origin} → {f.destination}
                  </td>
                  <td className="p-2">
                    {f.provider || 'manual'}
                  </td>
                  <td className="p-2">
                    {f.active ? (
                      <span className="text-green-400">Active</span>
                    ) : (
                      <span className="text-red-400">Inactive</span>
                    )}
                  </td>
                  <td className="p-2 text-right space-x-2">
                    <button
                      onClick={() => toggle(flightId)}
                      className="px-2 py-1 bg-white/10 rounded hover:bg-white/20"
                    >
                      Toggle
                    </button>

                    {f.provider === 'manual' && (
                      <button
                        onClick={() => remove(flightId)}
                        className="px-2 py-1 bg-rose-600 rounded hover:bg-rose-700"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
