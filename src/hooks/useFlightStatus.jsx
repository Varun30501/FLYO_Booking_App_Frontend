// src/hooks/useFlightStatus.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { get } from '../services/api';

export default function useFlightStatus(flightOrId, opts = {}) {
  const { pollInterval = 30000, enabled = true } = opts;

  const flightId = (() => {
    if (!flightOrId) return null;
    if (typeof flightOrId === 'string') return flightOrId;
    return (
      flightOrId._id ||
      flightOrId.id ||
      flightOrId.raw?.id ||
      flightOrId.meta?.offerId ||
      null
    );
  })();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mounted = useRef(true);
  const timerRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    if (!flightId) {
      // no id — treat as not available
      setStatus(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await get(`/flights/status/${encodeURIComponent(String(flightId))}`);
      const st = resp && resp.status ? resp.status : resp;
      if (mounted.current) setStatus(st || null);
    } catch (err) {
      // If 404 -> no status available for this flight (not an application error)
      const is404 = err && err.response && err.response.status === 404;
      if (mounted.current) {
        if (is404) {
          // treat as "no status" quietly
          setStatus(null);
          setError(null);
        } else {
          setError(err?.message || 'Failed to fetch status');
          console.error('[useFlightStatus] error:', err);
        }
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [flightId, flightOrId]);

  useEffect(() => {
    mounted.current = true;
    if (enabled && flightId) {
      fetchStatus();
      if (pollInterval && pollInterval > 0) {
        timerRef.current = setInterval(fetchStatus, pollInterval);
      }
    }
    return () => {
      mounted.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchStatus, pollInterval, enabled, flightId]);

  return { status, loading, error, refresh: fetchStatus, flightId };
}
