// src/pages/admin/ProviderHealth.jsx
import React, { useEffect, useState } from 'react';
import { get } from '../../services/api';
import LoadingBlock from '../../components/LoadingBlock';
import ErrorBanner from '../../components/ErrorBanner';

export default function ProviderHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await get('/providers/status');
      setHealth(res);
    } catch (e) {
      setError('Failed to fetch provider health');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingBlock text="Checking provider health…" />;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Provider Health</h1>

      <ErrorBanner message={error} />

      {health ? (
        <div className={`p-4 rounded ${health.ok ? 'bg-green-700/20' : 'bg-yellow-600/20'}`}>
          <div className="font-semibold">
            Status: {health.ok ? 'Healthy' : 'Degraded'}
          </div>
          <pre className="text-xs mt-2 whitespace-pre-wrap text-slate-300">
            {JSON.stringify(health.diagnostic, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="text-slate-400">No health data available.</div>
      )}
    </div>
  );
}
