// src/pages/BookingPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post } from "../services/api";
import SeatMap from "../components/SeatMap";

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [flight, setFlight] = useState(null);
  const [loadingFlight, setLoadingFlight] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatMapRefreshKey, setSeatMapRefreshKey] = useState(0);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });

  const [passengers, setPassengers] = useState([
    { firstName: "", lastName: "", passengerType: "adult" },
  ]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingFlight(true);
      try {
        const f = await get(`/flights/${encodeURIComponent(id)}`);
        if (mounted) setFlight(f);
      } catch (err) {
        console.error("[BookingPage] load flight error", err);
        if (mounted) setError(err?.message || "Failed to load flight");
      } finally {
        if (mounted) setLoadingFlight(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    function onBookingChange() {
      setSeatMapRefreshKey(v => v + 1);
    }

    window.addEventListener("bookings:changed", onBookingChange);
    window.addEventListener("storage", (e) => {
      if (e.key === "bookings:changed") {
        setSeatMapRefreshKey(v => v + 1);
      }
    });

    return () => {
      window.removeEventListener("bookings:changed", onBookingChange);
    };
  }, []);


  function updatePassenger(index, key, value) {
    setPassengers((prev) => {
      const next = [...prev];
      next[index] = { ...(next[index] || {}), [key]: value };
      return next;
    });
  }

  function addPassenger() {
    setPassengers((prev) => [
      ...prev,
      { firstName: "", lastName: "", passengerType: "adult" },
    ]);
  }

  // UPDATED: create booking, then create checkout session & redirect
  // inside BookingPage.jsx — replace existing handleCreateBooking with this
  async function handleCreateBooking(e) {
    e.preventDefault();

    if (!flight) return setError("No flight selected");
    if (selectedSeats.length === 0)
      return setError("Select at least one seat before booking");
    if (!contact.name || !contact.email)
      return setError("Contact name & email required");

    setCreating(true);
    setError(null);

    try {
      // 1) Create booking (do NOT request createSession here)
      const body = {
        flightId: flight._id || flight.id || id,
        passengers,
        contact,
        // keep seats as array of seat labels (backend expects array)
        seats: (selectedSeats || []).map((s) => (typeof s === "string" ? s : s?.label || s)),
        price: flight.price || { amount: 0, currency: "INR" },
      };

      const createResp = await post("/bookings", body);
      // normalize response to booking object (handle different API shapes)
      const booking = createResp?.booking || createResp?.data?.booking || createResp || null;

      if (!booking || (!booking._id && !booking.bookingRef)) {
        // Possibly backend returned a 2xx but not the booking shape — handle defensively
        console.warn("[BookingPage] unexpected booking response", createResp);
        setError("Booking created but could not parse booking id. Check server logs.");
        // navigate to bookings list or details if bookingRef present
        if (booking && booking.bookingRef) {
          navigate(`/booking-details/${booking.bookingRef}`);
          return;
        }
        return;
      }

      // dispatch lightweight notifications for dashboard update
      try { window.dispatchEvent(new Event("bookings:changed")); } catch (e) { }
      try { localStorage.setItem("bookings:changed", String(Date.now())); } catch (e) { }

      // 2) Create Stripe session by passing bookingId/bookingRef explicitly
      const bookingId = booking._id || booking.id || null;
      const bookingRef = booking.bookingRef || booking.booking_ref || null;

      try {
        const sessionResp = await post("/payments/create-checkout-session", {
          bookingId,
          bookingRef,
          // pass amount/currency if you want to trust frontend price
          amount: booking.price?.amount ?? (flight.price?.amount ?? 0),
          currency: booking.price?.currency ?? (flight.price?.currency ?? "INR"),
        });

        // Accept variations from backend: sessionResp may be the body or be { url, id }
        const sessionUrl = sessionResp?.url || sessionResp?.data?.url || (sessionResp && sessionResp.url) || null;
        if (sessionUrl) {
          // Redirect to Stripe Checkout
          window.location.href = sessionUrl;
          return;
        } else {
          // If backend returned session object with id only, or different shape:
          const urlFrom = sessionResp?.session?.url || sessionResp?.sessionUrl || null;
          if (urlFrom) {
            window.location.href = urlFrom;
            return;
          }
          // No URL — show message and navigate to booking details
          setStatusMsg && setStatusMsg("Payment session created but redirect URL missing.");
          // fallthrough to navigate to booking details
        }
      } catch (paymentErr) {
        // Payment session creation failed (400, 409, network etc)
        console.error("[BookingPage] create-checkout-session error", paymentErr);

        // try to extract backend message from axios-like error
        const msg =
          paymentErr?.response?.data?.message ||
          paymentErr?.response?.data?.error ||
          paymentErr?.message ||
          "Failed to create payment session";

        // If response status 409 or 400 — present helpful message
        if (paymentErr?.response?.status === 409) {
          setError("Conflict while creating payment session: " + msg);
        } else if (paymentErr?.response?.status === 400) {
          setError("Bad request creating payment session: " + msg);
        } else {
          setError("Payment initialization failed: " + msg);
        }

        // Still navigate to booking details so user can retry payment manually
        try {
          const refToOpen = booking.bookingRef || bookingRef || booking._id;
          if (refToOpen) {
            navigate(`/booking-details/${encodeURIComponent(refToOpen)}?paid=false`);
            return;
          }
        } catch (navErr) { /* ignore */ }
      }

      // fallback: go to booking details page after creating booking
      const finalRef = booking.bookingRef || booking._id || bookingId;
      if (finalRef) navigate(`/booking-details/${encodeURIComponent(finalRef)}`);
    } catch (err) {
      console.error("[BookingPage] create booking error", err);
      // pick helpful error
      const message = err?.response?.data?.message || err?.message || "Failed to create booking";
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  if (loadingFlight) return <div className="p-6">Loading flight...</div>;
  if (error && !flight)
    return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!flight) return <div className="p-6">Flight not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto text-white">
      <div className="panel-3d p-6">
        <h2 className="text-xl font-semibold mb-3">
          Book flight — {flight.airline} {flight.flightNumber}
        </h2>

        <div className="mb-4 text-sm text-gray-300">
          {flight.origin} → {flight.destination} •{" "}
          {flight.departureAt ? new Date(flight.departureAt).toLocaleString() : ""}
        </div>

        {/* SEAT MAP */}
        <div className="mb-8">
          <SeatMap
            key={`seatmap-${seatMapRefreshKey}`}
            flightId={flight._id || flight.id || flight.flightNumber}
            airline={
              flight?.itineraries?.[0]?.segments?.[0]?.carrierCode
              || (flight?.validatingAirlineCodes && flight.validatingAirlineCodes[0])
              || flight?.airline
              || flight?.provider
              || null
            }
            onSelectionChange={(s) => setSelectedSeats(s)}
          />
        </div>

        <form onSubmit={handleCreateBooking}>
          {/* CONTACT */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Contact</h3>
            <input
              className="dark-input w-full p-2 mb-2 rounded"
              placeholder="Full name"
              value={contact.name}
              onChange={(e) =>
                setContact({ ...contact, name: e.target.value })
              }
            />
            <input
              className="dark-input w-full p-2 mb-2 rounded"
              placeholder="Email"
              value={contact.email}
              onChange={(e) =>
                setContact({ ...contact, email: e.target.value })
              }
            />
            <input
              className="dark-input w-full p-2 rounded"
              placeholder="Phone"
              value={contact.phone}
              onChange={(e) =>
                setContact({ ...contact, phone: e.target.value })
              }
            />
          </div>

          {/* PASSENGERS */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Passengers</h3>
            {passengers.map((p, idx) => (
              <div key={idx} className="mb-2 grid grid-cols-3 gap-2">
                <input
                  className="dark-input p-2 rounded"
                  placeholder="First name"
                  value={p.firstName}
                  onChange={(e) =>
                    updatePassenger(idx, "firstName", e.target.value)
                  }
                />
                <input
                  className="dark-input p-2 rounded"
                  placeholder="Last name"
                  value={p.lastName}
                  onChange={(e) =>
                    updatePassenger(idx, "lastName", e.target.value)
                  }
                />
                <select
                  className="dark-input p-2 rounded"
                  value={p.passengerType}
                  onChange={(e) =>
                    updatePassenger(idx, "passengerType", e.target.value)
                  }
                >
                  <option value="adult">Adult</option>
                  <option value="child">Child</option>
                  <option value="infant">Infant</option>
                </select>
              </div>
            ))}
            <button
              type="button"
              onClick={addPassenger}
              className="px-3 py-1 rounded border border-white/20"
            >
              Add passenger
            </button>
          </div>

          {/* PRICE + SUBMIT */}
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">
              {(flight.price && (flight.price.currency || "INR"))}{" "}
              {(flight.price && flight.price.amount) || "—"}
            </div>

            <button
              type="submit"
              className="btn-accent px-4 py-2"
              disabled={creating}
            >
              {creating ? "Creating..." : "Proceed to payment"}
            </button>
          </div>

          {error && <div className="mt-3 text-red-500">{error}</div>}
        </form>
      </div>
    </div>
  );
}
