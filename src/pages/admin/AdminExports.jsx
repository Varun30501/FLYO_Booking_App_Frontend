import React from 'react';
import { apiBase } from '../../services/api';

export default function AdminExports() {
  const base = apiBase();

  function download(path) {
    window.open(`${base}${path}`, '_blank');
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Exports</h1>

      <div className="space-y-3">
        <button
          onClick={() => download('/admin/exports/bookings')}
          className="px-4 py-2 bg-white/10 rounded"
        >
          Export Bookings CSV
        </button>

        <button
          onClick={() => download('/admin/exports/payments')}
          className="px-4 py-2 bg-white/10 rounded"
        >
          Export Payments CSV
        </button>

        <button
          onClick={() => download('/admin/exports/reconciliation')}
          className="px-4 py-2 bg-white/10 rounded"
        >
          Export Reconciliation Logs CSV
        </button>
      </div>
    </div>
  );
}
