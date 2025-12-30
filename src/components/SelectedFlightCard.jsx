// src/components/SelectedFlightCard.jsx
import React from "react";

const CANCELLATION_PERCENT = 10; // change this if you want a different standard fee

function safeNumber(v, fallback = 0) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.\-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function formatMoneyMajor(amount, currency = "INR") {
  try {
    const n = Number(amount || 0);
    const cur = (currency || "INR").toUpperCase();
    const hasFraction = Math.abs(n - Math.round(n)) > 0.0001;
    if (!hasFraction) {
      return (cur === "INR" ? "₹ " : cur + " ") + Math.round(n).toLocaleString("en-IN");
    }
    return (cur === "INR" ? "₹ " : cur + " ") + n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (e) {
    return `${currency} ${amount}`;
  }
}

export default function SelectedFlightCard({ flight = {} }) {
  if (!flight) return null;

  const airline = flight.airline || flight.carrier || "Airline";
  const flightNumber = flight.flightNumber || flight.number || "";
  const origin = flight.origin || flight.from || "N/A";
  const destination = flight.destination || flight.to || "N/A";
  const depart = flight.departureAt ? new Date(flight.departureAt).toLocaleString() : flight.departure || "—";
  const priceMajorRaw = flight.price?.amount ?? flight.fare?.amount ?? null;
  const priceMajor = safeNumber(priceMajorRaw, 0);
  const currency = (flight.price && flight.price.currency) || "INR";

  // Example cancellation fee computed from price
  const cancellationPercent = CANCELLATION_PERCENT;
  const cancellationFeeMajor = Math.round(Math.abs(priceMajor) * (Number(cancellationPercent) / 100));
  const cancellationFeeStr = formatMoneyMajor(cancellationFeeMajor, currency);
  const displayPrice = priceMajor !== 0 ? formatMoneyMajor(priceMajor, currency) : "—";

  return (
    <div className="panel-3d p-4 rounded-md bg-white/3">
      <div className="flex items-start gap-4">
        <div className="w-28 h-20 rounded-lg overflow-hidden bg-white/3">
          <img src={flight.img || "/hero-bg.png"} alt="flight" className="w-full h-full object-cover" />
        </div>

        <div className="flex-1">
          <div className="flex justify-between">
            <div>
              <div className="font-semibold text-white">{airline} {flightNumber}</div>
              <div className="text-sm text-slate-300">{origin} → {destination}</div>
              <div className="text-xs text-slate-400 mt-1">Departs: {depart}</div>
            </div>

            <div className="text-right">
              <div className="text-lg font-semibold">{displayPrice}</div>
              <div className="text-xs text-slate-300">per passenger</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 text-sm text-slate-300">
            <div>
              <div className="text-xs text-slate-400">Baggage</div>
              <div className="mt-1 text-white">
                Availability varies by fare and carrier. Carry-on and checked baggage allowances may apply and additional charges may be levied for extra/oversize pieces.
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Meals</div>
              <div className="mt-1 text-white">
                Meal inclusion depends on fare class and carrier. Some fares include meals, others do not — charges may apply for onboard meals or special requests.
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Cancellation</div>
              <div className="mt-1 text-white">
                A standard cancellation charge of <span className="font-semibold">{cancellationPercent}%</span> applies to the total fare. Charges may vary by carrier/fare and refunds are subject to processing time and carrier terms.
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Example charge on this fare: <span className="text-white font-semibold">{cancellationFeeStr}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
