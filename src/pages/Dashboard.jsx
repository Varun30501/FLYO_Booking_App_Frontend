// src/pages/Dashboard.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { get } from "../services/api";
import { motion } from "framer-motion";
import Slider from "react-slick";
import OffersCarousel from "../components/OffersCarousel";
import HeroParallax from "../components/HeroParallax";
import OfferModal from "../components/OfferModal";
import AirlineModal from "../components/AirlinesModal";
import ReviewsSection from "../components/ReviewsSection";
import BookingsSpark from "../components/BookingsSpark";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

/* ---- helpers (countup + sparkline) ---- */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    const from = Number(value) || 0;
    const to = Number(target) || 0;
    const start = performance.now();
    if (from === to) return setValue(to);
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const cur = Math.round(from + (to - from) * eased);
      setValue(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
}

function Sparkline({ data = [], width = 120, height = 40, stroke = "#06b6d4" }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={`M0 ${height - 6} L ${width} ${height - 6}`} stroke={stroke} strokeWidth="2" fill="none" opacity="0.25" />
      </svg>
    );
  }
  const max = Math.max(...data), min = Math.min(...data), range = Math.max(1, max - min);
  const step = width / (data.length - 1 || 1);
  const points = data.map((d, i) => {
    const x = i * step;
    const y = height - ((d - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  const polyPoints = data.map((d, i) => {
    const x = i * step;
    const y = height - ((d - min) / range) * (height - 8) - 4;
    return `${x} ${y}`;
  }).join(" L ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M0 ${height} L ${polyPoints} L ${width} ${height} Z`} fill={stroke} opacity="0.06" />
    </svg>
  );
}

// deterministic PRNG using a seed (mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * generateDailyStats(date)
 * Returns a deterministic but pseudo-random stats object for the given date.
 * - bookingsToday: integer
 * - happyCustomers: integer
 * - totalOffers: integer
 * - bookingsTrend: array[7]
 */
function generateDailyStats(date = new Date()) {
  // seed by yyyy-mm-dd so each day yields new numbers deterministically
  const d = new Date(date);
  const seedStr = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
  // simple numeric seed from chars:
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) | 0;
  const rnd = mulberry32(seed);

  // base numbers and variations
  const baseBookings = 12 + Math.floor(rnd() * 40);              // 12 - 51
  const baseCustomers = 200 + Math.floor(rnd() * 1200);         // 200 - 1400
  const baseOffers = 3 + Math.floor(rnd() * 10);                // 3 - 12

  // 7-day bookings trend (smoothed)
  const trend = [];
  let last = Math.max(3, Math.round(baseBookings * (0.6 + rnd() * 0.8)));
  for (let i = 0; i < 7; i++) {
    // small day-to-day variation
    const change = Math.round((rnd() - 0.45) * 12); // -~5 .. +~6
    last = Math.max(0, last + change);
    trend.push(last);
  }

  return {
    bookingsToday: baseBookings,
    happyCustomers: baseCustomers,
    totalOffers: baseOffers,
    bookingsTrend: trend
  };
}

/* Slick arrows */
function SlickPrev({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Previous" className="slick-control slick-prev fixed-arrow">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="url(#g)" />
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#06b6d4" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}
function SlickNext({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Next" className="slick-control slick-next fixed-arrow">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" fill="url(#g2)" />
        <defs>
          <linearGradient id="g2" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#06b6d4" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}

export default function Dashboard() {
  const nav = useNavigate();

  const [offers, setOffers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // modals
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [airlineModalOpen, setAirlineModalOpen] = useState(false);
  const [selectedAirline, setSelectedAirline] = useState(null);

  const featuredIndexRef = useRef(0);
  const [featuredOffer, setFeaturedOffer] = useState(null);

  // stats fallback
  // replace previous stats initial state with this
  const [stats, setStats] = useState(() => generateDailyStats(new Date()));

  function openOffer(o) { setSelectedOffer(o); setOfferModalOpen(true); }
  function openAirline(a) { setSelectedAirline(a); setAirlineModalOpen(true); }
  function bookOffer(o) {
    setOfferModalOpen(false);
    if (!o) return;
    const origin = o.origin || o.from || "BOM";
    const destination = o.destination || o.to || "DEL";
    nav(`/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [offersResp, reviewsResp, airlinesResp, packagesResp, statsResp] = await Promise.allSettled([
          get("/offers"),
          get("/reviews"),
          get("/airlines"),
          get("/packages"),
          get("/stats"),
        ]);

        if (!mounted) return;

        // OFFERS normalization
        if (offersResp.status === "fulfilled" && Array.isArray(offersResp.value)) {
          const normalized = offersResp.value.map((o, i) => {
            const rawImages = Array.isArray(o.images) ? o.images.slice() : (o.image ? [o.image] : (o.img ? [o.img] : []));
            // compact: remove falsy (undefined/null/empty)
            const cleanImages = rawImages.filter(Boolean);
            const firstImg = o.img || o.image || cleanImages[0] || null;

            return {
              id: o._id || o.id || `offer-${i}`,
              title: o.title || o.name || `Offer ${i + 1}`,
              subtitle: o.subtitle || o.description || "",
              img: firstImg || "/hero-bg.png",
              origin: o.origin || o.from || "BOM",
              destination: o.destination || o.to || "DEL",
              images: cleanImages.length ? cleanImages : (firstImg ? [firstImg] : []),
            };
          });
          setOffers(normalized);
          if (normalized.length) {
            featuredIndexRef.current = 0;
            setFeaturedOffer(normalized[0]);
          }
        } else {
          // fallback sample offers (safe)
          const fallback = [
            { id: "o1", title: "Mumbai → Goa Weekend", subtitle: "2 nights • From ₹4,999", img: "/hero-bg.png", origin: "BOM", destination: "GOI", images: ["/hero-bg.png"] },
            { id: "o2", title: "Delhi → Dubai Festive", subtitle: "3 nights • From ₹22,999", img: "/hero-bg.png", origin: "DEL", destination: "DXB", images: ["/hero-bg.png"] },
          ];
          setOffers(fallback);
          featuredIndexRef.current = 0;
          setFeaturedOffer(fallback[0]);
        }

        // REVIEWS
        if (reviewsResp.status === "fulfilled" && Array.isArray(reviewsResp.value)) {
          setReviews(reviewsResp.value.map((r, idx) => ({ id: r._id || r.id || `r-${idx}`, ...r })));
        } else if (!reviewsResp.value) {
          setReviews([{ id: "r1", name: "Ananya", rating: 5, text: "Quick bookings and great deals!" }]);
        }

        // AIRLINES
        if (airlinesResp.status === "fulfilled") {
          const payload = airlinesResp.value;
          let list = [];
          if (Array.isArray(payload)) list = payload;
          else if (payload && payload.ok && Array.isArray(payload.airlines)) list = payload.airlines;
          else if (payload && Array.isArray(payload.data)) list = payload.data;
          setAirlines(list.map((a, i) => ({
            id: a._id || a.id || `air-${i}`,
            code: a.code || a.iata || a.short || "",
            name: a.name || a.title || `Airline ${i + 1}`,
            image: a.image || a.img || "/hero-bg.png",
            description: a.description || a.desc || "",
            rating: typeof a.rating === "number" ? a.rating : 4.0,
            offers: a.offers || [],
            meta: a.meta || {}
          })));
        } else {
          // fallback airlines
          setAirlines([
            { id: "al1", code: "AI", name: "Air India", image: "/hero-bg.png", description: "Flag carrier of India", rating: 4.0, offers: [] },
            { id: "al2", code: "6E", name: "IndiGo", image: "/hero-bg.png", description: "Low-cost leader", rating: 4.3, offers: [] },
            { id: "al3", code: "G8", name: "AirAsia", image: "/hero-bg.png", description: "Budget airline", rating: 4.1, offers: [] },
            { id: "al4", code: "SG", name: "SpiceJet", image: "/hero-bg.png", description: "Value carrier", rating: 3.9, offers: [] },
          ]);
        }

        // PACKAGES normalization (prefer backend data)
        if (packagesResp.status === "fulfilled") {
          const payload = packagesResp.value;
          let list = [];
          if (Array.isArray(payload)) list = payload;
          else if (payload && Array.isArray(payload.packages)) list = payload.packages;
          else if (payload && Array.isArray(payload.data)) list = payload.data;
          else if (packagesResp.value && Array.isArray(packagesResp.value.data)) list = packagesResp.value.data;

          const normalizedPackages = list.map((p, idx) => ({
            id: p._id || p.id || `pkg-${idx}`,
            name: p.name || p.title || p.displayName || `Package ${idx + 1}`,
            price: Number(p.price ?? p.cost ?? p.amount ?? 0),
            img: p.img || p.image || p.photo || "/hero-bg.png",
            origin: p.origin || p.from || "BOM",
            destination: p.destination || p.to || "DEL",
            subtitle: p.subtitle || p.desc || p.description || `From ₹${Number(p.price ?? p.cost ?? p.amount ?? 0)}`,
            raw: p
          }));

          if (normalizedPackages.length) {
            setPackages(normalizedPackages);
          } else {
            setPackages([]); // keep empty if server returns nothing
          }
        } else {
          setPackages([]); // no backend packages
        }

        // STATS
        <BookingsSpark data={stats.bookingsTrend} />

      } catch (e) {
        console.error("[Dashboard] load error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // counters
  const bookingsTodayAnim = useCountUp(stats.bookingsToday, 700);
  const happyCustomersAnim = useCountUp(stats.happyCustomers, 900);
  const totalOffersAnim = useCountUp(stats.totalOffers, 900);

  // moreOffers excludes featured
  const moreOffers = useMemo(() => {
    if (!featuredOffer) return offers;
    return offers.filter((o) => String(o.id) !== String(featuredOffer.id));
  }, [offers, featuredOffer]);

  // slick settings
  const airlineSettings = {
    dots: false, infinite: false, speed: 420,
    slidesToShow: Math.min(3, Math.max(1, airlines.length || 1)),
    slidesToScroll: 1, prevArrow: <SlickPrev />, nextArrow: <SlickNext />,
    responsive: [{ breakpoint: 1024, settings: { slidesToShow: Math.min(2, airlines.length || 1) } }, { breakpoint: 640, settings: { slidesToShow: 1 } }]
  };
  const moreOffersSettings = {
    dots: true, infinite: true, speed: 500,
    slidesToShow: Math.min(2, Math.max(1, moreOffers.length || 1)),
    slidesToScroll: 1, prevArrow: <SlickPrev />, nextArrow: <SlickNext />,
    responsive: [{ breakpoint: 1024, settings: { slidesToShow: Math.min(2, moreOffers.length || 1) } }, { breakpoint: 640, settings: { slidesToShow: 1 } }]
  };
  const packagesSettings = {
    dots: false, infinite: packages.length > 3, speed: 420,
    slidesToShow: Math.min(3, Math.max(1, packages.length || 1)),
    slidesToScroll: 1, prevArrow: <SlickPrev />, nextArrow: <SlickNext />,
    responsive: [{ breakpoint: 1024, settings: { slidesToShow: Math.min(2, packages.length || 1) } }, { breakpoint: 640, settings: { slidesToShow: 1 } }]
  };

  const heroLayers = [
    { id: "bg", depth: 1, className: "z-0", content: <div className="w-full h-full" style={{ background: "linear-gradient(90deg,#07102a 0%, rgba(7,10,20,0.7) 60%)" }} /> },
    {
      id: "image", depth: 2, className: "z-10 flex items-center justify-center",
      content: (
        <div className="flex items-center justify-between p-6 max-w-6xl mx-auto w-full">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold text-white">Discover curated flight deals & packages</h1>
            <p className="text-gray-300 mt-3">Offers, packages and instant deals — all in one place. Explore curated experiences for your next trip.</p>
            <div className="mt-4 flex gap-3">
              Seamless bookings start here.
            </div>
          </div>
          <div className="hidden md:block ml-8 w-80">
            <img
              src="/people.png"
              alt="hero"
              className="rounded-xl shadow-2xl floaty mix-blend-lighten"
            />


          </div>
        </div>
      )
    },
    {
      id: "cta", depth: 3, className: "z-20 pointer-events-auto",
      content: (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", height: "100%", padding: 20 }}>
          <div className="panel-3d p-3" style={{ minWidth: 220 }}>
            <div className="text-sm text-gray-400">Limited-time</div>
            <div className="font-semibold text-white">Festive fares — up to 40% off</div>
            <div className="mt-2">Explore Deals</div>
          </div>
        </div>
      )
    }
  ];

  return (
    <>
      <style>{`
        .slick-control{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));box-shadow:0 6px 18px rgba(2,6,23,0.55);border:1px solid rgba(255,255,255,0.06);transition:transform .12s ease}
        .fixed-arrow{cursor:pointer}
        .slick-prev{position:absolute;left:8px;top:40%;z-index:40}
        .slick-next{position:absolute;right:8px;top:40%;z-index:40}
        .airline-card{transition:transform .18s ease,box-shadow .18s ease}
        .airline-card:hover{transform:translateY(-6px);box-shadow:0 18px 40px rgba(2,6,23,0.6)}
      `}</style>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42 }}
        className="pt-20 bg-[#0b1535] bg-gradient-to-b from-[#0b1535] via-[#07102a] to-[#050a1b] min-h-screen text-white overflow-x-hidden">
        <div className="px-4 max-w-7xl mx-auto py-8">

          {/* HERO */}
          <div className="mb-10">
            <HeroParallax layers={heroLayers} height="420px" className="rounded-xl overflow-hidden" />
          </div>

          {/* FEATURED OFFERS (single display) */}
          <div className="panel-3d p-6 bg-white/5 mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg text-white">Featured Offers</h3>
            </div>

            <div className="relative">
              {featuredOffer ? (
                <motion.div key={featuredOffer.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.36 }} className="panel-3d rounded overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-3">
                    <div className="md:col-span-2 relative">
                      <img src={featuredOffer.img} alt={featuredOffer.title} className="w-full h-72 object-cover" />
                      <button onClick={() => openOffer(featuredOffer)} className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition bg-black/30">
                        <span className="bg-white/8 px-4 py-2 rounded text-white">View package</span>
                      </button>
                    </div>

                    <div className="p-6">
                      <div className="text-sm text-gray-300">From {featuredOffer.origin} → {featuredOffer.destination}</div>
                      <h4 className="font-semibold text-white text-xl mt-2">{featuredOffer.title}</h4>
                      <div className="text-sm text-gray-300 mt-2">{featuredOffer.subtitle}</div>

                      <div className="mt-6 flex gap-3">
                        <button onClick={() => openOffer(featuredOffer)} className="px-4 py-2 rounded border border-white/12">Details</button>
                        <button onClick={() => bookOffer(featuredOffer)} className="btn-accent px-4 py-2">Book</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="panel-3d p-6 text-gray-300">No featured offers</div>
              )}
            </div>
          </div>

          {/* MORE OFFERS + STATS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 panel-3d p-6 bg-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg text-white">More offers</h3>
              </div>
              <OffersCarousel items={moreOffers} onClickOffer={openOffer} settings={moreOffersSettings} />
            </div>

            {/* === STATS PANEL (restored) === */}
            <aside className="panel-3d p-4 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">Quick stats</div>
                <div className="text-xs text-slate-400">Live</div>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-300">Bookings today</div>
                    <div className="text-xl font-semibold text-white">{bookingsTodayAnim}</div>
                  </div>
                  <div>
                    <Sparkline data={stats.bookingsTrend} width={110} height={48} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-300">Happy customers</div>
                    <div className="text-xl font-semibold text-white">{happyCustomersAnim}</div>
                  </div>
                  <div className="text-xs text-slate-400">+{Math.max(1, Math.round((stats.bookingsTrend.slice(-1)[0] || 0) * 0.12))}%</div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-300">Active offers</div>
                    <div className="text-xl font-semibold text-white">{totalOffersAnim}</div>
                  </div>
                  <div className="text-xs text-slate-400">{offers.length} retrieved</div>
                </div>

                <div className="mt-3">
                  <div className="text-sm text-gray-300">Growth (7d)</div>
                  <div className="mt-2">
                    <Sparkline data={stats.bookingsTrend} width={240} height={56} />
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* AIRLINES */}
          <div className="panel-3d p-6 bg-white/5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg text-white">Airline partners</h3>
              <div className="text-sm text-gray-400">{airlines.length} carriers</div>
            </div>

            <div className="relative">
              <Slider {...airlineSettings}>
                {airlines.map((a, idx) => (
                  <div key={a.id || a.code || `air-${idx}`} className="px-2">
                    <div className="airline-card panel-3d rounded-lg overflow-hidden bg-gradient-to-b from-white/3 to-white/2 p-0">
                      <div className="relative">
                        <img src={a.image || "/hero-bg.png"} alt={a.name} className="w-full h-36 object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute left-4 bottom-3">
                          <div className="text-white font-semibold text-lg">{a.name}</div>
                          <div className="text-xs text-gray-300">{a.code}</div>
                        </div>
                        <div className="absolute right-3 top-3 px-2 py-1 rounded bg-white/6 text-xs text-gray-200">{a.rating ? `${Number(a.rating).toFixed(1)} ★` : "—"}</div>
                      </div>

                      <div className="p-4">
                        <div className="text-sm text-gray-300 line-clamp-2">{a.description}</div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => openAirline(a)} className="px-3 py-1 rounded border border-white/10 text-sm">Details</button>
                          <button onClick={() => nav(`/search?origin=BOM&destination=${encodeURIComponent(a.code || 'DEL')}`)} className="btn-accent px-3 py-1 text-sm">View offers</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </Slider>
            </div>
          </div>

          {/* POPULAR PACKAGES */}
          <div className="panel-3d p-6 bg-white/5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg text-white">Popular packages</h3>
            </div>

            <div className="relative">
              <Slider {...packagesSettings}>
                {packages.length === 0 ? (
                  <div className="p-4 text-gray-300">No packages available.</div>
                ) : packages.map((p, i) => (
                  <div key={p.id || `${p.name}-${i}`} className="px-2">
                    <div className="panel-3d rounded-lg overflow-hidden bg-gradient-to-b from-white/3 to-white/2">
                      <div className="relative">
                        <img src={p.img || "/hero-bg.png"} alt={p.name} className="w-full h-40 object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute left-4 bottom-3">
                          <div className="text-white font-semibold text-lg">{p.name}</div>
                          <div className="text-xs text-gray-300">{p.origin} → {p.destination}</div>
                        </div>
                        <div className="absolute right-3 top-3 px-2 py-1 rounded bg-white/6 text-xs text-gray-200">₹{Number(p.price || 0).toLocaleString()}</div>
                      </div>

                      <div className="p-4">
                        <div className="text-sm text-gray-300">{p.subtitle || `From ₹${Number(p.price || 0)}`}</div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => openOffer(p)} className="px-3 py-1 rounded border border-white/10 text-sm">Details</button>
                          <button onClick={() => bookOffer(p)} className="btn-accent px-3 py-1 text-sm">Book</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </Slider>
            </div>
          </div>

          {/* REVIEWS */}
          <ReviewsSection reviews={reviews} />

        </div>
      </motion.div>

      {/* Offer & Airline modals */}
      <OfferModal open={offerModalOpen} offer={selectedOffer} onClose={() => setOfferModalOpen(false)} onBook={bookOffer} />
      <AirlineModal open={airlineModalOpen} airline={selectedAirline} onClose={() => setAirlineModalOpen(false)} />
    </>
  );
}
