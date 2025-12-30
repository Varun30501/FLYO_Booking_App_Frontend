// src/components/CouponBreakdown.jsx
import React from 'react';

function humanReason(reason) {
  if (!reason) return '';
  const map = {
    'ok': 'Applied',
    'expired': 'Expired',
    'not-started': 'Not active yet',
    'not-found': 'Coupon not found',
    'inactive': 'Coupon inactive',
    'min-fare-not-met': 'Minimum fare not met',
    'airline-mismatch': 'Not valid for this airline',
    'route-mismatch': 'Not valid for this route',
    'usage-limit-reached': 'Usage limit reached',
    'per-user-limit': 'Per-user limit reached',
    'no-server-check': 'No server validation performed'
  };
  return map[reason] || reason;
}

/**
 * couponBreakdown: [
 *   { code, applied: boolean, amount, percent, reason, cap, metadata }
 * ]
 */
export default function CouponBreakdown({ couponBreakdown = [] }) {
  if (!Array.isArray(couponBreakdown) || couponBreakdown.length === 0) return null;
  return (
    <div className="coupon-breakdown">
      <h4>Coupon summary</h4>
      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
        {couponBreakdown.map((c, i) => (
          <li key={`${c.code}-${i}`} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{c.code || c.name}</strong>
                {c.percent ? <span> — {c.percent}%</span> : null}
                {c.cap ? <span style={{ marginLeft: 8, color: '#666' }}>cap {c.cap}</span> : null}
              </div>
              <div>
                {c.applied ? <span style={{ color: 'green' }}>Applied</span> : <span style={{ color: '#c00' }}>{humanReason(c.reason)}</span>}
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#333', marginTop: 6 }}>
              <div>Amount applied: {Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((c.amount || 0))}</div>
              {c.metadata && Object.keys(c.metadata).length ? <div style={{ color: '#666', marginTop: 4 }}>Note: {Object.entries(c.metadata).map(([k,v]) => `${k}: ${v}`).join(', ')}</div> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
