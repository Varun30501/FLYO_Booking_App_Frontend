// src/pages/SearchPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import FlightSearchForm from "../components/FlightSearchForm";
import { searchFlights } from "../services/flightsService";
import FlightCard from "../components/FlightCard";
import FlightFilters from "../components/FlightFilters";
import Modal from "../components/Modal";
import SelectedFlightCard from "../components/SelectedFlightCard";
import BookingForm from "../components/BookingForm";
import BookingSuccess from "../components/BookingSuccess";

export default function SearchPage() {
  const location = useLocation();
  const prefill = location?.state?.prefill || null;

  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bookingRef, setBookingRef] = useState(null);

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);

  const [lastSearch, setLastSearch] = useState(null);
  const [activeDate, setActiveDate] = useState(prefill?.date || null);
  const [dateAnchor, setDateAnchor] = useState(prefill?.date || null);

  const [searchParams] = useSearchParams();
  const date = searchParams.get("date");

  /* 🔹 NEW: stable date strip + price cache */
  const [dates, setDates] = useState([]);
  const [minPriceByDate, setMinPriceByDate] = useState({});

  const [filters, setFilters] = useState({
    airlines: [],
    stops: [],
    priceRange: [0, Infinity],
    timeBucket: null,
  });

  const [sort, setSort] = useState("price-asc");
  const [highlightId, setHighlightId] = useState(null);
  const dateStripRef = useRef(null);

  /* ---------------- DATE STRIP INIT (ONCE) ---------------- */

  useEffect(() => {
    if (!dateAnchor) return;

    const base = dayjs(dateAnchor);

    const d = Array.from({ length: 14 }).map((_, i) => {
      const date = base.add(i, "day");
      return {
        date: date.format("YYYY-MM-DD"),
        label: date.format("ddd, DD MMM"),
      };
    });

    setDates(d);
  }, [dateAnchor]);



  function scrollDates(dir) {
    dateStripRef.current?.scrollBy({
      left: dir * 320,
      behavior: "smooth",
    });
  }

  /* ---------------- SEARCH ---------------- */

  async function onSearch(query) {
    setLastSearch(query);
    setDateAnchor((prev) => prev || query.date);
    setHasSearched(true);
    setLoading(true);
    setError(null);

    try {
      const list = await searchFlights(query);
      const flights = Array.isArray(list) ? list : [];

      setResults(flights);
      setActiveDate(query.date);

      /* 🔹 cache min price for this date */
      if (query?.date && flights.length) {
        const min = Math.min(...flights.map(getPrice));
        setMinPriceByDate((prev) => ({
          ...prev,
          [query.date]: min,
        }));
      }
    } catch (err) {
      console.error("Search failed", err);
      setError("Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- FILTER + SORT ---------------- */

  const filteredResults = useMemo(() => {
    let list = results.filter((f) => {
      const carrier =
        f?.itineraries?.[0]?.segments?.[0]?.carrierCode ||
        f?.validatingAirlineCodes?.[0] ||
        f?.airline;

      if (filters.airlines.length && !filters.airlines.includes(carrier)) {
        return false;
      }

      /* ---- departure time filter ---- */
      /* ---- departure time filter (FIXED) ---- */
      if (filters.timeBucket) {
        const depAt =
          f?.itineraries?.[0]?.segments?.[0]?.departure?.at ||
          f?.departureAt;

        if (!depAt) return false;

        const hour = Number(depAt.slice(11, 13));

        const bucketMap = {
          early: hour >= 0 && hour < 6,
          morning: hour >= 6 && hour < 12,
          afternoon: hour >= 12 && hour < 18,
          evening: hour >= 18 && hour < 24,
        };

        if (!bucketMap[filters.timeBucket]) return false;
      }


      const price = getPrice(f);
      const stops = (f?.itineraries?.[0]?.segments?.length || 1) - 1;

      if (filters.stops.length) {
        if (stops === 0 && !filters.stops.includes("0")) return false;
        if (stops === 1 && !filters.stops.includes("1")) return false;
        if (stops >= 2 && !filters.stops.includes("2+")) return false;
      }

      if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
        return false;
      }

      return true;
    });

    if (sort === "price-asc") {
      list.sort((a, b) => getPrice(a) - getPrice(b));
    }

    if (sort === "price-desc") {
      list.sort((a, b) => getPrice(b) - getPrice(a));
    }

    if (sort === "duration") {
      list.sort((a, b) => getDuration(a) - getDuration(b));
    }

    if (sort === "smart") {
      const prices = list.map(getPrice);
      const durations = list.map(getDuration);

      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const minD = Math.min(...durations);
      const maxD = Math.max(...durations);

      list.sort((a, b) => {
        const score = (f) => {
          const p = (getPrice(f) - minP) / Math.max(1, maxP - minP);
          const d = (getDuration(f) - minD) / Math.max(1, maxD - minD);
          return p + d;
        };
        return score(a) - score(b);
      });
    }


    return list;
  }, [results, filters, sort]);

  /* ---------------- BADGES ---------------- */

  const cheapestId = useMemo(() => {
    if (!filteredResults.length) return null;
    return [...filteredResults].sort((a, b) => getPrice(a) - getPrice(b))[0]?._id;
  }, [filteredResults]);

  const fastestId = useMemo(() => {
    if (!filteredResults.length) return null;
    return [...filteredResults].sort((a, b) => getDuration(a) - getDuration(b))[0]?._id;
  }, [filteredResults]);

  const bestValueId = useMemo(() => {
    if (!filteredResults.length) return null;

    const prices = filteredResults.map(getPrice);
    const durations = filteredResults.map(getDuration);

    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const minD = Math.min(...durations);
    const maxD = Math.max(...durations);

    function score(f) {
      const p = (getPrice(f) - minP) / Math.max(1, maxP - minP);
      const d = (getDuration(f) - minD) / Math.max(1, maxD - minD);
      return p + d;
    }

    return [...filteredResults].sort((a, b) => score(a) - score(b))[0]?._id;
  }, [filteredResults]);

  function handleSelect(flight) {
    setSelected(flight);
    setBookingRef(null);
    setModalOpen(true);
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="pt-14 px-3 sm:px-4 max-w-7xl mx-auto">
      <FlightSearchForm onSearch={onSearch} prefill={prefill} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        <aside className="lg:col-span-3 hidden lg:block">
          <FlightFilters
            flights={filteredResults}
            filters={filters}
            onChange={setFilters}
            onPickFlight={(f) => {
              const id = f._id;
              document.getElementById(id)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              setHighlightId(id);
              setTimeout(() => setHighlightId(null), 1200);
            }}
          />
        </aside>

        <main className="lg:col-span-9">
          {!hasSearched && (
            <div className="panel-3d p-8 text-center text-slate-300">
              Select origin and destination to search your flights ✈️
            </div>
          )}

          {hasSearched && loading && (
            <div className="p-6 text-slate-300">Searching flights…</div>
          )}

          {!loading && filteredResults.length > 0 && (
            <>
              {/* Sort bar */}
              <div className="flex justify-between items-center mb-3">
                <div className="text-slate-300 text-sm">
                  {filteredResults.length} flights found
                </div>

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="
      bg-white/10 text-white
      px-3 py-2 rounded-lg
      text-sm border border-white/20
      hover:bg-white/15 transition
    "
                >
                  <option value="smart">Smart / Recommended</option>
                  <option value="price-asc">Cheapest first</option>
                  <option value="price-desc">Costliest first</option>
                  <option value="duration">Shortest duration</option>
                </select>
              </div>

              {/* Date strip */}
              <div className="
  sticky top-16 z-30
  bg-[#020617]/90 backdrop-blur
  py-3 mb-6
  flex items-center gap-3
  overflow-x-hidden no-scrollbar
">
                <Arrow onClick={() => scrollDates(-1)} />

                <div
                  ref={dateStripRef}
                  className="flex gap-3 overflow-x-auto scroll-smooth no-scrollbar pb-2"
                >
                  {dates.map((d) => (
                    <button
                      key={d.date}
                      onClick={() =>
                        onSearch({ ...lastSearch, date: d.date })
                      }
                      className={`
                        min-w-[120px] px-4 py-3 rounded-xl
                        transition-all duration-200
                        ${d.date === activeDate
                          ? "bg-cyan-500/20 text-white ring-1 ring-cyan-400"
                          : "bg-white/5 text-slate-300 hover:bg-white/10"
                        }
                      `}
                    >
                      <div className="text-sm font-medium">{d.label}</div>
                      <div
                        className="
    text-xs text-green-400
    transition-all duration-300
    motion-safe:animate-fadeIn
  "
                      >

                        ₹{minPriceByDate[d.date] ?? "—"}
                      </div>
                    </button>
                  ))}
                </div>

                <Arrow right onClick={() => scrollDates(1)} />
              </div>

              <div className="space-y-4">
                {filteredResults.map((f) => (
                  <div key={f._id} id={f._id}>
                    <FlightCard
                      flight={f}
                      isHighlighted={highlightId === f._id}
                      isCheapest={f._id === cheapestId}
                      isFastest={f._id === fastestId}
                      isBestValue={f._id === bestValueId}
                      onBook={() => handleSelect(f)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        {bookingRef ? (
          <BookingSuccess bookingRef={bookingRef} />
        ) : (
          <>
            <SelectedFlightCard flight={selected} />
            <BookingForm
              flight={selected}
              travelDate={activeDate}
              origin={lastSearch?.origin}
              destination={lastSearch?.destination}
            />
          </>
        )}
      </Modal>
    </div>
  );
}

/* helpers */

function getPrice(f) {
  return Number(f?.price?.amount || f?.price?.total || 0);
}

function getDuration(f) {
  const segs = f?.itineraries?.[0]?.segments || [];
  return segs.reduce((s, seg) => s + (seg.durationMinutes || 0), 0);
}

function Arrow({ right, onClick }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
      aria-label={right ? "Next dates" : "Previous dates"}
    >
      <span className={`text-white text-lg ${right ? "rotate-180" : ""}`}>
        ❮
      </span>
    </button>
  );
}
