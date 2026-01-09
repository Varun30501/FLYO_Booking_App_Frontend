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
  airline,
  flightObj,
  refreshKey,
  onSelectionChange,
  canSelect = true,
  maxSelectable = Infinity
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

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { if (onSelectionChange) onSelectionChange(selected); }, [selected]);

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
    const url = `${API_BASE}/seats/${encodeURIComponent(key)}?date=${encodeURIComponent(travelDate)}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return { ok: true, json, url };
      } else {
        return { ok: false, status: res.status, url };
      }
    } catch (err) {
      return { ok: false, error: err, url };
    }
  }

  async function fetchMap() {
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
  }, [flightId, airline, JSON.stringify(flightObj)]);

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
  const seatByPos = {};
  (map?.seats || []).forEach(s => {
    if (!s) return;
    const r = Number(s.row) || 0;
    const c = Number(s.col) || 0;
    seatByPos[`${r}-${c}`] = s;
  });

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
    let backColor = '#0f1724';
    let cushionColor = '#1f2937';
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

    const cushionFinalStyle = {
      ...cushionStyle,
      background: cushionColor,
      color: cushionTextColor
    };

    // ---------- PRICE LOGIC ----------
    // If seat provides absolute numeric price, use it.
    let displayNumericPrice = null;
    if (s && typeof s.price === 'number') {
      displayNumericPrice = Number(s.price);
    } else {
      // resolve base price and modifiers
      const base = resolveBasePrice();
      const modifier = (typeof s.priceModifier === 'number' ? Number(s.priceModifier)
        : (typeof s.classPrice === 'number' ? Number(s.classPrice) : null));
      if (base !== null) {
        displayNumericPrice = base + (modifier || 0);
      } else if (modifier !== null) {
        // no base available, but modifier exists -> show modifier (best effort)
        displayNumericPrice = modifier;
      } else {
        // fallback: seat may include a string price we can parse
        if (s && typeof s.price === 'string') {
          const n = Number(String(s.price).replace(/[^\d.-]/g, '')) || null;
          if (n !== null && !Number.isNaN(n)) displayNumericPrice = n;
        }
      }
    }

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
        price: priceBadge
      });
    };
    const handleLeave = () => {
      setHoveredSeat(null);
      setTooltip(null);
    };

    return (
      <div
        onClick={() => toggleSelect(s.seatId)}
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

      <div style={{ background: 'rgba(8,16,30,0.78)', padding: 18, borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
          <div>
            {Array.from({ length: rows }).map((_, rIndex) => {
              const rowNum = rIndex + 1;
              return (
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
              );
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

          <div style={{ fontSize: 13 }}>
            Selected: <span style={{ color: '#fff', fontWeight: 700 }}>{selected.join(', ') || 'None'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
