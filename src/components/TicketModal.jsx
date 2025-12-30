import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function TicketModal({ open, onClose, onSubmit, submitting=false, initial = [] }) {
  const [tickets, setTickets] = useState(initial.join(', '));
  useEffect(() => { setTickets(initial.join(', ')); }, [initial]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded shadow p-4 mx-4">
        <h3 className="font-semibold mb-2">Enter ticket numbers</h3>
        <textarea className="w-full border rounded p-2" rows="3" value={tickets} onChange={(e) => setTickets(e.target.value)} placeholder="Comma separated ticket numbers" />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded border">Cancel</button>
          <button onClick={() => onSubmit({ ticketNumbers: tickets.split(',').map(t => t.trim()).filter(Boolean) })} className="px-3 py-1 rounded bg-green-600 text-white" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
