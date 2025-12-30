// src/components/CancelBookingButton.jsx
import React, { useState } from "react";
import Modal from "./Modal";
import BookingCancelled from "./BookingCancelled";
import { post } from "../services/api";

/**
 * CancelBookingButton (enhanced)
 * - confirmation modal
 * - after success: opens BookingCancelled modal to show result
 *
 * Props:
 *  - booking (object) required (expects booking._id or booking.bookingRef and booking.price.amount)
 *  - onUpdated (fn) optional: called with updated booking object after successful cancel
 *  - confirmRefund (bool) default true - show refund checkbox
 */
export default function CancelBookingButton({ booking, onUpdated, confirmRefund = true }) {
    const [openConfirm, setOpenConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [refund, setRefund] = useState(true);
    const [restoreSeats, setRestoreSeats] = useState(true);
    const [reason, setReason] = useState("");
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    // success modal
    const [openSuccess, setOpenSuccess] = useState(false);
    const [successBooking, setSuccessBooking] = useState(null);
    const [successRefundInfo, setSuccessRefundInfo] = useState(null);
    const [successCancellationFee, setSuccessCancellationFee] = useState(null);

    if (!booking) return null;
    const id = booking._id || booking.id || booking.bookingRef;

    function formatMoneyMajor(amount, currency = "INR") {
        if (amount === null || typeof amount === "undefined") return "—";
        const n = Number(amount);
        if (isNaN(n)) return String(amount);
        const cur = (currency || "INR").toUpperCase();
        return (cur === "INR" ? "₹ " : cur + " ") + n.toLocaleString("en-IN");
    }

    function extractRefundForDisplay(data) {
        // accept: data.refund, data.refundId, data.refundResult, raw etc.
        if (!data) return null;
        const r = data.refund || data.refundResult || data.refundInfo || data;
        if (!r) return null;
        // if Stripe returns amount in smallest unit (paise), convert to major
        const id = r.id || r.refundId || r.refund_id || null;
        const status = r.status || r.state || null;
        let amountMajor = null;
        if (typeof r.amount === "number") {
            // assume smallest unit -> convert
            amountMajor = (r.amount / 100);
            // but some server shapes may already include amountMajor; check common fields
        } else if (typeof r.amountMajor === "number") {
            amountMajor = r.amountMajor;
        } else if (typeof r.amountSmallest === "number") {
            amountMajor = r.amountSmallest / 100;
        }
        return { id, status, amountMajor, raw: r };
    }

    async function doCancel(e) {
        e?.preventDefault?.();
        setError(null);
        setResult(null);
        setBusy(true);
        try {
            const payload = { refund: !!refund, reason: String(reason || '').trim(), restoreInventory: !!restoreSeats };
            const res = await post(`/bookings/${encodeURIComponent(id)}/cancel`, payload).catch(err => err?.response || err);
            const data = res?.data ?? res;

            if (!res || (data && (data.success === false || data.error || data.message === 'forbidden'))) {
                const msg = data?.message || data?.error || data?.detail || 'Cancel failed';
                setError(String(msg));
                setBusy(false);
                return;
            }

            // normalize booking & refund info returned by server
            const updatedBooking = data?.booking || data?.updatedBooking || data?.result?.booking || data;
            const refundInfo = data?.refund || data?.refundResult || data?.refundInfo || data?.result?.refund || data?.raw || null;
            const cancellationFeeMajor = data?.cancellationFeeMajor ?? (updatedBooking && updatedBooking.cancellationFeeMajor) ?? null;

            setResult(data);
            setBusy(false);
            setOpenConfirm(false);

            // show success modal
            setSuccessBooking(updatedBooking || { bookingRef: id });
            setSuccessRefundInfo(refundInfo || null);
            setSuccessCancellationFee(cancellationFeeMajor);
            setOpenSuccess(true);

            try { window.dispatchEvent(new Event("bookings:changed")); } catch (e) { }
            try { localStorage.setItem("bookings:changed", String(Date.now())); } catch (e) { }

            // callback to parent so UI updates (optimistic)
            if (onUpdated && typeof onUpdated === 'function') onUpdated(updatedBooking || data);

            return;
        } catch (err) {
            console.error('[CancelBookingButton] cancel error', err);
            setError(err?.message || 'Network error');
            setBusy(false);
        }
    }

    // Helper to render a short refund summary string (used in confirmation modal)
    function renderRefundPreview() {
        // attempt to show expected refund (if booking.price available) and cancellation fee
        const total = booking.price && booking.price.amount ? Number(booking.price.amount) : null;
        let fee = null;
        if (typeof successCancellationFee === "number") fee = successCancellationFee;
        // if not available, show rough estimate: 10%
        const estimatedFee = fee !== null ? fee : (total ? Math.round(0.10 * Number(total)) : null);
        const refundEst = total !== null ? (total - (estimatedFee || 0)) : null;
        return (
            <div className="text-sm text-slate-300">
                {estimatedFee !== null && <div>Cancellation fee (est.): <strong className="text-white">{formatMoneyMajor(estimatedFee, booking.price?.currency)}</strong></div>}
                {refundEst !== null && <div>Net refund (est.): <strong className="text-white">{formatMoneyMajor(refundEst, booking.price?.currency)}</strong></div>}
            </div>
        );
    }

    return (
        <>
            <button
                onClick={() => { setOpenConfirm(true); setError(null); setReason(''); setResult(null); }}
                className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-sm"
            >
                Cancel booking
            </button>

            {/* Confirmation modal */}
            <Modal open={openConfirm} onClose={() => setOpenConfirm(false)} title="Cancel booking">
                <form onSubmit={doCancel} className="space-y-4 p-4">
                    <div className="text-sm text-slate-300">
                        Booking: <span className="font-mono text-white">{booking.bookingRef || booking._id || id}</span>
                        <div className="mt-1">Amount paid (UI): <strong>{booking.price ? (`${booking.price.currency || 'INR'} ${booking.price.amount}`) : '—'}</strong></div>
                    </div>

                    {confirmRefund && (
                        <div className="flex items-center gap-2">
                            <input id="refund" type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} />
                            <label htmlFor="refund" className="text-sm text-slate-300">Attempt refund (via Stripe) for net booking amount</label>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input id="restore" type="checkbox" checked={restoreSeats} onChange={(e) => setRestoreSeats(e.target.checked)} />
                        <label htmlFor="restore" className="text-sm text-slate-300">Restore seat inventory</label>
                    </div>

                    {renderRefundPreview()}

                    <div>
                        <label className="text-sm text-slate-300">Reason (optional)</label>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="dark-input w-full p-2 rounded mt-1" rows={3} />
                    </div>

                    {error && <div className="text-sm text-red-400">{error}</div>}

                    {result && (
                        <div className="text-sm text-slate-300 p-2 bg-white/3 rounded">
                            <div className="font-medium text-white mb-1">Cancel result (debug)</div>
                            <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(result, null, 2)}</pre>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setOpenConfirm(false)} className="px-3 py-1 rounded border border-white/12">Close</button>
                        <button type="submit" disabled={busy} className="px-4 py-2 rounded bg-rose-600 text-white">
                            {busy ? 'Cancelling…' : 'Confirm cancel'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Success modal (booking cancelled) */}
            <BookingCancelled
                open={openSuccess}
                onClose={() => { setOpenSuccess(false); setSuccessBooking(null); setSuccessRefundInfo(null); setSuccessCancellationFee(null); }}
                booking={successBooking}
                refundInfo={successRefundInfo}
            >
                {/* Note: BookingCancelled already handles detailed formatting */}
            </BookingCancelled>
        </>
    );
}
