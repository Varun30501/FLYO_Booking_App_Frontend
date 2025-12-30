// src/pages/BookingDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { get, post } from "../services/api";
import BookingSuccess from "../components/BookingSuccess";
import TicketModal from "../components/TicketModal";
import CancelBookingButton from "../components/CancelBookingButton";

/* ---------------- Helper Functions ---------------- */

function normalizeApiResponse(resp) {
  if (!resp) return null;

  if (resp.data) {
    const d = resp.data;
    if (d.booking) return d.booking;
    if (d._id || d.bookingRef) return d;
    return d;
  }

  if (resp.booking) return resp.booking;
  if (resp._id || resp.bookingRef) return resp;

  return null;
}

function formatPrice(amount, currency = "INR") {
  if (amount === null || amount === undefined) return "—";
  const n = Number(amount);
  if (isNaN(n)) return String(amount);
  const cur = currency.toUpperCase();
  return (cur === "INR" ? "₹ " : cur + " ") + n.toLocaleString("en-IN");
}

function seatLabelsFromBooking(booking) {
  try {
    if (!booking) return [];
    if (Array.isArray(booking.seats) && booking.seats.length > 0) {
      return booking.seats.map(s =>
        typeof s === "object" ? s.seatId || s.label || s.seat : String(s)
      );
    }
    if (Array.isArray(booking.seatsMeta)) {
      return booking.seatsMeta.map(s => s.seatId);
    }
    return [];
  } catch {
    return [];
  }
}

function money(v) {
  return `₹${Number(v || 0).toLocaleString()}`;
}

export default function BookingDetails() {
  const { ref } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);

  const [resendStatus, setResendStatus] = useState("idle"); // idle | sending | sent | failed
  const [resendMessage, setResendMessage] = useState("");

  const query = new URLSearchParams(location.search);
  const paidQuery = ["1", "true", "yes"].includes(
    String(query.get("paid")).toLowerCase()
  );

  const [showSuccess, setShowSuccess] = useState(false);


  /* ------------ LOAD BOOKING ---------------- */
  async function loadBooking() {
    setLoading(true);
    setError(null);

    try {
      let resp = await get(`/bookings/${encodeURIComponent(ref)}`).catch(
        (e) => e?.response
      );

      let data = normalizeApiResponse(resp);

      if (!data) {
        const resp2 = await get(`/bookings/ref/${encodeURIComponent(ref)}`).catch(
          () => null
        );
        data = normalizeApiResponse(resp2);
      }

      if (!data) {
        setError("Booking not found");
        return;
      }

      setBooking(data);
      // fetch flight details for display


      if (paidQuery) setShowSuccess(true);
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "Failed to load booking"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooking();
  }, [ref, location.search]);

  /* ------------ Resend Confirmation Email ---------------- */
  async function handleResendConfirmation() {
    if (!booking) return;

    setResendStatus("sending");
    setResendMessage("");

    const idOrRef = booking._id || booking.bookingRef || ref;

    try {
      const res = await post(
        `/bookings/${encodeURIComponent(idOrRef)}/resend-confirmation`,
        {}
      );

      setResendStatus("sent");
      setResendMessage(res?.data?.message || res?.data?.preview || "Sent!");

      loadBooking(); // refresh booking
    } catch (err) {
      setResendStatus("failed");
      setResendMessage(
        err?.response?.data?.message || err.message || "Failed to resend"
      );
    }

    setTimeout(() => {
      setResendStatus("idle");
      setResendMessage("");
    }, 10000);
  }

  async function downloadPDF() {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/bookings/${booking.bookingRef}/itinerary.pdf`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${booking.bookingRef || "itinerary"}.pdf`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error", err);
      alert("Unable to download ticket. Please try again.");
    }
  }

  /* ------------ Ticket Number Submit ---------------- */
  async function submitTicketNumbers({ ticketNumbers = [] }) {
    if (!booking) return;
    const idOrRef = booking._id || booking.bookingRef || ref;

    setUpdatingTicket(true);

    try {
      const resp = await post(
        `/bookings/${encodeURIComponent(idOrRef)}/status`,
        {
          status: "TICKETED",
          rawProviderResponse: {
            ticketNumbers,
            ticketedAt: new Date().toISOString(),
          },
        }
      );

      const updated = normalizeApiResponse(resp);
      if (updated) setBooking(updated);

      setTicketModalOpen(false);
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "Failed to update booking"
      );
    } finally {
      setUpdatingTicket(false);
    }
  }

  /* ------------ Render ---------------- */
  if (loading) return <div className="p-6">Loading booking…</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!booking) return <div className="p-6">No booking found</div>;

  const seatLabels = seatLabelsFromBooking(booking);
  const providerInfo = booking.rawProviderResponse || {};
  const ticketNumbers = providerInfo.ticketNumbers || [];
  const bookingStatus = (booking.bookingStatus || booking.status)?.toUpperCase();
  const paymentStatus = (booking.paymentStatus || "PENDING").toUpperCase();

  /* ---- Flight data (from Flight model) ---- */
  /* ---------------- FLIGHT INFO (FROM BOOKING) ---------------- */

  // Default values
  let flightName = "—";
  let origin = "—";
  let destination = "—";
  let departureAt = null;
  let arrivalAt = null;
  let duration = "—";

  /**
   * For Amadeus / provider bookings,
   * flight details are embedded at booking time
   * inside seatsMeta
   */
  const seg =
    booking?.seatsMeta?.[0]?.segment ||
    booking?.seatsMeta?.[0];

  if (seg) {
    flightName =
      seg.carrierCode && seg.flightNumber
        ? `${seg.carrierCode} ${seg.flightNumber}`
        : "—";

    origin = seg.origin || seg.from || "—";
    destination = seg.destination || seg.to || "—";

    departureAt = seg.departureAt
      ? new Date(seg.departureAt)
      : null;

    arrivalAt = seg.arrivalAt
      ? new Date(seg.arrivalAt)
      : null;

    duration = seg.duration || "—";
  }

  const travelDate = departureAt
    ? departureAt.toLocaleDateString()
    : "—";



  // ---- Derived pricing (display only) ----
  const price = booking.price || {};

  const derivedBaseFare =
    Number(price.amount || 0)
    - Number(price.tax || 0)
    - Number(price.addonsTotal || 0)
    + Number(price.discountsTotal || 0);

  // console.log("BOOKING OBJECT", booking);
  // console.log("SEATS META", booking.seatsMeta);

  return (
    <>
      {showSuccess && (
        <BookingSuccess
          bookingRef={booking.bookingRef}
          onClose={() => setShowSuccess(false)}
        />
      )}

      <TicketModal
        open={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        submitting={updatingTicket}
        initial={ticketNumbers}
        onSubmit={submitTicketNumbers}
      />

      <div className="p-6 max-w-3xl mx-auto">
        <div className="panel-3d bg-[#07182a] rounded p-6">
          {/* ------- HEADER ------- */}
          <div className="flex justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Booking: {booking.bookingRef}
              </h2>
              <div className="text-sm text-slate-300">
                Created:{" "}
                {booking.createdAt
                  ? new Date(booking.createdAt).toLocaleString()
                  : "—"}
              </div>

              <div className="mt-2 text-sm text-slate-300">
                Status: <span className="text-white ml-2">{bookingStatus}</span>
              </div>

              <div className="mt-1 text-sm text-slate-300">
                Payment: <span className="text-white ml-2">{paymentStatus}</span>
              </div>
            </div>

            {/* ------- RIGHT SIDE ------- */}
            <div className="text-right">
              {/* <div className="text-sm text-slate-300">Total</div>
              <div className="text-lg font-semibold text-white">
                {formatPrice(
                  booking.price?.amount,
                  booking.price?.currency || "INR"
                )}
              </div> */}

              {/* ------- RESEND CONFIRMATION BUTTON ------- */}
              <button
                onClick={handleResendConfirmation}
                disabled={resendStatus === "sending"}
                className="mt-3 px-3 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                {resendStatus === "sending"
                  ? "Sending…"
                  : "Resend Confirmation"}
              </button>

              {resendStatus !== "idle" && (
                <div className="text-xs mt-1">
                  {resendStatus === "sent" && (
                    <span className="text-green-400">{resendMessage}</span>
                  )}
                  {resendStatus === "failed" && (
                    <span className="text-red-400">{resendMessage}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ------- DETAILS ------- */}
          <div className="mt-6 space-y-6">
            {/* Flight Info
            <div className="space-y-1">
              <div className="text-lg font-semibold text-white">
                {flightName}
              </div>

              <div className="text-sm text-slate-300">
                {origin} → {destination}
              </div>

              <div className="text-sm text-slate-400">
                Departure:{" "}
                {departureAt
                  ? departureAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "—"}
                {"  •  "}
                Arrival:{" "}
                {arrivalAt
                  ? arrivalAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </div>


              <div className="text-sm text-slate-400">
                Date: {travelDate} {" • "} Duration: {duration}
              </div>

            </div> */}

            {/* Passengers */}
            <div>
              <h4 className="text-sm text-slate-300 mb-2">Passengers</h4>
              {booking.passengers?.length ? (
                <ul className="list-disc pl-6 text-white text-sm">
                  {booking.passengers.map((p, i) => (
                    <li key={i}>
                      {p.firstName} {p.lastName} — Seat: {seatLabels[i] || "—"}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-slate-300">No passengers</div>
              )}
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm text-slate-300 mb-2">Contact</h4>
              <div className="text-white">{booking.contact?.name || "—"}</div>
              <div className="text-sm text-slate-400">
                {booking.contact?.email} • {booking.contact?.phone}
              </div>
            </div>

            {/* Seats */}
            <div>
              <h4 className="text-sm text-slate-300 mb-2">Seats</h4>
              <div className="text-white text-sm">
                {seatLabels.length ? seatLabels.join(", ") : "—"}
              </div>
            </div>

            {/* Fare Breakdown */}
            <div className="mt-6 border-t border-white/10 pt-4 space-y-2 text-sm">
              <Row
                label="Base Fare (Seats & Class)"
                value={derivedBaseFare}
              />

              {booking.price.addonsTotal > 0 && (
                <Row label="Add-ons" value={booking.price.addonsTotal} />
              )}

              {booking.price.discountsTotal > 0 && (
                <Row
                  label="Discounts"
                  value={-booking.price.discountsTotal}
                  negative
                />
              )}

              {booking.price.tax > 0 && (
                <Row label="Taxes & Fees" value={booking.price.tax} />
              )}

              <div className="border-t border-white/10 pt-2 flex justify-between font-semibold text-white">
                <span>Total Paid</span>
                <span>
                  ₹{Number(booking.price.amount).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Provider info */}
            <div>
              <h4 className="text-sm text-slate-300 mb-2">Provider & Payment</h4>
              <div className="text-sm text-slate-300">
                Provider PNR:
                <span className="ml-2 text-white">
                  {booking.providerBookingId || "—"}
                </span>
              </div>

              <div className="text-sm text-slate-300 mt-1">
                Payment Provider:
                <span className="ml-2 text-white">
                  {booking.paymentProvider || "—"}
                </span>
              </div>

              {ticketNumbers.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm text-slate-300">Tickets:</div>
                  <ul className="list-disc pl-6 text-white text-sm">
                    {ticketNumbers.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ------- Actions ------- */}
          <div className="mt-6 flex gap-3">
            {bookingStatus !== "TICKETED" && (
              <button
                onClick={() => setTicketModalOpen(true)}
                className="btn-accent px-3 py-1"
              >
                Mark as Ticketed
              </button>
            )}
            <CancelBookingButton
              booking={booking} // your booking object
              onUpdated={(updatedBooking) => {
                // update local state so UI reflects cancellation immediately
                setBooking(updatedBooking);
                // optionally show toast
                // toast.success('Booking cancelled');
              }}
            />
            <button
              onClick={downloadPDF}
              className="
    inline-flex items-center gap-2
    px-5 py-3 rounded-xl
    bg-gradient-to-r from-cyan-500 to-blue-600
    text-white font-semibold
    hover:from-cyan-400 hover:to-blue-500
    shadow-lg shadow-cyan-500/20
    transition-all
  "
            >
              ⬇ Download Ticket (PDF)
            </button>



          </div>

        </div>
      </div>
    </>
  );
}

function Row({ label, value, negative }) {
  return (
    <div className="flex justify-between text-slate-300">
      <span>{label}</span>
      <span className={negative ? "text-red-400" : ""}>
        ₹{Number(value || 0).toLocaleString()}
      </span>
    </div>
  );
}

