// src/components/SeatMap.jsx
import React, { useEffect, useState, useRef } from 'react';

/**
 * SeatMap component (patched)
 * - seat number displayed in headrest (top)
 * - price displayed inside cushion (single place)
 * - tooltip positioned above the seat and centered (relative to map container)
 * - price is computed as:
 *    - use s.price (absolute) if provided (number)
 *    - else basePrice + (s.priceModifier || s.classPrice || 0)
 *  - basePrice resolution order: map.defaultPrice, map.basePrice, map.price.amount, flightObj.price (object or primitive), map.defaultPerSeat
 *  - tooltip no longer shows "free" / "available" / held-by / hold-until
 */


export default function SeatMap({
  flightId,
  travelDate,
  origin,
  destination,
  airline,
  flightObj,
  refreshKey,
  onSelectionChange,
  selectedSeats = [],
  canSelect = true,
  maxSelectable = Infinity,
  hasRestrictedPassengers
}) {
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [tooltip, setTooltip] = useState(null); // {left, top, seat, ...}
  const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
  const mountedRef = useRef(true);
  const containerRef = useRef(null); // for tooltip positioning relative to container
  const [showExtraLegroomOnly, setShowExtraLegroomOnly] = useState(false);
  const [zoom, setZoom] = React.useState(1);

  const isMobile = useIsMobile();

  const economyStartRow = 11;

  const onWheelZoom = (e) => {
    if (!e.ctrlKey && !isMobile) return;
    e.preventDefault();
    setZoom(z => Math.min(1.8, Math.max(0.8, z - e.deltaY * 0.001)));
  };

  const onTouchStartRef = React.useRef(null);

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      onTouchStartRef.current = Math.hypot(dx, dy);
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 2 && onTouchStartRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      setZoom(z => Math.min(1.8, Math.max(0.8, z * (dist / onTouchStartRef.current))));
      onTouchStartRef.current = dist;
    }
  };

  const [restrictionModal, setRestrictionModal] = React.useState({
    open: false,
    message: ''
  });

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // IMPORTANT:
  // SeatMap emits ENRICHED seat objects (seatId, seatClass, priceModifier, price)
  // BookingForm relies on seatMap fetch for pricing, not on raw selection objects.
  // Do NOT change this contract without updating BookingForm.

  useEffect(() => {
    if (!onSelectionChange || !map) return;

    const base = resolveBasePrice();

    const enriched = selected.map(seatId => {
      const s = (map.seats || []).find(
        x => x && (x.seatId === seatId || x.label === seatId)
      );
      if (!s) return null;

      const modifier =
        typeof s.priceModifier === 'number'
          ? Number(s.priceModifier)
          : typeof s.classPrice === 'number'
            ? Number(s.classPrice)
            : 0;

      const price =
        typeof s.price === 'number'
          ? Number(s.price)
          : base !== null
            ? Number(base) + modifier
            : modifier;

      return {
        seatId: s.seatId,
        label: s.seatId,
        seatClass: s.seatClass || null,
        priceModifier: modifier,
        price: Math.round(price)
      };
    }).filter(Boolean);

    onSelectionChange(enriched);
  }, [selected, map]);

  const AIRCRAFT_RULES = {
    DEFAULT: { economyStartRow: 11 },
    A320: { economyStartRow: 11 },
    B737: { economyStartRow: 12 } // example
  };


  function normalizeSeatClass(name = "") {
    if (!name) return null;
    const n = String(name).toLowerCase().replace(/\s+/g, "");
    if (n === "first") return "First Class";
    if (n === "business") return "Business Class";
    if (n === "premiumeconomy" || n === "premiumeco" || n === "premeco") return "Premium Economy";
    if (n === "economy" || n === "eco") return "Economy";
    // fallback: Capitalize each word and add "Class" if not present
    const words = String(name).split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1));
    const joined = words.join(' ');
    return joined.includes('Class') ? joined : `${joined} Class`;
  }

  function shouldRenderCabinHeaderByChange(rowNum, map) {
    if (!map?.seats) return false;

    const getRowClass = (row) => {
      const seat = map.seats.find(s => Number(s?.row) === row);
      return seat?.seatClass || null;
    };

    const currentClass = getRowClass(rowNum);
    const previousClass = getRowClass(rowNum - 1);

    // render header if:
    // - first row with a class
    // - class changes from previous row
    return !!currentClass && currentClass !== previousClass;
  }


  // Visual identity per seat class (professional airline style)
  function seatClassColors(seatClass) {
    const c = String(seatClass || '').toLowerCase().replace(/\s+/g, '');

    switch (c) {
      case 'first':
      case 'firstclass':
        return {
          back: '#4c1d95',      // deep purple
          cushion: '#6d28d9'
        };

      case 'business':
      case 'businessclass':
        return {
          back: '#1e3a8a',      // royal blue
          cushion: '#2563eb'
        };

      case 'premiumeconomy':
      case 'premiumeco':
      case 'premeco':
        return {
          back: '#0f766e',      // teal
          cushion: '#14b8a6'
        };

      case 'economy':
      default:
        return {
          back: '#1f2937',      // neutral grey
          cushion: '#374151'
        };
    }
  }

  function seatClassHeaderColor(seatClass) {
    const colors = seatClassColors(seatClass);
    return colors.back;
  }

  function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState(
      typeof window !== 'undefined' && window.innerWidth < 640
    );

    React.useEffect(() => {
      const onResize = () => setIsMobile(window.innerWidth < 640);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

    return isMobile;
  }

  function LegendItem({ color, label, outline }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: isMobile ? 12 : 16,
          height: isMobile ? 12 : 16,
          borderRadius: 4,
          background: outline ? 'transparent' : color,
          border: outline ? `2px solid ${color}` : 'none'
        }} />
        <span>{label}</span>
      </div>
    );
  }

  function detectExitRows(seats = []) {
    if (!Array.isArray(seats) || seats.length === 0) return [];

    // group seats by row
    const rows = {};
    seats.forEach(s => {
      if (!s || !s.row || !s.col) return;
      const r = Number(s.row);
      const c = Number(s.col);
      if (!rows[r]) rows[r] = [];
      rows[r].push(c);
    });

    const rowNumbers = Object.keys(rows).map(Number).sort((a, b) => a - b);
    const exitRows = new Set();

    // helper: detect missing column gaps (door cutout / aisle shift)
    const hasLargeColumnGap = (cols) => {
      const sorted = [...cols].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i - 1] >= 2) return true;
      }
      return false;
    };

    // 1️⃣ structural column gap detection
    rowNumbers.forEach(r => {
      if (hasLargeColumnGap(rows[r])) {
        exitRows.add(r);
      }
    });

    // 2️⃣ vertical row gap detection (door space)
    for (let i = 0; i < rowNumbers.length - 1; i++) {
      const curr = rowNumbers[i];
      const next = rowNumbers[i + 1];
      if (next - curr >= 2) {
        exitRows.add(curr);
      }
    }

    // 3️⃣ fallback: significantly fewer seats than median
    const seatCounts = rowNumbers.map(r => rows[r].length);
    const sortedCounts = [...seatCounts].sort((a, b) => a - b);
    const median = sortedCounts[Math.floor(sortedCounts.length / 2)] || 0;

    rowNumbers.forEach(r => {
      if (rows[r].length <= Math.max(1, Math.floor(median * 0.6))) {
        exitRows.add(r);
      }
    });

    return Array.from(exitRows).sort((a, b) => a - b);
  }

  function decodeJwtUserId(token) {
    try {
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.userId || payload.sub || payload.id || payload._id || null;
    } catch (e) { return null; }
  }
  function getCurrentUserId() {
    const explicit = localStorage.getItem('userId');
    if (explicit) return explicit;
    const jwt = localStorage.getItem('jwt') || localStorage.getItem('token') || null;
    const fromJwt = decodeJwtUserId(jwt);
    return fromJwt || 'guest';
  }

  function buildCandidates() {
    // STRICT: only allow flightId
    if (!flightId) return [];
    return [String(flightId)];
  }


  async function tryFetchKey(key) {
    const hasDate =
      travelDate &&
      typeof travelDate === "string" &&
      travelDate !== "undefined";

    const hasRoute =
      origin &&
      destination &&
      typeof origin === "string" &&
      typeof destination === "string";

    if (!hasDate || !hasRoute) {
      throw new Error('SeatMap requires travelDate, origin and destination');
    }

    const url =
      `${API_BASE}/seats/${encodeURIComponent(key)}?date=${encodeURIComponent(travelDate)}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;


    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return { ok: true, json, url };
      }
      return { ok: false, status: res.status, url };
    } catch (err) {
      return { ok: false, error: err, url };
    }
  }



  async function fetchMap() {
    if (!travelDate) {
      setStatusMsg('Travel date missing. Please restart booking.');
      setMap(null);
      setLoading(false);
      return;
    }

    if (!flightId && !airline && !flightObj) {
      setStatusMsg('No flight specified');
      setMap(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setStatusMsg('');
    const candidates = buildCandidates();
    for (const k of candidates) {
      const r = await tryFetchKey(k);
      if (r && r.ok) {
        if (!mountedRef.current) return;
        setMap(r.json);
        setLoading(false);
        return;
      }
    }
    if (mountedRef.current) {
      setStatusMsg(
        `Seat map not found for flight ${flightId}. Please contact support.`
      );
      setMap(null);
      setLoading(false);
    }
  }

  // fetch initially and then every 10 minutes
  useEffect(() => {
    fetchMap();
    const interval = 10 * 60 * 1000; // 10 minutes
    const t = setInterval(fetchMap, interval);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightId, travelDate, airline, JSON.stringify(flightObj)]);

  function toggleSelect(seatId) {
    if (!canSelect) return;
    if (!map) return;
    const s = (map?.seats || []).find(x => x && (x.seatId === seatId || x.label === seatId || x.id === seatId));
    if (!s) return;
    if (s.status === 'booked') return; // cannot select
    const currentUserId = getCurrentUserId();
    if (s.status === 'held' && s.heldBy && s.heldBy !== currentUserId) return; // held by other user

    setSelected(prev => {
      if (prev.includes(seatId)) return prev.filter(x => x !== seatId);
      if (prev.length >= maxSelectable) return prev;
      return [...prev, seatId];
    });
  }

  // helper to compute grid rows/cols and seat lookup
  const rows = map?.rows || 0;
  const cols = map?.cols || 0;

  // seat lookup map for fast access
  const exitRows = detectExitRows(map?.seats || []);

  const seatByPos = React.useMemo(() => {
    const result = {};

    (map?.seats || []).forEach(s => {
      if (!s) return;

      const rowNum = Number(s.row);

      const isExtraLegroomRow =
        rowNum === economyStartRow && s.seatClass === 'Economy';

      const isRestricted =
        isExtraLegroomRow && hasRestrictedPassengers;

      const seat = {
        ...s,
        isExitRow: isExtraLegroomRow,
        isRestricted,
        features: {
          ...s.features,
          extraLegroom: s.features?.extraLegroom || isExtraLegroomRow
        }
      };

      if (showExtraLegroomOnly && !seat.features.extraLegroom) {
        return;
      }

      const r = rowNum || 0;
      const c = Number(seat.col) || 0;
      result[`${r}-${c}`] = seat;
    });

    return result;
  }, [
    map?.seats,
    showExtraLegroomOnly,
    hasRestrictedPassengers,
    economyStartRow
  ]);

  React.useEffect(() => {
    if (!hasRestrictedPassengers) return;

    const invalidSelected = selectedSeats.filter(seatId => {
      const seat = Object.values(seatByPos).find(
        s => s.seatId === seatId
      );
      return seat?.isRestricted;
    });

    if (invalidSelected.length > 0) {
      onChange(
        selectedSeats.filter(id => !invalidSelected.includes(id))
      );
    }
  }, [hasRestrictedPassengers, seatByPos]);

  // aisle heuristic: insert gap after middle column if cols > 6
  const aisleAfter = cols > 6 ? Math.floor(cols / 2) : null;

  // sizing constants (smaller seats)
  const SEAT_BOX_WIDTH = 56;   // cushion width
  const SEAT_BOX_HEIGHT = 72;  // total approx
  const BACKREST_HEIGHT = 28;
  const CUSHION_WIDTH = 50;
  const CUSHION_HEIGHT = 34;
  const SEAT_MARGIN = 6;

  function formatRupee(amount) {
    try {
      const n = Number(amount || 0);
      if (Number.isNaN(n)) return String(amount || '');
      // use en-IN formatting with no decimal places
      return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
    } catch (e) {
      return `₹${amount}`;
    }
  }

  // Resolve a numeric base price (major units) to add modifiers to.
  function resolveBasePrice() {
    // try various fields on map, then flightObj
    try {
      if (map && typeof map.defaultPrice === 'number') return Number(map.defaultPrice);
      if (map && typeof map.basePrice === 'number') return Number(map.basePrice);
      if (map && map.price && typeof map.price.amount === 'number') return Number(map.price.amount);
      if (map && typeof map.defaultPerSeat === 'number') return Number(map.defaultPerSeat);
      // flightObj price shapes
      if (flightObj && typeof flightObj.price === 'number') return Number(flightObj.price);
      if (flightObj && flightObj.price && typeof flightObj.price.amount === 'number') return Number(flightObj.price.amount);
      // fallback: map.price could be primitive string
      if (map && typeof map.price === 'number') return Number(map.price);
      if (map && typeof map.price === 'string') {
        const n = Number(map.price.replace?.(/[^\d.-]/g, '') || map.price);
        if (!Number.isNaN(n)) return n;
      }
      if (flightObj && typeof flightObj.price === 'string') {
        const n = Number(flightObj.price.replace?.(/[^\d.-]/g, '') || flightObj.price);
        if (!Number.isNaN(n)) return n;
      }
    } catch (e) { /* ignore */ }
    return null;
  }


  // Seat component
  function Seat({ s }) {
    if (!s) {
      // empty gap (aisle or missing seat)
      return <div style={{ width: SEAT_BOX_WIDTH, height: SEAT_BOX_HEIGHT, margin: SEAT_MARGIN }} />;
    }

    const currentUserId = getCurrentUserId();
    const isBooked = (s.status === 'booked' || s.status === 'reserved');
    const isHeld = s.status === 'held' || s.status === 'reserved';
    const isHeldByOther = isHeld && s.heldBy && s.heldBy !== currentUserId;
    const isSelected = selected.includes(s.seatId);
    const isHovered = hoveredSeat === s.seatId;

    // base container
    const containerStyle = {
      width: SEAT_BOX_WIDTH,
      height: SEAT_BOX_HEIGHT,
      margin: SEAT_MARGIN,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: (isBooked || isHeldByOther) ? 'not-allowed' : 'pointer',
      transform: isSelected ? 'scale(1.06)' : isHovered ? 'scale(1.03)' : 'scale(1)',
      transition: 'transform 120ms ease, box-shadow 120ms ease',
      position: 'relative'
    };

    // back + cushion visuals
    const backStyle = {
      width: Math.round(CUSHION_WIDTH * 0.74),
      height: BACKREST_HEIGHT,
      borderRadius: 8,
      boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.22)',
      marginBottom: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: 11,
      fontWeight: 700
    };
    const cushionStyle = {
      width: CUSHION_WIDTH,
      height: CUSHION_HEIGHT,
      borderRadius: 8,
      boxShadow: '0 6px 10px rgba(2,6,23,0.42)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: 12,
      fontWeight: 700,
      textAlign: 'center'
    };

    // color logic
    // color logic (class-based)
    const classColors = seatClassColors(s.seatClass);

    let backColor = classColors.back;
    let cushionColor = classColors.cushion;
    let cushionTextColor = '#fff';

    if (isBooked) {
      backColor = '#b91c1c'; cushionColor = '#b91c1c'; cushionTextColor = '#fff';
    } else if (isSelected) {
      backColor = '#06b6d4'; cushionColor = '#06b6d4'; cushionTextColor = '#000';
    } else if (isHeld) {
      if (isHeldByOther) {
        backColor = '#92400e'; cushionColor = '#92400e'; cushionTextColor = '#000';
      } else {
        backColor = '#f59e0b'; cushionColor = '#f59e0b'; cushionTextColor = '#000';
      }
    } else if (isHovered) {
      backColor = '#0ea5a4'; cushionColor = '#06b6d4'; cushionTextColor = '#000';
    }

    if (s.features?.extraLegroom) {
      cushionStyle.border = '2px solid #22c55e';
      cushionStyle.boxShadow = '0 0 0 2px rgba(34,197,94,0.35)';
    }

    const cushionFinalStyle = {
      ...cushionStyle,
      background: cushionColor,
      color: cushionTextColor,
      border: s.features?.extraLegroom ? '2px solid #22c55e' : undefined,
      boxShadow: s.features?.extraLegroom
        ? '0 0 0 2px rgba(34,197,94,0.35)'
        : cushionStyle.boxShadow
    };

    // ---------- PRICE LOGIC ----------
    // If seat provides absolute numeric price, use it.
    // ---------- PRICE LOGIC ----------
    const displayNumericPrice =
      typeof s.price === 'number'
        ? Number(s.price)
        : (() => {
          const base = resolveBasePrice();
          const modifier =
            typeof s.priceModifier === 'number'
              ? Number(s.priceModifier)
              : typeof s.classPrice === 'number'
                ? Number(s.classPrice)
                : 0;
          return base !== null ? base + modifier : null;
        })();


    // price string to display (rupee formatted)
    const priceBadge = (displayNumericPrice !== null && displayNumericPrice !== undefined && !Number.isNaN(displayNumericPrice))
      ? formatRupee(displayNumericPrice)
      : null;

    const rawClass = s.seatClass || s.category || s.class || null;
    const seatClassLabel = rawClass ? normalizeSeatClass(rawClass) : null;

    const handleEnter = (e) => {
      setHoveredSeat(s.seatId);

      // compute tooltip position relative to containerRef
      const rect = e.currentTarget.getBoundingClientRect();
      const containerRect = containerRef.current ? containerRef.current.getBoundingClientRect() : { left: 0, top: 0 };
      const left = rect.left - containerRect.left + rect.width / 2;
      // tooltip height estimate - safe offset
      const tooltipHeightEstimate = 72;
      const top = rect.top - containerRect.top - tooltipHeightEstimate - 6;

      // Do NOT include heldBy/holdUntil; do not show "free"
      setTooltip({
        left,
        top,
        seat: s.seatId,
        status: s.status,
        seatClass: seatClassLabel,
        price: priceBadge,
        extraLegroom: !!s.features?.extraLegroom
      });
    };
    const handleLeave = () => {
      setHoveredSeat(null);
      setTooltip(null);
    };

    return (
      <div
        onClick={() => {
          if (s.isRestricted) {
            setRestrictionModal({
              open: true,
              message:
                'Exit-row (extra-legroom) seats cannot be selected for child or assisted passengers.'
            });
            return;
          }
          toggleSelect(s.seatId);
        }}

        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={containerStyle}
        title={`${s.seatId}${seatClassLabel ? ` • ${seatClassLabel}` : ''}${priceBadge ? ` • ${priceBadge}` : ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Headrest: show seat number */}
          <div style={{ ...backStyle, background: backColor }}>
            <div style={{ textShadow: '0 1px 0 rgba(0,0,0,0.18)', transform: 'translateY(-1px)' }}>{s.seatId}</div>
          </div>

          {/* Cushion: show price (if present) or seat id as fallback */}
          <div style={cushionFinalStyle}>
            {priceBadge ? <div style={{ fontWeight: 800 }}>{priceBadge}</div> : <div style={{ opacity: 0.85 }}>{s.seatId}</div>}
          </div>
        </div>

        {/* seat class badge (tiny top-left) */}
        {seatClassLabel && (
          <div style={{
            position: 'absolute',
            left: 6,
            top: 6,
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.06)',
            color: '#cbd5e1'
          }}>
            {seatClassLabel[0]}
          </div>
        )}

        {s.features?.extraLegroom && (
          <div style={{
            position: 'absolute',
            right: 6,
            top: 6,
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 6,
            background: '#22c55e',
            color: '#022c22',
            fontWeight: 700
          }}>
            EL
          </div>
        )}

        {s.features?.extraLegroom && s.isExitRow && (
          <div style={{
            position: 'absolute',
            right: 6,
            bottom: 6,
            fontSize: 12
          }}>
            🚪
          </div>
        )}

      </div>
    );
  }

  if (!flightId && !airline && !flightObj) return <div className="text-sm text-gray-300">No flight selected</div>;
  if (loading) return <div className="text-sm text-gray-300">Loading seats…</div>;
  if (!map) return <div className="text-sm text-red-400">{statusMsg || 'Seat map not available'}</div>;

  // derive display flight label
  function deriveFlightLabel() {
    try {
      const segCarrier = flightObj?.itineraries?.[0]?.segments?.[0]?.carrierCode || flightObj?.carrierCode || null;
      const segNumber = flightObj?.itineraries?.[0]?.segments?.[0]?.flightNumber || flightObj?.flightNumber || flightObj?.number || null;
      if (segCarrier && segNumber) return `${segCarrier} ${segNumber}`;
      if (map && map.carrier && map.flightNumber) return `${map.carrier} ${map.flightNumber}`;
      if (map && map.flightNumber && airline) return `${airline} ${map.flightNumber}`;
      if (map && map.flightNumber) return `${map.flightNumber}`;
      if (airline && flightObj?.flightNumber) return `${airline} ${flightObj.flightNumber}`;
      return flightId || (map && (map.flightId || map.id)) || '—';
    } catch (e) {
      return flightId || '—';
    }
  }

  const displayFlightLabel = deriveFlightLabel();

  function shouldShowStatusText(status) {
    if (!status) return false;
    const s = String(status).trim().toLowerCase();
    if (!s) return false;
    if (s === 'free' || s === 'available' || s === 'open' || s === 'vacant') return false;
    return true;
  }

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
      <div style={{ textAlign: 'center', color: '#cbd5e1', marginBottom: 10 }}>
        Flight: <span style={{ color: '#fff', fontWeight: 700 }}>{displayFlightLabel}</span>
        {map?.origin ? ` • ${map.origin} → ${map.destination || ''}` : ''}
      </div>

      <label style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? 4 : 8,
        fontSize: 13,
        marginBottom: isMobile ? 14 : 10,
        color: '#cbd5e1'
      }}>
        <input
          type="checkbox"
          checked={showExtraLegroomOnly}
          onChange={(e) => setShowExtraLegroomOnly(e.target.checked)}
        />
        Show extra legroom seats only
      </label>

      <div
        onWheel={onWheelZoom}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        style={{
          background: 'rgba(8,16,30,0.78)',
          padding: 18,
          borderRadius: 14,
          overflow: 'hidden',
          touchAction: 'none'
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'center', padding: '6px 0', transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease'
        }}>
          <div>
            {Array.from({ length: rows }).map((_, rIndex) => {
              const rowNum = rIndex + 1;

              // determine cabin for this row
              const rowSeats = (map?.seats || []).filter(s => Number(s?.row) === rowNum);
              const rowClass = rowSeats[0]?.seatClass || null;
              return (
                <React.Fragment key={rIndex}>
                  {shouldRenderCabinHeaderByChange(rowNum, map) && (
                    <div style={{
                      margin: isMobile ? '10px 0 6px' : '18px 0 10px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: isMobile ? 12 : 14,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        color: seatClassHeaderColor(rowClass)
                      }}>
                        {normalizeSeatClass(rowClass)}
                      </div>

                      {/* subtle divider */}
                      <div style={{
                        height: 1,
                        margin: '6px auto 0',
                        width: isMobile ? '40%' : '60%',
                        background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.25), transparent)'
                      }} />
                    </div>
                  )}
                  <div key={rIndex} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 2px' }}>
                      {Array.from({ length: cols }).map((_, cIndex) => {
                        const colNum = cIndex + 1;
                        // aisle insertion
                        if (aisleAfter && cIndex === aisleAfter) {
                          return <div key={`${rIndex}-${cIndex}-aisle`} style={{ width: SEAT_BOX_WIDTH / 2 }} />;
                        }
                        const seat = seatByPos[`${rowNum}-${colNum}`] || null;
                        return <div key={`${rIndex}-${cIndex}`}><Seat s={seat} /></div>;
                      })}
                    </div>
                  </div>
                </React.Fragment>);
            })}
          </div>

        </div>

        {/* tooltip (positioned relative to containerRef) */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: tooltip.left,
            top: tooltip.top,
            transform: 'translateX(-50%)',
            background: 'rgba(3,7,18,0.96)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: 10,
            zIndex: 3000,
            fontSize: 12,
            boxShadow: '0 10px 30px rgba(2,6,23,0.6)',
            minWidth: 120,
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>{tooltip.seat}</div>
            {tooltip.seatClass && <div style={{ fontSize: 12, color: '#cbd5e1' }}>{tooltip.seatClass}</div>}
            {tooltip.extraLegroom && (
              <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>
                Extra legroom
              </div>
            )}
            {tooltip.price && <div style={{ marginTop: 6, fontWeight: 700 }}>{tooltip.price}</div>}

            {/* show status only if meaningful (not "free"/"available") */}
            {shouldShowStatusText(tooltip.status) && (
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{String(tooltip.status).toUpperCase()}</div>
            )}
          </div>
        )}

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#cbd5e1' }}>
          <div style={{ fontSize: 13 }}>
            Legend:
            <span style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 6, background: '#0ea5a4', color: '#000', marginRight: 6 }}>Available</span>
            <span style={{ marginLeft: 6, padding: '4px 8px', borderRadius: 6, background: '#06b6d4', color: '#000', marginRight: 6 }}>Selected</span>
            <span style={{ marginLeft: 6, padding: '4px 8px', borderRadius: 6, background: '#f59e0b', color: '#000', marginRight: 6 }}>Held</span>
            <span style={{ marginLeft: 6, padding: '4px 8px', borderRadius: 6, background: '#b91c1c', color: '#fff', marginRight: 6 }}>Booked</span>
          </div>
          {/* LEGEND */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'auto auto auto auto auto',
            gap: isMobile ? 8 : 12,
            marginTop: isMobile ? 12 : 18,
            fontSize: isMobile ? 11 : 12,
            color: '#cbd5e1'
          }}>
            <LegendItem color="#6d28d9" label="First Class" />
            <LegendItem color="#2563eb" label="Business Class" />
            <LegendItem color="#14b8a6" label="Premium Economy" />
            <LegendItem color="#374151" label="Economy" />
            <LegendItem color="#22c55e" label="Extra legroom" outline />
          </div>
          <div style={{ fontSize: 13 }}>
            Selected:{' '}
            <span style={{ color: '#fff', fontWeight: 700 }}>
              {(selected || []).map(s => (typeof s === 'string' ? s : s.seatId)).join(', ') || 'None'}
            </span>
          </div>
        </div>
      </div>
      {restrictionModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              padding: 24,
              borderRadius: 12,
              width: '90%',
              maxWidth: 420,
              color: '#e5e7eb',
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              Seat not available
            </div>

            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              {restrictionModal.message}
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button
                onClick={() =>
                  setRestrictionModal({ open: false, message: '' })
                }
                style={{
                  padding: '8px 14px',
                  background: '#22c55e',
                  border: 'none',
                  borderRadius: 8,
                  color: '#052e16',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
