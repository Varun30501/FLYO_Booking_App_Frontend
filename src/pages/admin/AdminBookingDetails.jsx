import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post } from "../../services/api";

export default function AdminBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await get(`/admin/bookings/${id}`);
        setBooking(res.booking);
      } catch (e) {
        setError("Failed to load booking");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function forceCancel() {
    if (!window.confirm("Force cancel this booking? This will refund & restore seats.")) return;
    setBusy(true);
    try {
      const res = await post(`/admin/bookings/${id}/cancel`, {
        refund: true,
        restoreInventory: true,
        reason: "Admin force cancellation"
      });
      setBooking(res.booking || booking);
      alert("Booking cancelled");
    } catch (e) {
      alert("Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!booking) return null;

  return (
    <div className="p-6 bg-[#07102a] min-h-screen text-white">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sm text-slate-400 hover:underline"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-semibold mb-2">
        Booking {booking.bookingRef}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* LEFT */}
        <div className="panel-3d p-4">
          <h3 className="font-semibold mb-2">Summary</h3>
          <div className="text-sm space-y-1">
            <div>Status: {booking.bookingStatus}</div>
            <div>Payment: {booking.paymentStatus}</div>
            <div>Amount: ₹{booking.price?.amount}</div>
            <div>Created: {new Date(booking.createdAt).toLocaleString()}</div>
          </div>

          {booking.bookingStatus !== "CANCELLED" &&
            booking.bookingStatus !== "REFUNDED" && (
              <button
                disabled={busy}
                onClick={forceCancel}
                className="mt-4 px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white"
              >
                {busy ? "Cancelling…" : "Force Cancel"}
              </button>
            )}
        </div>

        {/* MIDDLE */}
        <div className="panel-3d p-4">
          <h3 className="font-semibold mb-2">Passengers & Seats</h3>
          <ul className="text-sm space-y-1">
            {booking.passengers?.map((p, i) => (
              <li key={i}>
                {p.firstName} {p.lastName} — Seat: {p.seat || booking.seats?.[i]}
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT */}
        <div className="panel-3d p-4">
          <h3 className="font-semibold mb-2">Payment / Refund</h3>
          <div className="text-sm space-y-1">
            <div>Provider: {booking.paymentProvider}</div>
            <div>Intent: {booking.paymentIntentId}</div>
            <div>Charge: {booking.chargeId}</div>

            {booking.refundInfo && (
              <>
                <div className="mt-2 font-medium">Refund</div>
                <div>ID: {booking.refundInfo.id}</div>
                <div>Status: {booking.refundInfo.status}</div>
                <div>Amount: ₹{booking.refundInfo.amount / 100}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* PROVIDER DETAILS */}
      <div className="panel-3d p-4 mt-6">
        <h3 className="font-semibold mb-3">Provider Details</h3>

        <div className="text-sm space-y-1">
          <div>
            Provider Booking ID:{" "}
            <span className="font-mono text-slate-200">
              {booking.providerBookingId || "—"}
            </span>
          </div>

          {booking.rawProviderResponse?.ticketNumbers?.length > 0 && (
            <div>
              Tickets:
              <ul className="list-disc ml-5 mt-1">
                {booking.rawProviderResponse.ticketNumbers.map((t, i) => (
                  <li key={i} className="font-mono">{t}</li>
                ))}
              </ul>
            </div>
          )}

          {booking.paymentStatus && (
            <div>Payment Status: {booking.paymentStatus}</div>
          )}

          {booking.refundInfo && (
            <>
              <div className="mt-2 font-medium">Refund Summary</div>
              <div>Refund ID: {booking.refundInfo.id}</div>
              <div>Status: {booking.refundInfo.status}</div>
              <div>
                Amount: ₹{Number(booking.refundInfo.amount / 100).toLocaleString()}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
