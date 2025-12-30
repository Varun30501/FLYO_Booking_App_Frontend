// src/pages/MyBookings.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getToken } from '../services/auth';

/**
 * Normalize a response into an array of booking objects.
 * Accepts:
 *  - array (returned directly)
 *  - { data: { bookings: [...] } }
 *  - { bookings: [...] }
 *  - { data: [...] }
 *  - axios response object
 */
function normalizeListResp(resp) {
  if (!resp) return [];
  // axios response style
  const payload = resp.data ?? resp;
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.bookings)) return payload.bookings;
  // sometimes API returns { success: true, bookings: [...] }
  if (Array.isArray(payload.data)) return payload.data;
  // if payload itself is object that looks like a booking, wrap it
  if (typeof payload === 'object' && !payload.success && (payload.booking || payload.bookings || payload._id || payload.bookingRef)) {
    if (Array.isArray(payload.bookings)) return payload.bookings;
    if (payload.booking) return [payload.booking];
    return [payload];
  }
  return [];
}

/**
 * Robust seat-summary helper (works with strings, objects, passengers fallback).
 */
function seatSummaryFromBooking(b) {
  try {
    if (!b) return '-';
    const seats = b.seats;
    if (Array.isArray(seats) && seats.length > 0) {
      return seats.map(s => {
        if (s === null || s === undefined) return '';
        if (typeof s === 'string' || typeof s === 'number') return String(s);
        if (typeof s === 'object') return s.seatId || s.label || s.seat || s.id || JSON.stringify(s);
        return String(s);
      }).filter(Boolean).join(', ');
    }
    // fall back to passengers' seat property
    if (Array.isArray(b.passengers) && b.passengers.length > 0) {
      return b.passengers.map(p => p.seat || p.seatNumber || '-').join(', ');
    }
    return '-';
  } catch (e) {
    return '-';
  }
}

/**
 * Format a price object or number to a human readable string.
 * Heuristic: if amount looks like minor units (paise) for INR (typical small values like 9794 -> 97.94),
 * we convert to main unit by dividing by 100. This is conservative: only applies for INR and amounts between 100 and 1e6.
 */
function formatPrice(amount, currency = 'INR') {
  if (amount === null || amount === undefined) return '—';
  const n = Number(amount);
  if (isNaN(n)) return String(amount);

  const cur = (currency || 'INR').toUpperCase();

  // Show with two decimals and thousands separators
  const parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (cur === 'INR' ? '₹ ' : cur + ' ') + parts.join('.');
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // resendStatus: { [bookingId]: { status: 'idle'|'sending'|'sent'|'failed', message } }
  const [resendStatus, setResendStatus] = useState({});

  const tryEndpoints = useCallback(async () => {
    // Order: prefer /bookings/me -> /bookings/mine -> /bookings/user/:id -> /bookings (list all)
    const endpoints = ['/bookings/me', '/bookings/mine', '/bookings', '/bookings/user'];
    for (const ep of endpoints) {
      try {
        // special-case '/bookings/user' will be handled below if we can get userId
        if (ep === '/bookings/user') {
          const token = getToken();
          if (!token) continue;
          // attempt to decode userId from token or get from localStorage
          const explicit = localStorage.getItem('userId');
          let userId = explicit || null;
          if (!userId) {
            try {
              const parts = token.split('.');
              if (parts.length >= 2) {
                const data = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                userId = data && (data.userId || data.sub || data.id || data._id) ? (data.userId || data.sub || data.id || data._id) : null;
              }
            } catch (e) { /* ignore */ }
          }
          if (!userId) continue;
          const resp = await api.get(`/bookings/user/${encodeURIComponent(userId)}`);
          const rows = normalizeListResp(resp);
          if (rows && rows.length) return rows;
          continue;
        }

        const resp = await api.get(ep);
        const rows = normalizeListResp(resp);
        if (rows && rows.length) return rows;
        // If returned empty array but endpoint worked, return empty to stop fallback
        if (Array.isArray(rows)) return rows;
      } catch (err) {
        // If unauthorized, surface that to caller
        if (err && err.response && (err.response.status === 401 || err.response.status === 403)) {
          throw err;
        }
        // else continue fallback
        continue;
      }
    }
    // nothing found
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        setBookings([]);
        setError('Please sign in to view your bookings.');
        setLoading(false);
        return;
      }

      const rows = await tryEndpoints();
      setBookings(Array.isArray(rows) ? rows : []);
      setLoading(false);
    } catch (err) {
      console.error('[MyBookings] fetch error', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to load bookings';
      setError(msg);
      setLoading(false);
    }
  }, [tryEndpoints]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  function openItinerary(base64) {
    if (!base64) return;
    const dataUrl = `data:application/pdf;base64,${base64}`;
    window.open(dataUrl, '_blank');
  }

  async function handleResendConfirmation(bookingId) {
    if (!bookingId) return;
    setResendStatus(prev => ({ ...prev, [bookingId]: { status: 'sending' } }));
    try {
      const resp = await api.post(`/bookings/${encodeURIComponent(bookingId)}/resend-confirmation`);
      const info = resp?.data ?? resp;
      setResendStatus(prev => ({ ...prev, [bookingId]: { status: 'sent', message: info?.message || 'Sent (or preview)' } }));
      // optionally reload bookings to reflect any changes
      // await loadBookings();
      console.log('resend-confirmation result', info);
    } catch (err) {
      console.error('resend failed', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to resend';
      setResendStatus(prev => ({ ...prev, [bookingId]: { status: 'failed', message: msg } }));
    }
    // auto-clear status after a short time
    setTimeout(() => {
      setResendStatus(prev => ({ ...prev, [bookingId]: undefined }));
    }, 10 * 1000);
  }

  if (loading) return <div className="p-6">Loading your bookings...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!bookings.length) return <div className="p-6 text-slate-300">You have no bookings yet.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-white">My Bookings</h2>
      <div className="grid gap-4">
        {bookings.map((b) => {
          const key = b.bookingRef || b._id || String(Math.random()).slice(2, 8);
          const bookingStatus = (b.bookingStatus || b.status || 'PENDING').toString().toUpperCase();
          const paymentStatus = (b.paymentStatus || 'PENDING').toString().toUpperCase();

          const itineraryBase64 =
            b.itineraryPdfBase64 ||
            b.itineraryBase64 ||
            (b.rawProviderResponse && (b.rawProviderResponse.itineraryPdfBase64 || b.rawProviderResponse.itineraryBase64)) ||
            null;

          // Price normalization: handle object { amount, currency } or direct number/string
          const priceObj = (() => {
            if (!b.price) return null;
            if (typeof b.price === 'number') return { amount: b.price, currency: 'INR' };
            if (typeof b.price === 'string') {
              const n = Number(b.price.replace(/[^\d.-]/g, '')) || 0;
              return { amount: n, currency: 'INR' };
            }
            if (typeof b.price === 'object') return { amount: b.price.amount ?? b.price, currency: b.price.currency ?? 'INR' };
            return null;
          })();

          const priceDisplay = priceObj ? formatPrice(priceObj.amount, priceObj.currency) : '—';

          // Seats summary (handles objects/strings)
          const seatSummary = seatSummaryFromBooking(b);

          const rs = resendStatus[b._id || b.bookingRef] || { status: 'idle' };

          return (
            <div key={key} className="panel-3d p-4 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">{b.bookingRef || b._id || 'No ref'}</div>
                <div className="text-sm text-slate-300">Created: {b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}</div>
                <div className="text-sm text-slate-300">
                  {b.passengers?.length ? `${b.passengers.length} passenger${b.passengers.length > 1 ? 's' : ''}` : 'No passengers'}
                  {' '}• Seats: <span className="text-white">{seatSummary}</span>
                </div>

                <div className="text-sm text-slate-300 mt-2">
                  Price: <span className="text-white ml-2">{priceDisplay}</span>
                </div>

                <div className="text-sm text-slate-300 mt-1">
                  Provider PNR: <span className="text-white ml-2">{b.providerBookingId || '—'}</span>
                </div>

                <div className="text-sm text-slate-300 mt-1">
                  Payment: <span className="text-white ml-2">{paymentStatus}</span>
                </div>
              </div>

              <div className="text-right flex items-center gap-3">
                <div className={`px-3 py-1 rounded text-sm ${
                  bookingStatus === 'CONFIRMED' ? 'bg-green-600 text-black'
                    : bookingStatus === 'HELD' ? 'bg-yellow-500 text-black'
                    : 'bg-white/5 text-white'}`}>
                  {bookingStatus}
                </div>

                {itineraryBase64 && (
                  <button onClick={() => openItinerary(itineraryBase64)} className="px-3 py-1 rounded border border-white/10 text-sm">
                    Download Itinerary
                  </button>
                )}

                <Link to={`/booking-details/${encodeURIComponent(b.bookingRef || b._id || '')}`} className="flex items-center gap-2 bg-white/6 hover:bg-white/10 px-3 py-1 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H3m0 0l4-4m-4 4l4 4M21 12v.01" />
                  </svg>
                  <span className="text-indigo-300 text-sm font-medium">View</span>
                </Link>

                {/* Resend confirmation button */}
                <div className="flex flex-col items-end">
                  <button
                    onClick={() => handleResendConfirmation(b._id || b.bookingRef)}
                    disabled={rs.status === 'sending'}
                    className="px-3 py-1 rounded border border-white/12 text-sm bg-white/6 hover:bg-white/10"
                    title="Resend confirmation email"
                  >
                    {rs.status === 'sending' ? 'Sending…' : 'Resend Email'}
                  </button>
                  <div className="text-xs mt-1">
                    {rs.status === 'sent' && <span className="text-green-400">Sent</span>}
                    {rs.status === 'failed' && <span className="text-red-400">Failed</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
