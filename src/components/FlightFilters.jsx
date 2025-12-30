// src/components/FlightFilters.jsx
import React, { useMemo } from "react";

/* ---- helpers ---- */
function durationMinutes(f) {
  const iso = f?.raw?.itineraries?.[0]?.duration;
  if (!iso) return Infinity;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return Infinity;
  return Number(m[1] || 0) * 60 + Number(m[2] || 0);
}

export default function FlightFilters({
  flights = [],
  filters,
  onChange,
  onPickFlight,
  onTimeFilter,
}) {
  /* ---------------- AIRLINES ---------------- */
  const airlines = useMemo(() => {
    const set = new Set();
    flights.forEach((f) => {
      const code =
        f?.itineraries?.[0]?.segments?.[0]?.carrierCode ||
        f?.validatingAirlineCodes?.[0] ||
        f?.airline;
      if (code) set.add(code);
    });
    return Array.from(set);
  }, [flights]);

  /* ---------------- PRICE RANGE ---------------- */
  const prices = useMemo(() => {
    const vals = flights
      .map((f) => Number(f?.price?.amount || f?.price || 0))
      .filter((n) => n > 0);
    return {
      min: Math.min(...vals, 0),
      max: Math.max(...vals, 0),
    };
  }, [flights]);

  function toggleArray(key, value) {
    onChange((prev) => {
      const set = new Set(prev[key]);
      set.has(value) ? set.delete(value) : set.add(value);
      return { ...prev, [key]: Array.from(set) };
    });
  }

  /* ---------------- INSIGHTS ---------------- */
  const insights = useMemo(() => {
    if (!flights.length) return null;

    const enriched = flights.map((f) => ({
      flight: f,
      price: Number(f?.price?.amount || Infinity),
      duration: durationMinutes(f),
    }));

    const cheapest = [...enriched].sort((a, b) => a.price - b.price)[0];
    const fastest = [...enriched].sort((a, b) => a.duration - b.duration)[0];

    const pricesArr = enriched.map((e) => e.price);
    const dursArr = enriched.map((e) => e.duration);

    const minP = Math.min(...pricesArr);
    const maxP = Math.max(...pricesArr);
    const minD = Math.min(...dursArr);
    const maxD = Math.max(...dursArr);

    function score(e) {
      const p = (e.price - minP) / Math.max(1, maxP - minP);
      const d = (e.duration - minD) / Math.max(1, maxD - minD);
      return p + d; // lower = better value
    }

    const bestValue = [...enriched].sort((a, b) => score(a) - score(b))[0];

    return { cheapest, fastest, bestValue };
  }, [flights]);

  return (
    <div className="panel-3d p-4 sticky top-20 hidden lg:block">
      <h4 className="text-white font-semibold">Filters & Insights</h4>

      {/* -------- AIRLINES -------- */}
      <section>
        <div className="text-sm text-slate-300 mb-2">Airlines</div>
        <div className="space-y-2">
          {airlines.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.airlines.includes(a)}
                onChange={() => toggleArray("airlines", a)}
              />
              <span className="px-2 py-1 rounded bg-white/10 text-white text-xs">
                {a}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* -------- STOPS -------- */}
      <section>
        <div className="text-sm text-slate-300 mb-2">Stops</div>
        {["0", "1", "2+"].map((s) => (
          <label key={s} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.stops.includes(s)}
              onChange={() => toggleArray("stops", s)}
            />
            {s === "0" ? "Non-stop" : s === "1" ? "1 stop" : "2+ stops"}
          </label>
        ))}
      </section>

      {/* -------- PRICE -------- */}
      <section>
        <div className="text-sm text-slate-300 mb-2">
          Price (₹{filters.priceRange[0]} – ₹{filters.priceRange[1]})
        </div>
        <input
          type="range"
          min={prices.min}
          max={prices.max}
          value={filters.priceRange[1]}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              priceRange: [prev.priceRange[0], Number(e.target.value)],
            }))
          }
          className="w-full"
        />
      </section>

      {/* -------- INSIGHTS -------- */}
      {insights && (
        <>
          <section className="pt-3 border-t border-white/10">
            <InsightCard
              label="Cheapest"
              value={`₹${insights.cheapest.price}`}
              onClick={() => onPickFlight?.(insights.cheapest.flight)}
            />
            <InsightCard
              label="Fastest"
              value={`${Math.floor(insights.fastest.duration / 60)}h ${insights.fastest.duration % 60
                }m`}
              onClick={() => onPickFlight?.(insights.fastest.flight)}
            />
            <InsightCard
              label="Best value"
              value={`₹${insights.bestValue.price}`}
              highlight
              onClick={() => onPickFlight?.(insights.bestValue.flight)}
            />
          </section>

          <PriceTrendBar flights={flights} />

          <section className="pt-3 border-t border-white/10">
            <div className="text-sm text-slate-300 mb-2">Departure time</div>
            <div className="grid grid-cols-2 gap-2">
              {["early", "morning", "afternoon", "evening"].map((b) => (
                <button
                  key={b}
                  onClick={() => onTimeFilter?.(b)}
                  className="px-3 py-2 rounded bg-white/5 text-sm hover:bg-white/10"
                >
                  {b}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* ---------------- UI bits ---------------- */

function InsightCard({ label, value, highlight, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-lg p-3 mb-2 transition
        ${highlight ? "bg-cyan-500/10 border border-cyan-400/30" : "bg-white/5"}
        hover:bg-white/10
      `}
    >
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg text-white font-semibold">{value}</div>
    </button>
  );
}

function PriceTrendBar({ flights }) {
  const prices = flights
    .map((f) => Number(f?.price?.amount || 0))
    .filter(Boolean)
    .sort((a, b) => a - b);

  if (!prices.length) return null;

  const min = prices[0];
  const max = prices[prices.length - 1];

  return (
    <section>
      <div className="text-sm text-slate-300 mb-2">Price trend</div>
      <div className="flex gap-1">
        {prices.slice(0, 20).map((p, i) => (
          <div
            key={i}
            className="h-6 w-2 rounded"
            style={{
              background: `rgba(34,211,238,${0.3 + ((p - min) / Math.max(1, max - min)) * 0.6
                })`,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>₹{min}</span>
        <span>₹{max}</span>
      </div>
    </section>
  );
}
