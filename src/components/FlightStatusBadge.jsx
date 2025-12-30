// src/components/FlightStatusBadge.jsx
import React from 'react';
import useFlightStatus from '../hooks/useFlightStatus';

/**
 * FlightStatusBadge
 * Props:
 *  - flightId (required)
 *  - pollInterval (ms) optional, default 30s
 *  - small (bool) - smaller layout for card
 */
export default function FlightStatusBadge({ flightId, pollInterval = 30000, small = false }) {
  const { status, loading, error, refresh } = useFlightStatus(flightId, { pollInterval });

  // status shape: { code, text, delayMinutes, departureAt, arrivalAt, ... }
  const code = (status && (status.code || status.status)) || null;
  const text = (status && (status.text || status.status || 'Unknown')) || (error ? 'Error' : 'Unknown');

  const color = (() => {
    if (!code) return 'bg-gray-200 text-gray-800';
    const c = String(code).toLowerCase();
    if (c.includes('delay') || c.includes('delayed')) return 'bg-yellow-100 text-yellow-800';
    if (c.includes('cancel') || c.includes('cancelled')) return 'bg-red-100 text-red-800';
    if (c.includes('on') || c.includes('on_time') || c.includes('on_time'.toLowerCase())) return 'bg-green-100 text-green-800';
    if (c.includes('unknown')) return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-800';
  })();

  return (
    <div className={`inline-flex items-center gap-2 ${small ? 'text-sm' : 'text-base'}`} title={error ? error : (status && status.reason ? status.reason : text)}>
      <span className={`inline-flex items-center px-2 py-0.5 rounded ${color}`}>
        <strong className="mr-2">{text}</strong>
        {status && status.delayMinutes ? <span className="text-xs">+{status.delayMinutes}m</span> : null}
      </span>
      <button
        onClick={refresh}
        className={`inline-flex items-center justify-center rounded px-2 py-1 border text-xs ${small ? 'p-0.5' : 'p-1'}`}
        aria-label="Refresh status"
        title="Refresh status"
      >
        {loading ? '…' : '↻'}
      </button>
    </div>
  );
}
