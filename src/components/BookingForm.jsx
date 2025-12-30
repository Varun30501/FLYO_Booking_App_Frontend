// src/components/BookingForm.jsx
import React, { useEffect, useMemo, useState } from 'react';
import SeatMap from './SeatMap';
import { post, get } from '../services/api';
import { getUser } from '../services/auth';
import AddonSelector from './AddonSelector';
/**
 * BookingForm (patched - addons + coupons + profile mirror)
 * - fetches seat map for accurate pricing
 * - fetches /api/addons and /api/coupons
 * - supports per-seat / per-booking addons via addon.metadata
 * - supports selecting coupon or typing coupon code (validated against coupons list)
 * - includes addons & couponApplied in booking payload
 *
 * Props:
 *  - flight (object required)
 *  - onBooked (optional callback called with booking when created)
 */

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

/** format ms -> "MM:SS" (or "M min" if > 59m) */
function formatMs(ms) {
  if (!ms || ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  if (totalSec >= 60 * 60) {
    const m = Math.ceil(totalSec / 60);
    return `${m} min`;
  }
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function normalizeSeatClass(name = "") {
  if (!name) return "";
  const n = String(name).toLowerCase().replace(/\s+/g, "");
  if (n === "first") return "First Class";
  if (n === "business") return "Business Class";
  if (n === "premiumeconomy" || n === "premiumeco" || n === "premeco") return "Premium Economy";
  if (n === "economy" || n === "eco") return "Economy";
  // fallback
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatRupee(amount) {
  try {
    const n = Number(amount || 0);
    if (Number.isNaN(n)) return String(amount || '');
    return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
  } catch (e) {
    return `₹${amount}`;
  }
}

/** Create / reuse an idempotency key for this client booking flow.
 *  Stored in localStorage so retries or accidental double clicks reuse the same key.
 */

export default function BookingForm({ flight, onBooked }) {
  const [step, setStep] = useState(1);
  const [seatCount, setSeatCount] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatMapVersion, setSeatMapVersion] = useState(0);
  const [holdStatus, setHoldStatus] = useState(null); // { ok, holdUntil, seats }
  const [passengers, setPassengers] = useState([]);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [holdMsRemaining, setHoldMsRemaining] = useState(null);

  // addons & coupons:
  const [addons, setAddons] = useState([]); // from /api/addons
  const [coupons, setCoupons] = useState([]); // from /api/coupons
  const [selectedAddons, setSelectedAddons] = useState([]); // [{ offerId, qty }]
  const [appliedCoupon, setAppliedCoupon] = useState(null); // coupon object
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  // seat map fetched for pricing
  const [mapData, setMapData] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const flightIdForSeats = flight?._id || flight?.id || flight?.flightNumber;

  // Keep passengers in sync with seatCount
  useEffect(() => {
    setPassengers(prev => {
      const next = [];
      for (let i = 0; i < seatCount; i++) {
        next.push(prev[i] || {
          title: 'Mr',
          firstName: '',
          lastName: '',
          dob: '',
          gender: 'M',
          nationality: '',
          documentType: '',
          documentNumber: ''
        });
      }
      return next;
    });
  }, [seatCount]);

  // mirror contact from profile if available
  useEffect(() => {
    try {
      const u = getUser();
      if (u) {
        setContact(prev => ({
          name: prev.name || u.name || '',
          email: prev.email || u.email || '',
          phone: prev.phone || u.phone || ''
        }));
      }
    } catch (e) { /* ignore */ }
  }, []);

  // load addons & coupons from backend (/api/addons & /api/coupons)
  useEffect(() => {
    let mounted = true;
    async function loadAddonsAndCoupons() {
      try {
        // note: service.get likely prefixes /api, adjust if your service expects full path
        const [addonsResp, couponsResp] = await Promise.all([
          get('/addons').catch(() => null),
          get('/coupons').catch(() => null)
        ]);

        if (!mounted) return;

        const aList = Array.isArray(addonsResp?.addons) ? addonsResp.addons : (Array.isArray(addonsResp) ? addonsResp : []);
        const cList = Array.isArray(couponsResp?.coupons) ? couponsResp.coupons : (Array.isArray(couponsResp) ? couponsResp : []);

        // normalize ids and basic shape
        const cleanA = (aList || []).filter(Boolean).map(a => ({
          ...a,
          id: a._id || a.id || a.code || (a.name ? a.name.replace(/\s+/g, '-').toLowerCase() : Math.random().toString(36).slice(2, 8))
        }));
        const cleanC = (cList || []).filter(Boolean).map(c => ({
          ...c,
          id: c._id || c.id || c.code || (c.title ? c.title.replace(/\s+/g, '-').toLowerCase() : Math.random().toString(36).slice(2, 8))
        }));

        setAddons(cleanA);
        setCoupons(cleanC);
      } catch (e) {
        console.error('[BookingForm] load addons/coupons error', e);
      }
    }
    loadAddonsAndCoupons();
    return () => { mounted = false; };
  }, []);

  // load seat map (for pricing) when flight changes or when remounted
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!flightIdForSeats) { setMapData(null); return; }
      setMapLoading(true);
      try {
        const resp = await get(`/seats/${encodeURIComponent(flightIdForSeats)}`).catch(() => null);
        if (!mounted) return;
        setMapData(resp || null);
      } catch (e) {
        console.error('[BookingForm] seatmap load error', e);
        setMapData(null);
      } finally {
        if (mounted) setMapLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightIdForSeats, seatMapVersion]);

  // derive base fare from flight or map
  const baseFare = useMemo(() => {
    try {
      if (!flight && !mapData) return 0;
      const cand =
        Number(flight?.price?.amount) ||
        Number(flight?.price) ||
        Number(flight?.price?.total) ||
        Number(mapData?.defaultPrice) ||
        Number(mapData?.basePrice) ||
        0;
      return Number(cand) || 0;
    } catch (e) {
      return 0;
    }
  }, [flight, mapData]);

  // per-seat fallback (legacy): use flight.price if present
  const perSeatPriceFallback = useMemo(() => {
    if (!flight) return 0;
    const p = flight.price;
    if (!p) return 0;
    if (typeof p === 'number') return Number(p);
    if (typeof p === 'string') {
      const n = Number(p.replace(/[^\d.-]/g, '')) || 0;
      return n;
    }
    if (typeof p === 'object') return Number(p.amount ?? 0);
    return 0;
  }, [flight]);

  // compute seat object lookup by seatId for price calc
  const seatById = useMemo(() => {
    const m = {};
    (mapData?.seats || []).forEach(s => {
      if (!s) return;
      const id = s.seatId || s.label || s.id;
      if (id) m[String(id)] = s;
    });
    return m;
  }, [mapData]);

  function computeSeatPriceNum(seatObj) {
    try {
      const s = seatObj || {};
      const absoluteCandidates = [
        s.price, s.absolutePrice, s.priceAbsolute,
        s.absolute, s.amount
      ];
      let absolute = null;
      for (const v of absoluteCandidates) {
        if (typeof v === 'number' && !Number.isNaN(v)) { absolute = Number(v); break; }
        if (typeof v === 'string' && v.trim() !== '') {
          const cleaned = Number(String(v).replace(/[^\d.-]/g, '')) || null;
          if (cleaned !== null && !Number.isNaN(cleaned) && cleaned !== 0) { absolute = cleaned; break; }
        }
      }

      const seatPriceRaw = (typeof s.price === 'number' && s.price) ? s.price
        : (typeof s.priceModifier === 'number' ? s.priceModifier : null);

      const rawClass = s.seatClass || s.category || s.class || '';
      const seatClassLabel = normalizeSeatClass(rawClass);

      const isEconomy = seatClassLabel === 'Economy';

      if (absolute !== null) return Number(absolute);

      if (isEconomy) {
        if (baseFare && baseFare > 0) return Number(baseFare);
        if (seatPriceRaw !== null) return Number(seatPriceRaw);
        return Number(perSeatPriceFallback || 0);
      }

      const modifier = seatPriceRaw !== null ? Number(seatPriceRaw) : 0;
      const base = Number(baseFare || perSeatPriceFallback || 0);
      return Number(base + modifier);
    } catch (e) {
      return Number(perSeatPriceFallback || 0);
    }
  }

  // compute prices for currently held/selected seats (ordered as selectedSeats)
  const computedSeatPrices = useMemo(() => {
    return (selectedSeats || []).map(id => {
      const s = seatById[String(id)] || { seatId: id };
      const priceNum = computeSeatPriceNum(s);
      return { seatId: id, price: priceNum, raw: s };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeats, seatById, baseFare, perSeatPriceFallback]);

  const seatsTotal = useMemo(() => computedSeatPrices.reduce((acc, cur) => acc + (Number(cur.price) || 0), 0), [computedSeatPrices]);

  // ---------- ADDONS & COUPONS CALCULATION ----------
  function addonEffectiveAmount(addon) {
    const amt = Number(addon.amount || 0);
    const perSeat = !!(addon.metadata && (addon.metadata.perSeat === true || addon.metadata.applyTo === 'perSeat'));
    if (perSeat) return amt * seatCount;
    return amt;
  }

  const addonsTotal = useMemo(() => {
    if (!selectedAddons || !selectedAddons.length) return 0;
    let t = 0;
    selectedAddons.forEach(sel => {
      const found = addons.find(a => String(a.id) === String(sel.offerId) || String(a.code) === String(sel.offerId));
      if (!found) return;
      const unit = addonEffectiveAmount(found);
      const qty = Math.max(1, Number(sel.qty || 1));
      t += unit * qty;
    });
    return Math.round(t);
  }, [selectedAddons, addons, seatCount]);

  // compute coupon discount (client-side best-effort)
  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const c = appliedCoupon;
    const totalBeforeTax = seatsTotal + addonsTotal;
    const meta = c.metadata || {};
    // percent value (use nullish cascade and explicit fallback)
    const pct = Number(c.percent ?? meta.percent ?? meta.discountPercent ?? 0);
    // fixed amount fallback, avoid mixing ambiguous operators; ensure 0 fallback
    const fixed = Number((c.amount ?? meta.amount ?? meta.discountAmount) ?? 0);
    if (pct > 0) {
      let d = Math.round((totalBeforeTax * (pct / 100)));
      // client-side cap support (meta.maxDiscount or c.cap)
      const cap = Number((c.cap ?? meta.maxDiscount ?? meta.cap) ?? 0);
      if (cap > 0) d = Math.min(d, cap);
      return Math.max(0, Math.round(d));
    }
    if (fixed > 0) return Math.max(0, Math.round(fixed));
    return 0;
  }, [appliedCoupon, seatsTotal, addonsTotal]);

  // taxes on (seats + addons - discount)
  const taxes = useMemo(() => {
    const base = Math.max(0, seatsTotal + addonsTotal - couponDiscount);
    return Math.round(base * 0.05);
  }, [seatsTotal, addonsTotal, couponDiscount]);

  const finalTotal = useMemo(() => Math.round(Math.max(0, seatsTotal + addonsTotal - couponDiscount + taxes)), [seatsTotal, addonsTotal, couponDiscount, taxes]);

  // keep passenger seats mapped to hold or selected seats
  useEffect(() => {
    setPassengers(prev => {
      const next = [];
      for (let i = 0; i < seatCount; i++) {
        next.push(prev[i] || {
          title: 'Mr',
          firstName: '',
          lastName: '',
          dob: '',
          gender: 'M',
          nationality: '',
          documentType: '',
          documentNumber: ''
        });
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatCount]);

  useEffect(() => {
    const u = getUser();
    if (!u?.profile) return;

    setPassengers(prev => {
      const p0 = prev[0] || {};
      return [{
        ...p0,
        firstName: u.profile.firstName,
        lastName: u.profile.lastName,
        dob: u.profile.dob,
        nationality: u.profile.nationality,
        documentType: u.profile.documentType,
        documentNumber: u.profile.documentNumber
      }, ...prev.slice(1)];
    });
  }, []);

  // countdown for hold
  useEffect(() => {
    if (!holdStatus || !holdStatus.holdUntil) { setHoldMsRemaining(null); return; }
    let mounted = true;
    function update() {
      if (!mounted) return;
      const d = new Date(holdStatus.holdUntil);
      const ms = Math.max(0, d - new Date());
      setHoldMsRemaining(ms);
      if (ms <= 0) {
        setHoldStatus(null);
        setSelectedSeats([]);
      }
    }
    update();
    const t = setInterval(update, 1000);
    return () => { mounted = false; clearInterval(t); };
  }, [holdStatus]);

  function updatePassenger(idx, key, value) {
    setPassengers(prev => {
      const next = [...prev];
      next[idx] = { ...(next[idx] || {}), [key]: value };
      return next;
    });
  }

  function onSeatSelectionChange(arr) {
    setSelectedSeats(arr || []);
  }

  // HOLD seats
  async function holdSelectedSeats() {
    setError(null);
    if (!flight) { setError('No flight specified'); return; }
    if (!selectedSeats || selectedSeats.length === 0) { setError('Select seats first'); return; }
    if (selectedSeats.length !== seatCount) { setError(`Select exactly ${seatCount} seat(s)`); return; }

    setBusy(true);
    setHoldStatus(null);
    const heldBy = getCurrentUserId();

    try {
      const body = { seats: selectedSeats, holdMinutes: 10, heldBy };
      const resp = await post(`/seats/${encodeURIComponent(flightIdForSeats)}/hold`, body).catch(e => e?.response || e);
      const data = resp?.data ?? resp;
      if (!resp || (data && (data.error || data.success === false))) {
        const msg = data?.error || data?.message || 'Hold failed';
        setError(`Hold failed: ${msg}`);
        setBusy(false);
        return;
      }

      const holdUntil = data?.holdUntil || data?.heldUntil || null;
      setHoldStatus({ ok: true, holdUntil, seats: selectedSeats.slice() });

      // remount seatmap (in case backend changed seat states)
      setSeatMapVersion(v => v + 1);
      setStep(3);
    } catch (e) {
      console.error('[BookingForm] hold error', e);
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Network error';
      setError(`Hold failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  // ------------------ Addon UI helpers ------------------
  function toggleAddon(offerId) {
    setSelectedAddons(prev => {
      const idx = prev.findIndex(p => String(p.offerId) === String(offerId));
      if (idx === -1) return [...prev, { offerId, qty: 1 }];
      return prev.filter(p => String(p.offerId) !== String(offerId));
    });
  }
  function changeAddonQty(offerId, qty) {
    setSelectedAddons(prev => prev.map(p => String(p.offerId) === String(offerId) ? ({ ...p, qty: Math.max(1, Number(qty) || 1) }) : p));
  }

  // ------------------ Coupon helpers ------------------
  function applyCouponByCode(code) {
    setCouponError('');
    if (!code || !code.trim()) { setCouponError('Enter a coupon code'); return; }
    const found = (coupons || []).find(c => (c.code && String(c.code).toLowerCase() === String(code).toLowerCase()) || (c.title && String(c.title).toLowerCase() === String(code).toLowerCase()));
    if (!found) { setCouponError('Coupon not found or invalid'); return; }
    // simple validity checks mirror: active + date window + minAmount
    const now = new Date();
    if (found.active === false) { setCouponError('Coupon is inactive'); return; }
    if (found.validFrom && new Date(found.validFrom) > now) { setCouponError('Coupon not yet valid'); return; }
    if (found.validTo && new Date(found.validTo) < now) { setCouponError('Coupon expired'); return; }
    const meta = found.metadata || {};
    const minAmount = Number(meta.minAmount || 0);
    const totalBeforeTax = seatsTotal + addonsTotal;
    if (minAmount && totalBeforeTax < minAmount) { setCouponError(`Requires min ₹${minAmount}`); return; }
    setAppliedCoupon(found);
    setCouponInput(found.code || found.title || '');
    setCouponError('');
  }
  function selectCouponOffer(o) {
    setCouponError('');
    try {
      if (!o) { setAppliedCoupon(null); setCouponInput(''); return; }
      const now = new Date();
      if (o.active === false) { setCouponError('Coupon inactive'); return; }
      if (o.validFrom && new Date(o.validFrom) > now) { setCouponError('Not valid yet'); return; }
      if (o.validTo && new Date(o.validTo) < now) { setCouponError('Expired'); return; }
      const meta = o.metadata || {};
      const minAmount = Number(meta.minAmount || 0);
      const totalBeforeTax = seatsTotal + addonsTotal;
      if (minAmount && totalBeforeTax < minAmount) { setCouponError(`Requires min ₹${minAmount}`); return; }
      setAppliedCoupon(o);
      setCouponInput(o.code || o.title || '');
    } catch (e) {
      setCouponError('Cannot apply coupon');
    }
  }


  // ------------------ Proceed to booking & payment ------------------
  async function proceedToPayment(e) {
    // const reval = await post('/flights/revalidate', {
    //   offer: selectedFlight.raw   // ← this already exists from search
    // });

    // if (!reval.ok) {
    //   setLoading(false);
    //   alert('This flight is no longer available or the fare has changed.');
    //   return;
    // }
    e?.preventDefault?.();
    setError(null);

    // basic validation
    for (let i = 0; i < seatCount; i++) {
      const p = passengers[i] || {};
      if (!p.firstName || !p.lastName) {
        setError(`Passenger ${i + 1}: full name required`);
        return;
      }
    }
    if (!contact.name || !contact.email) {
      setError('Contact name & email required');
      return;
    }
    if (!holdStatus || !holdStatus.ok) {
      setError('Seats are not held. Please hold seats first.');
      return;
    }

    setBusy(true);

    try {
      // attach seat to passengers
      const passengerPayload = passengers.map((p, idx) => ({
        ...p,
        seat: (holdStatus && holdStatus.seats && holdStatus.seats[idx]) || selectedSeats[idx] || null
      }));

      // Build seatsMetaToSend from computedSeatPrices (canonical UI values)
      const seatsMetaToSend = (computedSeatPrices || []).map(s => {
        const seatClass = s.raw?.seatClass || s.raw?.class || s.raw?.category || null;
        const priceModifier = typeof s.raw?.priceModifier === 'number' ? Number(s.raw.priceModifier) : 0;
        const price = Math.round(Number(s.price || 0));
        return {
          seatId: String(s.seatId),
          seatClass,
          priceModifier,
          price
        };
      });
      const computedTotalFromSeats = seatsMetaToSend.reduce((acc, s) => acc + (Number(s.price || 0)), 0);

      // Build addons payload using UI-selected addons (same calc as UI)
      const addonsPayload = (selectedAddons || []).map(sel => {
        const off = addons.find(a => String(a.id) === String(sel.offerId) || String(a.code) === String(sel.offerId));
        const qty = Math.max(1, Number(sel.qty || 1));
        const perSeat = !!(off && off.metadata && (off.metadata.perSeat === true || off.metadata.applyTo === 'perSeat'));
        const unitAmount = off ? Number(off.amount || 0) : 0;
        const totalLine = perSeat ? unitAmount * seatCount * qty : unitAmount * qty;
        return {
          offerId: String(sel.offerId),
          title: off?.title || off?.name || null,
          qty,
          amount: Math.round(totalLine),
          raw: off || null
        };
      });

      // coupon payload (one coupon supported as a hint)
      const couponPayload = appliedCoupon ? {
        offerId: appliedCoupon.id || appliedCoupon._id || null,
        code: appliedCoupon.code || appliedCoupon.title || appliedCoupon.name || null,
        title: appliedCoupon.title || appliedCoupon.name || appliedCoupon.code || null,
        amount: Math.round(couponDiscount || 0),
        raw: appliedCoupon
      } : null;

      // Final totals (UI canonical)
      const seatsSubtotalUI = Math.round(seatsTotal || computedTotalFromSeats || 0);
      const addonsTotalUI = Math.round(addonsTotal || 0);
      const discountUI = Math.round(couponDiscount || 0);
      const taxUI = Math.round(taxes || 0);

      const computedFinalTotal = Math.round(Math.max(0, seatsSubtotalUI + addonsTotalUI - discountUI + taxUI));
      const perSeatToSend = Math.round((seatsMetaToSend.length ? (seatsSubtotalUI / Math.max(1, seatsMetaToSend.length)) : perSeatPriceFallback) || 0);

      // Idempotency: ensure uniqueness per booking attempt
      // NOTE: your current getOrCreateIdempotencyKey() persists a single key in localStorage.
      // That reused key can cause Stripe idempotency conflicts if you call create-checkout-session
      // with different amounts. Consider changing getOrCreateIdempotencyKey() to generate a new key
      // per booking (or per bookingRef) — simple patch suggestion below.
      const idempotencyKey = `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

      const bookingBody = {
        flightId: flight._id || flight.id || flight.flightNumber,
        passengers: passengerPayload,
        contact,
        seats: (holdStatus && holdStatus.seats) || selectedSeats,
        price: {
          amount: computedFinalTotal,
          perSeat: perSeatToSend,
          currency: flight?.price?.currency || (flight?.currency || 'INR'),
          tax: Number(taxUI || 0),
          breakdown: {
            seats: seatsSubtotalUI,
            addons: addonsTotalUI,
            discount: discountUI,
            tax: taxUI
          }
        },
        seatsMeta: seatsMetaToSend,
        addons: addonsPayload,
        coupons: couponPayload ? [couponPayload] : [],
        createSession: true,
        heldBy: getCurrentUserId(),
        idempotencyKey // send so backend can dedupe
      };

      // Create booking (server may create stripe session and return it)
      const res = await post(`/bookings?createSession=true`, bookingBody).catch(err => err?.response || err);
      const data = res?.data ?? res;

      if (!res || (data && data.error)) {
        const msg = data?.error || data?.message || 'Failed creating booking';
        setError(msg);
        setBusy(false);
        return;
      }

      const booking = data?.booking || data;
      const session = data?.session || null;

      // If server created session and returned URL -> redirect immediately (server-authoritative)
      if (session && session.url) {
        window.location.href = session.url;
        return;
      }

      // Otherwise create checkout session using server payments endpoint (server should validate amounts)
      if (!session) {
        const amountToCharge = Number(computedFinalTotal || 0);

        // keep logs if server computed different amount (monitoring)
        const serverAmount = Number(booking?.price?.amount ?? NaN);
        if (!Number.isNaN(serverAmount) && serverAmount !== amountToCharge) {
          console.warn('[BookingForm] amount mismatch - UI:', amountToCharge, 'server:', serverAmount);
        }
        
        for (let i = 0; i < passengers.length; i++) {
          const p = passengers[i];
          if (!p.firstName || !p.lastName) {
            throw new Error(`Passenger ${i + 1}: Name required`);
          }
          if (!p.dob) {
            throw new Error(`Passenger ${i + 1}: DOB required`);
          }
          if (!p.documentType || !p.documentNumber) {
            throw new Error(`Passenger ${i + 1}: ID document required`);
          }
        }


        // pass idempotencyKey so backend may forward to Stripe as needed
        const sessionResp = await post('/payments/create-checkout-session', {
          bookingId: booking._id || booking.bookingRef || booking.id,
          amount: amountToCharge,
          currency: booking.price?.currency || (flight?.price?.currency || 'INR'),
          idempotencyKey
        }).catch(err => err?.response || err);
        const sessionData = sessionResp?.data ?? sessionResp;

        if (sessionData && sessionData.url) {
          window.location.href = sessionData.url;
          return;
        }

        // If server rejects due to mismatch, show friendly error
        if (sessionData && sessionData.message && sessionData.message === 'amount mismatch') {
          console.warn('[BookingForm] server rejected session due to mismatch', sessionData);
          setError(`Pricing mismatch detected (server: ${sessionData.serverComputed} vs UI: ${sessionData.bookingHint}). Please refresh seat prices and try again.`);
          setBusy(false);
          return;
        }

        // Some errors may come back as { message, error }, show them
        if (sessionData && (sessionData.error || sessionData.message)) {
          const msg = sessionData.error || sessionData.message || 'Failed creating checkout session';
          setError(msg);
          setBusy(false);
          return;
        }
      }

      // success fallback: booking created (no redirect)
      if (onBooked) onBooked(booking);
      setStep(4);
      setBusy(false);
    } catch (err) {
      console.error('[BookingForm] proceed error', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to create booking';
      setError(msg);
      setBusy(false);
    }
  }


  function backToSeatSelection() {
    setStep(2);
    setError(null);
  }

  function resetAll() {
    setStep(1);
    setSeatCount(1);
    setSelectedSeats([]);
    setHoldStatus(null);
    setPassengers([]);
    setContact({ name: '', email: '', phone: '' });
    setSeatMapVersion(v => v + 1);
    setError(null);
    setHoldMsRemaining(null);
    setSelectedAddons([]);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  }

  return (
    <div className="space-y-6">
      <div className="panel-3d p-4">
        <h3 className="text-lg font-semibold mb-2">Booking flow</h3>

        {/* Step indicator */}
        <div className="flex items-center gap-3 text-sm text-slate-300 mb-4">
          <div className={`px-3 py-1 rounded ${step === 1 ? 'bg-cyan-700 text-black' : 'bg-white/3'}`}>1. Seats count</div>
          <div className={`px-3 py-1 rounded ${step === 2 ? 'bg-cyan-700 text-black' : 'bg-white/3'}`}>2. Choose seats</div>
          <div className={`px-3 py-1 rounded ${step === 3 ? 'bg-cyan-700 text-black' : 'bg-white/3'}`}>3. Passengers & Add-ons</div>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div className="text-sm text-slate-300">How many seats do you want to book?</div>
            <div className="flex items-center gap-2">
              <select value={seatCount} onChange={(e) => setSeatCount(Math.max(1, Math.min(6, Number(e.target.value))))} className="dark-input p-2 rounded">
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'seat' : 'seats'}</option>)}
              </select>

              <button onClick={() => setStep(2)} className="btn-accent px-3 py-1 rounded">Choose seats</button>

              <div className="ml-4 text-sm text-slate-300">
                Per seat: {flight?.price?.currency || 'INR'} {perSeatPriceFallback.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="text-sm text-slate-300">Select exactly <strong>{seatCount}</strong> seat(s) on the map below.</div>
            <div className="mt-2">
              <SeatMap
                key={`seatmap-${seatMapVersion}`}
                flightId={flightIdForSeats}
                airline={flight?.airline || flight?.provider || (flight?.itineraries?.[0]?.segments?.[0]?.carrierCode)}
                flightObj={flight}
                maxSelectable={seatCount}
                onSelectionChange={onSeatSelectionChange}
              />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => { setStep(1); }} className="px-3 py-1 rounded border border-white/12">Back</button>
              <button onClick={async () => { await holdSelectedSeats(); }} disabled={busy || selectedSeats.length !== seatCount} className="btn-accent px-3 py-1 rounded">
                {busy ? 'Holding…' : `Select ${seatCount} seat(s)`}
              </button>
              <div className="text-sm text-slate-300 ml-4">
                Selected: {selectedSeats.join(', ') || 'None'}
              </div>
            </div>

            {error && <div className="text-sm text-red-400 mt-2">{error}</div>}
          </div>
        )}

        {step === 3 && (
          <form onSubmit={proceedToPayment} className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Passengers ({seatCount})</h4>
              <div className="space-y-3">
                {passengers.map((p, idx) => (
                  <div key={idx} className="p-3 bg-white/3 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Passenger {idx + 1} — Seat: {holdStatus?.seats?.[idx] || selectedSeats[idx] || '—'}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <select value={p.title} onChange={(e) => updatePassenger(idx, 'title', e.target.value)} className="dark-input p-2 rounded">
                        <option>Mr</option>
                        <option>Mrs</option>
                        <option>Ms</option>
                        <option>Dr</option>
                      </select>

                      <input placeholder="First name" value={p.firstName} onChange={(e) => updatePassenger(idx, 'firstName', e.target.value)} className="dark-input p-2 rounded" required />
                      <input placeholder="Last name" value={p.lastName} onChange={(e) => updatePassenger(idx, 'lastName', e.target.value)} className="dark-input p-2 rounded" required />
                      <input placeholder="Date of birth (YYYY-MM-DD)" value={p.dob} onChange={(e) => updatePassenger(idx, 'dob', e.target.value)} className="dark-input p-2 rounded" />
                      <select value={p.gender} onChange={(e) => updatePassenger(idx, 'gender', e.target.value)} className="dark-input p-2 rounded">
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                      <input placeholder="Nationality" value={p.nationality} onChange={(e) => updatePassenger(idx, 'nationality', e.target.value)} className="dark-input p-2 rounded" />
                      <input placeholder="Document type (passport/aadhar/etc)" value={p.documentType} onChange={(e) => updatePassenger(idx, 'documentType', e.target.value)} className="dark-input p-2 rounded" />
                      <input placeholder="Document number" value={p.documentNumber} onChange={(e) => updatePassenger(idx, 'documentNumber', e.target.value)} className="dark-input p-2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add-ons & Coupons */}
            <div className="p-3 bg-white/3 rounded space-y-3">

              <div className="text-sm text-slate-300 mb-2">Add-ons</div>

              {/* AddonSelector component (controlled) */}
              <AddonSelector
                addons={addons}
                seatCount={seatCount}
                selectedAddons={selectedAddons}
                setSelectedAddons={setSelectedAddons}
              />

              {/* display selected addons summary */}
              <div className="mt-3">
                <div className="text-sm text-slate-300 mb-2">Selected add-ons</div>
                {selectedAddons.length === 0 && <div className="text-gray-400">No add-ons selected</div>}
                <div className="space-y-2">
                  {selectedAddons.map(sa => {
                    const off = addons.find(a => String(a.id || a._id || a.code) === String(sa.offerId));
                    const title = off?.title || off?.name || sa.offerId;
                    const perSeat = !!(off && off.metadata && (off.metadata.perSeat === true || off.metadata.applyTo === 'perSeat'));
                    const unit = Number(off?.amount || sa.amount || 0);
                    const qty = Math.max(1, Number(sa.qty || 1));
                    const line = Math.round((perSeat ? unit * seatCount : unit) * qty);
                    return (
                      <div key={sa.offerId} className="flex justify-between text-sm">
                        <div className="text-slate-300">{title} {perSeat ? <span className="text-xs text-gray-400">/seat</span> : null} <span className="text-xs text-gray-400">x{qty}</span></div>
                        <div className="font-medium">{formatRupee(line)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm text-slate-300 mb-2">Coupons</div>
                <div className="flex gap-2 items-center">
                  <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Enter coupon code or select from list" className="dark-input p-2 rounded flex-1" />
                  <button type="button" onClick={() => applyCouponByCode(couponInput)} className="px-3 py-1 rounded border border-white/12">Apply</button>
                </div>
                {couponError && <div className="text-sm text-red-400 mt-2">{couponError}</div>}

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(coupons.slice(0, 12) || []).map(c => {
                    // helper to derive display text
                    const code = (c.code || c.title || c.id || '').toString().toUpperCase();
                    const title = (c.title || c.name || c.code || '').toString();
                    const desc = (c.subtitle || (c.metadata && (c.metadata.description || c.metadata.desc)) || '').toString();
                    // amount/percent display
                    const fixedAmt = (typeof c.amount === 'number' && c.amount > 0) ? formatRupee(c.amount) : null;
                    const pct = (c.percent || (c.metadata && (c.metadata.discountPercent || c.metadata.percent))) ? (Number(c.percent || c.metadata?.discountPercent || c.metadata?.percent || 0)) : 0;
                    const pctDisplay = pct > 0 ? `${pct}% off` : null;
                    // combine display for right side
                    const rightDisplay = fixedAmt || pctDisplay || (c.metadata && c.metadata.note) || '';

                    return (
                      <button
                        key={c.id || code}
                        type="button"
                        onClick={() => selectCouponOffer(c)}
                        className={`p-3 rounded text-left border flex items-center justify-between w-full transition ${appliedCoupon && String(appliedCoupon.id) === String(c.id) ? 'border-cyan-500 bg-white/5' : 'border-white/6 hover:bg-white/2'}`}
                      >
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-white truncate">{title || code}</div>
                            {code && <div className="text-xs text-slate-400 px-2 py-0.5 rounded border border-white/6 ml-2">{code}</div>}
                          </div>

                          {desc ? (
                            <div className="text-xs text-slate-400 mt-1 line-clamp-2">{desc}</div>
                          ) : (
                            <div className="text-xs text-slate-500 mt-1">No description available</div>
                          )}

                          {/* optional meta details (minFare, validTo) */}
                          <div className="text-xs text-slate-400 mt-2">
                            {c.minFare ? `Min: ${formatRupee(c.minFare)}` : ''}
                            {c.validTo ? ` ${c.minFare ? '• ' : ''}Valid until ${new Date(c.validTo).toLocaleDateString()}` : ''}
                          </div>
                        </div>

                        <div className="ml-4 text-right">
                          <div className="text-sm font-medium text-white">
                            {rightDisplay}
                          </div>
                          {/* show small badge if coupon inactive/expired */}
                          {(c.active === false) && <div className="text-xs text-red-400 mt-1">Inactive</div>}
                          {(c.validTo && new Date(c.validTo) < new Date()) && <div className="text-xs text-red-400 mt-1">Expired</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>

              </div>
            </div>


            {/* Price breakdown */}
            <div className="p-3 bg-white/3 rounded">
              <div className="text-sm text-slate-300 mb-2">Price breakdown</div>

              <div className="space-y-2">
                {computedSeatPrices.map((s) => (
                  <div key={s.seatId} className="flex justify-between text-sm">
                    <div>{s.seatId} {normalizeSeatClass((s.raw && (s.raw.seatClass || s.raw.class || s.raw.category)) || '')}</div>
                    <div className="font-medium">{formatRupee(s.price)}</div>
                  </div>
                ))}

                {selectedAddons.map(sel => {
                  const off = addons.find(a => String(a.id) === String(sel.offerId) || String(a.code) === String(sel.offerId));
                  const title = off?.title || off?.name || sel.offerId;
                  const amt = (() => {
                    if (!off) return 0;
                    const perSeat = !!(off.metadata && (off.metadata.perSeat === true || off.metadata.applyTo === 'perSeat'));
                    const unit = Number(off.amount || 0);
                    const qty = Math.max(1, Number(sel.qty || 1));
                    return Math.round((perSeat ? unit * seatCount : unit) * qty);
                  })();
                  return (
                    <div key={sel.offerId} className="flex justify-between text-sm">
                      <div className="text-slate-300">{title} <span className="text-xs text-gray-400">x{sel.qty}</span></div>
                      <div className="font-medium">{formatRupee(amt)}</div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between mt-3 text-sm text-slate-300">
                <div>Seats subtotal</div>
                <div>{formatRupee(seatsTotal)}</div>
              </div>

              <div className="flex justify-between text-sm text-slate-300 mt-1">
                <div>Add-ons</div>
                <div>{formatRupee(addonsTotal)}</div>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-slate-300 mt-1">
                  <div>Discount ({appliedCoupon?.title || appliedCoupon?.code || 'Coupon'})</div>
                  <div>-{formatRupee(couponDiscount)}</div>
                </div>
              )}

              <div className="flex justify-between text-sm text-slate-300 mt-1">
                <div>Taxes & fees</div>
                <div>{formatRupee(taxes)}</div>
              </div>

              <div className="flex justify-between mt-3 border-t border-white/6 pt-3">
                <div className="text-sm">Total</div>
                <div className="text-lg font-semibold">{formatRupee(finalTotal)}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Contact details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input className="dark-input p-2 rounded" placeholder="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} required />
                <input className="dark-input p-2 rounded" placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} required type="email" />
                <input className="dark-input p-2 rounded" placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-300">
                  {holdMsRemaining ? `You have ${formatMs(holdMsRemaining)} to complete booking` : 'You have 10 minutes to complete booking'}
                </div>
                <div className="text-lg font-semibold mt-1">{flight?.price?.currency || 'INR'} {String(finalTotal).toLocaleString()}</div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={backToSeatSelection} className="px-3 py-1 rounded border border-white/12">Back</button>
                <button disabled={busy} type="submit" className="btn-accent px-4 py-2 rounded">{busy ? 'Processing…' : 'Proceed to payment'}</button>
              </div>
            </div>

            {error && <div className="text-sm text-red-400">{error}</div>}
          </form>
        )}

        {step === 4 && (
          <div className="p-4 text-center">
            <div className="font-semibold text-lg">Booking created</div>
            <div className="text-slate-300 mt-2">If a payment session was returned you were redirected to it. Otherwise a booking has been created — check booking list or email for confirmation.</div>
            <div className="mt-3">
              <button onClick={resetAll} className="px-3 py-1 rounded border border-white/12">New booking</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
