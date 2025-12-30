// src/components/PaymentBadge.jsx
import React from 'react';

export default function PaymentBadge({ status }) {
  const normalized = String(status || '').toLowerCase();

  let color = 'bg-slate-500';
  let label = status || 'Unknown';

  if (['paid', 'succeeded'].includes(normalized)) {
    color = 'bg-green-600';
    label = 'Paid';
  } else if (['pending', 'processing'].includes(normalized)) {
    color = 'bg-yellow-500 text-black';
    label = 'Pending';
  } else if (['failed', 'canceled'].includes(normalized)) {
    color = 'bg-red-600';
    label = 'Failed';
  } else if (['refunded', 'partial_refund'].includes(normalized)) {
    color = 'bg-purple-600';
    label = 'Refunded';
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
