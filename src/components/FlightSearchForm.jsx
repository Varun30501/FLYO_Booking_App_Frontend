// src/components/FlightSearchForm.jsx
import React, { useEffect, useState } from "react";
import AirportPicker from "./AirportPicker";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";

export default function FlightSearchForm({ onSearch, prefill = null }) {
  const [tripType, setTripType] = useState("oneway"); // UI only for now
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);

  // Prefill from offers / dashboard
  useEffect(() => {
    if (!prefill) return;
    if (prefill.origin) setOrigin(prefill.origin);
    if (prefill.destination) setDestination(prefill.destination);
    if (prefill.date) setDate(prefill.date);
  }, [prefill]);

  function swap() {
    setOrigin((prev) => {
      setDestination(prev);
      return destination;
    });
  }

  async function submit(e) {
    e.preventDefault();

    const codeOf = (v) =>
      typeof v === "string" ? v : v?.code || v?.iata || null;

    const o = codeOf(origin);
    const d = codeOf(destination);

    if (!o || !d) {
      return alert("Select origin and destination");
    }

    setLoading(true);
    try {
      await onSearch({
        origin: o,
        destination: d,
        date
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel-3d p-6">
      {/* Trip type */}
      <div className="flex items-center gap-3 mb-4">
        <Tab active={tripType === "oneway"} onClick={() => setTripType("oneway")}>
          One Way
        </Tab>
        <Tab active={tripType === "round"} onClick={() => setTripType("round")}>
          Round Trip
        </Tab>

        <div className="ml-auto text-sm text-green-400 flex items-center gap-2">
          ✔ Best Flight Offers
        </div>
      </div>

      {/* Main row */}
      <form
        onSubmit={submit}
        className="
          grid grid-cols-1 md:grid-cols-[2fr_auto_2fr_1.5fr_1.5fr_auto]
          gap-3 items-end
        "
      >
        {/* FROM */}
        <Field label="From">
          <AirportPicker value={origin} onChange={setOrigin} />
        </Field>

        {/* SWAP */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={swap}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
            title="Swap"
          >
            <ArrowsRightLeftIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* TO */}
        <Field label="To">
          <AirportPicker value={destination} onChange={setDestination} />
        </Field>

        {/* DEPARTURE */}
        <Field label="Departure">
          <input
            type="date"
            min={dayjs().format("YYYY-MM-DD")}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 rounded bg-white/10 text-white border border-white/20 focus:ring-2 focus:ring-orange-400"
          />

        </Field>

        {/* SEARCH */}
        <button
          type="submit"
          disabled={loading}
          className="
            h-[52px] px-6 rounded-xl
            bg-gradient-to-r from-[#06b6d4] to-[#4f5ff6]
            text-white font-semibold text-lg
            transition disabled:opacity-100
          "
        >
          {loading ? "Searching…" : "Search →"}
        </button>
      </form>

      {/* Special fares */}
      {/* <div className="flex flex-wrap items-center gap-3 mt-5 text-sm">
        <span className="text-slate-300">Special Fares (Optional):</span>
        <Chip>Student</Chip>
        <Chip>Senior Citizen</Chip>
        <Chip>Armed Forces</Chip>
      </div> */}

      {/* Assurance bar */}
      <div className="mt-5 rounded-lg bg-cyan-500/10 p-4 text-sm text-cyan-100 flex items-center gap-4">
        <input type="checkbox" />
        <span>
          Always opt for <strong>Free Cancellation</strong> • ₹0 fee • Instant
          refunds • Priority support
        </span>
      </div>
    </div>
  );
}

/* ---------------- UI helpers ---------------- */

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Tab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full border
        ${active
          ? "bg-white text-black border-white"
          : "bg-transparent text-white border-white/30 hover:bg-white/10"}
      `}
    >
      {children}
    </button>
  );
}

function Chip({ children }) {
  return (
    <button className="px-4 py-1 rounded-full border border-white/30 text-white hover:bg-white/10 transition">
      {children}
    </button>
  );
}
