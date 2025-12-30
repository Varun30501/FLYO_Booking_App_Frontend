// src/components/AdminProviderStatus.jsx
import React, { useEffect, useState } from 'react';
import { get } from '../services/api';

export default function AdminProviderStatus({ pollMs = 30000 }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await get('/providers/status').catch(err => err?.response || err);
      const data = (res && (res.data || res)) || null;
      setStatus(data);
      setLastChecked(new Date().toLocaleString());
    } catch (e) {
      setStatus({ ok: false, diagnostic: { error: e && e.message } });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, pollMs);
    return () => clearInterval(t);
  }, [pollMs]);

  return (
    <div className="panel-3d p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Providers status</h4>
        <button onClick={fetchStatus} className="px-2 py-1 rounded border">Probe</button>
      </div>

      <div className="mt-3">
        <div>Status: {status ? (status.ok ? <span className="text-green-400">Healthy</span> : <span className="text-yellow-400">Degraded / Down</span>) : 'Loading...'}</div>
        <div className="text-sm text-slate-400">Last checked: {lastChecked || '—'}</div>
      </div>

      {status && status.diagnostic && (
        <div className="mt-3 text-xs text-slate-300 bg-white/3 p-2 rounded">
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(status.diagnostic, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
