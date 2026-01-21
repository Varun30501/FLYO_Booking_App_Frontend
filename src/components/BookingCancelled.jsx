// src/components/BookingCancelled.jsx
import React from "react";
import Modal from "./Modal";

/**
 * BookingCancelled (polished)
 * Modal that mirrors BookingSuccess styling for a nicer UX.
 *
 * Props:
 *  - open (bool)
 *  - onClose (fn)
 *  - booking (object) optional - booking object returned by server
 *  - refundInfo (object) optional - refund diagnostic/info returned by server
 *
 * The component extracts a Stripe-like refund object if present and renders
 * a user-friendly summary instead of raw JSON.
 */
export default function BookingCancelled({ open = false, onClose = () => { }, booking = null, refundInfo = null }) {
  const bookingRef = booking?.bookingRef || booking?.ref || booking?._id || booking?.id || "—";
  const paidAmount = booking?.price?.amount ?? booking?.price ?? null;
  const paidCurrency = (booking?.price?.currency || (booking?.price && booking.price.currency) || "INR").toUpperCase();

  // --- helpers to extract a Stripe-like refund object from various shapes ---
  function extractRefund(obj) {
    if (!obj) return null;
    if (obj && typeof obj === "object" && obj.id && (typeof obj.amount === "number" || obj.status)) return obj;
    if (obj.refund && typeof obj.refund === "object") return obj.refund;
    if (obj.refundInfo && typeof obj.refundInfo === "object") return obj.refundInfo;
    if (obj.refundResult && typeof obj.refundResult === "object") return obj.refundResult;
    if (obj.result && obj.result.refund && typeof obj.result.refund === "object") return obj.result.refund;
    if (obj.raw && typeof obj.raw === "object") {
      if (obj.raw.refund && typeof obj.raw.refund === "object") return obj.raw.refund;
      if (obj.raw.id && (typeof obj.raw.amount === "number" || obj.raw.status)) return obj.raw;
    }

    // deep search for first object that looks like a refund
    try {
      const queue = [obj];
      const seen = new Set();
      while (queue.length) {
        const cur = queue.shift();
        if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
        seen.add(cur);
        if (cur.id && (typeof cur.amount === "number" || cur.status)) return cur;
        for (const k of Object.keys(cur)) {
          const v = cur[k];
          if (v && typeof v === "object") queue.push(v);
        }
      }
    } catch (e) { /* ignore */ }

    return null;
  }

  const refund = extractRefund(refundInfo);

  function formatCurrencyFromSmallest(nSmallest, cur = paidCurrency) {
    if (typeof nSmallest !== "number") return null;
    const C = (String(cur || "INR")).toUpperCase();
    const multiplier = C === "JPY" ? 1 : 100;
    const major = nSmallest / multiplier;
    if (Math.abs(major - Math.round(major)) < 0.0001) {
      const val = Math.round(major).toLocaleString("en-IN");
      return C === "INR" ? `₹ ${val}` : `${C} ${val}`;
    }
    const val = major.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return C === "INR" ? `₹ ${val}` : `${C} ${val}`;
  }

  // build display fields for refund (prefer amount from refund obj; fallback to booking price)
  const refundStatus = refund?.status || refund?.state || null;
  const refundId = refund?.id || refund?.refundId || refund?.refund_id || null;
  const refundAmtSmall =
    typeof refund?.amount === "number"
      ? refund.amount
      : typeof refund?.amountSmallest === "number"
        ? refund.amountSmallest
        : typeof refund?.amount_smallest === "number"
          ? refund.amount_smallest
          : null;
  const refundCurrency = (refund?.currency || paidCurrency || "INR").toUpperCase();
  const refundAmountDisplay = refundAmtSmall !== null ? formatCurrencyFromSmallest(refundAmtSmall, refundCurrency) : paidAmount ? `${paidCurrency} ${paidAmount}` : null;
  const refundReason = refund?.reason || refund?.failure_reason || refund?.failureReason || null;
  const refundCreated = refund?.created
    ? (typeof refund.created === "number" ? new Date(refund.created * (String(refund.created).length === 10 ? 1000 : 1)) : new Date(refund.created))
    : refund?.createdAt
      ? new Date(refund.createdAt)
      : null;

  // common small row
  function Row({ label, children }) {
    return (
      <div className="flex justify-between items-start gap-4">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-sm text-white text-right break-words" style={{ minWidth: 160 }}>{children}</div>
      </div>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="">
      <div className="p-6 max-w-xl mx-auto text-center">
        {/* Header similar to BookingSuccess: big icon + title */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="text-2xl font-semibold text-white">Booking cancelled</div>
          <div className="text-sm text-slate-300">Booking <span className="font-mono text-white">{bookingRef}</span> has been cancelled</div>
        </div>

        {/* main refunded amount block */}
        <div className="mt-5 bg-gradient-to-b from-white/3 to-white/2 p-4 rounded-xl">
          <div className="text-xs text-slate-400">Refund summary</div>

          <div className="mt-1 text-2xl font-bold text-white">
            {refundAmountDisplay || "—"}
          </div>

          {/* Breakdown */}
          <div className="mt-3 space-y-1 text-sm text-slate-300">
            {paidAmount !== null && (
              <div className="flex justify-between">
                <span>Amount paid</span>
                <span>{paidCurrency} {paidAmount}</span>
              </div>
            )}

            {booking?.cancellationFeeMajor != null && (
              <div className="flex justify-between">
                <span>Cancellation fee</span>
                <span className="text-red-400">
                  − {paidCurrency} {booking.cancellationFeeMajor}
                </span>
              </div>
            )}

            {refundAmountDisplay && (
              <div className="flex justify-between font-medium text-white pt-1 border-t border-white/10">
                <span>Refund amount</span>
                <span>{refundAmountDisplay}</span>
              </div>
            )}
          </div>

          {refundStatus && (
            <div className="mt-3">
              <span className="inline-block text-xs px-2 py-1 rounded bg-slate-700 text-white uppercase">
                {refundStatus}
              </span>
            </div>
          )}
          {refundStatus && (
            <div className="mt-2 text-xs text-slate-400">
              {refundStatus === "pending" || refundStatus === "processing"
                ? "Refund has been initiated. Amount will reflect in your account in 5–7 business days."
                : refundStatus === "succeeded"
                  ? "Refund completed. Amount will be credited to your account within 2 to 3 business days."
                  : "Refund status recorded."}
            </div>
          )}

        </div>

        {/* details grid */}
        <div className="mt-4 space-y-3 text-left">
          {refundId && <Row label="Refund ID"><span className="font-mono">{refundId}</span></Row>}
          {refundCreated && !Number.isNaN(refundCreated.getTime()) && <Row label="Created">{refundCreated.toLocaleString()}</Row>}
          {refundReason && <Row label="Reason">{refundReason}</Row>}

          {/* optional metadata / extra debug shown collapsed */}
          {refund && refund.metadata && Object.keys(refund.metadata).length > 0 && (
            <div className="mt-2 p-2 bg-white/3 rounded text-xs">
              <div className="font-medium text-white mb-1">Metadata</div>
              <pre className="whitespace-pre-wrap break-words text-[11px] text-slate-200">{JSON.stringify(refund.metadata, null, 2)}</pre>
            </div>
          )}

          {/* fallback friendly server-info block when we couldn't extract refund object */}
          {!refund && refundInfo && (
            <div className="mt-2 p-3 bg-white/5 rounded text-xs text-slate-300">
              <div className="font-medium mb-1">Refund initiated</div>
              <div>
                Your booking has been cancelled successfully.
                Refund processing has started and details will be available within 5 to 7 days.
              </div>
            </div>
          )}
        </div>

        {/* actions */}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={async () => {
              try {
                const res = await fetch(
                  `${import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"}/api/bookings/${bookingRef}/refund.pdf`,
                  { credentials: "include" }
                );
                if (!res.ok) throw new Error("Failed to download refund receipt");

                const buffer = await res.arrayBuffer();
                const blob = new Blob([buffer], { type: "application/pdf" });
                const url = window.URL.createObjectURL(blob);

                const a = document.createElement("a");
                a.href = url;
                a.download = `refund-${bookingRef}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (e) {
                alert("Unable to download refund receipt");
              }
            }}
            className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
          >
            Download refund receipt
          </button>

          <button
            onClick={async () => {
              try {
                await fetch(
                  `${import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"}/api/bookings/${bookingRef}/resend-refund-confirmation`,
                  { method: "POST", credentials: "include" }
                );
                alert("Refund confirmation email sent");
              } catch {
                alert("Failed to resend refund email");
              }
            }}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-white"
          >
            Resend refund email
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-white/12"
          >
            Close
          </button>
        </div>

      </div>
    </Modal>
  );
}
