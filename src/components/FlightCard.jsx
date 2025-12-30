// src/components/FlightCard.jsx
import React from "react";


/* ---- helpers ---- */
function timeFromISO(v) {
  if (!v || typeof v !== "string") return "—";
  return v.slice(11, 16);
}

function durationFromISO(iso) {
  if (!iso) return "—";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return "—";
  const h = m[1] ? `${m[1]}h ` : "";
  const min = m[2] ? `${m[2]}m` : "0m";
  return `${h}${min}`.trim();
}

function airlineColor(code) {
  if (!code) return "bg-slate-500/20 text-slate-300";

  // simple deterministic hash
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    "bg-cyan-500/20 text-cyan-300",
    "bg-indigo-500/20 text-indigo-300",
    "bg-emerald-500/20 text-emerald-300",
    "bg-violet-500/20 text-violet-300",
    "bg-rose-500/20 text-rose-300",
    "bg-amber-500/20 text-amber-300",
  ];

  return colors[Math.abs(hash) % colors.length];
}


export default function FlightCard({ flight = {},
  isCheapest,
  isFastest,
  isBestValue,
  isHighlighted,
  onBook }) {
  /* -------------------------------------------------
     DATA SOURCE PRIORITY
     1️⃣ flattened backend fields (correct path)
     2️⃣ raw Amadeus offer (fallback only)
  --------------------------------------------------*/

  const raw = flight.raw || {};

  /* ---- airline ---- */
  const carrierCode =
    flight.airline ||
    raw?.itineraries?.[0]?.segments?.[0]?.carrierCode ||
    "—";


  /* ---- flight number ---- */
  const flightNumber =
    flight.flightNumber ||
    raw?.itineraries?.[0]?.segments?.[0]?.number ||
    "";

  /* ---- route ---- */
  const origin =
    flight.origin ||
    raw?.itineraries?.[0]?.segments?.[0]?.departure?.iataCode ||
    "—";

  const destination =
    flight.destination ||
    raw?.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.iataCode ||
    "—";

  /* ---- times (THIS WAS THE BUG) ---- */
  const depTime =
    timeFromISO(flight.departureAt) ||
    timeFromISO(raw?.itineraries?.[0]?.segments?.[0]?.departure?.at);

  const arrTime =
    timeFromISO(flight.arrivalAt) ||
    timeFromISO(raw?.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.at);

  /* ---- duration ---- */
  const duration =
    durationFromISO(raw?.itineraries?.[0]?.duration) || "—";

  /* ---- stops ---- */
  const stops =
    raw?.itineraries?.[0]?.segments
      ? Math.max(0, raw.itineraries[0].segments.length - 1)
      : 0;

  /* ---- price ---- */
  const price = Number(flight?.price?.amount || 0);

  return (
    <div
      className={`
      relative w-full
      grid grid-cols-1 md:grid-cols-[220px_1fr_200px]
      items-center gap-6 md:gap-10
      rounded-2xl bg-white/5
      px-8 py-6
      transition-all
      ${isHighlighted ? "ring-2 ring-cyan-400/60 shadow-lg shadow-cyan-500/20" : ""}
      hover:bg-white/[0.07]
    `}
    >
      {/* Badges */}
      <div className="absolute -top-2 left-6 flex gap-2">
        {isCheapest && <Badge color="emerald">Cheapest</Badge>}
        {isFastest && <Badge color="cyan">Fastest</Badge>}
        {isBestValue && <Badge color="indigo">Best value</Badge>}
      </div>

      {/* Airline */}
      <div className="flex items-center gap-4">
        <div
          className={`
    w-14 h-14 rounded-full
    flex items-center justify-center
    font-bold text-lg
    ${airlineColor(carrierCode)}
  `}
        >
          {carrierCode}
        </div>

        <div>
          <div className="text-white text-lg font-semibold">{carrierCode}</div>
          <div className="text-sm text-slate-400">{flightNumber}</div>
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center justify-center gap-14">
        <TimeBlock time={depTime} code={origin} />
        <div className="text-center min-w-[140px]">
          <div className="text-sm text-slate-300">{duration}</div>
          <div className="text-xs text-slate-400">
            {stops === 0 ? "Non-stop" : `${stops} stop`}
          </div>
        </div>
        <TimeBlock time={arrTime} code={destination} />
      </div>

      {/* Price + CTA */}
      <div className="flex flex-col items-start md:items-end gap-3">
        <div
          key={price}
          className="
    text-xl font-semibold text-white
    transition-all duration-300
    animate-[fadeUp_0.3s_ease-out]
  "
        >
          ₹{price.toLocaleString()}
        </div>

        <div className="text-sm text-green-400">Best price</div>
        <button
          onClick={() => onBook?.()}
          className="
          px-7 py-3 rounded-xl text-base font-semibold
          bg-gradient-to-r from-cyan-500 to-blue-500
          hover:from-cyan-400 hover:to-blue-400
          text-white transition-all
        "
        >
          Book
        </button>
      </div>
    </div>
  );
}


function TimeBlock({ time, code }) {
  return (
    <div className="text-center">
      <div className="text-xl font-semibold text-white">{time}</div>
      <div className="text-sm text-slate-400">{code}</div>
    </div>
  );
}

function Badge({ children, color }) {
  return (
    <span className={`px-2 py-0.5 text-xs rounded bg-${color}-500/20 text-${color}-300`}>
      {children}
    </span>
  );
}
