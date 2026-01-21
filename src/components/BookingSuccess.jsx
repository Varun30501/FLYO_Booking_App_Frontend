// src/components/BookingSuccess.jsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";


/**
 * BookingSuccess
 *
 * Props:
 *  - bookingRef: string
 *  - onViewBooking: function
 *  - onClose: function
 *  - modalOnly: boolean
 *
 * Notes:
 *  - overlay click will NOT close the modal
 *  - body scroll is disabled while open
 *  - uses panel-3d + btn-accent from global theme
 */

export default function BookingSuccess({ bookingRef, onViewBooking, onClose, modalOnly = false }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => setShow(true), 80);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, []);

  // ensure callback safety
  const handleClose = () => {
    setShow(false);
    // small delay to allow animation
    setTimeout(() => {
      if (typeof onClose === "function") onClose();
    }, 220);
  };

  const handleView = () => {
    // close immediately so overlay is removed
    if (typeof onClose === "function") {
      onClose();
    }

    // navigate after close
    setTimeout(() => {
      if (typeof onViewBooking === "function") onViewBooking();
    }, 0);
  };


  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* overlay: intentionally strong and slightly blurred so modal reads clearly */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/72 backdrop-blur-sm"
        style={{ pointerEvents: "none" }}
      />

      <div
        className={`relative z-10 w-full max-w-lg mx-4 transform transition-all duration-300 ease-out
          ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        style={{ willChange: "opacity, transform" }}
      >
        {/* Modal panel */}
        <div className="panel-3d overflow-hidden rounded-2xl bg-gradient-to-b from-[#07182a] to-[#041126] border border-white/6">
          <div className="p-6 flex gap-4 items-start">
            {/* left graphic */}
            <div className="flex-shrink-0">
              <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-[#0ea5a7] to-[#6366f1] flex items-center justify-center shadow-md">
                {/* plane svg - recolored for dark theme */}
                <svg viewBox="0 0 64 64" className="h-9 w-9" fill="none" src="/aeroplane.svg" aria-hidden="true">
                  <defs>
                    <linearGradient id="g1" x1="0" x2="1">
                      <stop offset="0" stopColor="#06b6d4" />
                      <stop offset="1" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>

                  <g className="plane" transform="translate(0,0)">
                    <path d="M4 32 L22 28 L30 36 L44 24 L56 22 L60 26 L44 30 L30 42 L22 36 Z"
                      fill="url(#g1)" opacity="0.98"></path>
                  </g>

                  <g className="contrail" fill="#9fb8ff">
                    <circle cx="50" cy="12" r="1.6" />
                    <circle cx="42" cy="10" r="1.3" />
                    <circle cx="34" cy="9" r="1" />
                  </g>

                  <style>{`
                    .plane { transform-origin: 32px 32px; animation: planeFloat 2.6s ease-in-out infinite; }
                    @keyframes planeFloat {
                      0% { transform: translateY(0) rotate(-6deg) translateX(0); }
                      50% { transform: translateY(-4px) rotate(2deg) translateX(2px); }
                      100% { transform: translateY(0) rotate(-6deg) translateX(0); }
                    }
                    .contrail circle { opacity: 0.65; animation: contrail 2.0s linear infinite; }
                    .contrail circle:nth-child(1) { animation-delay: 0s; }
                    .contrail circle:nth-child(2) { animation-delay: 0.18s; }
                    .contrail circle:nth-child(3) { animation-delay: 0.36s; }
                    @keyframes contrail {
                      0% { opacity: 0.2; transform: translateX(-2px) scale(0.9); }
                      50% { opacity: 0.95; transform: translateX(0px) scale(1); }
                      100% { opacity: 0.2; transform: translateX(2px) scale(0.9); }
                    }
                  `}</style>
                </svg>
              </div>
            </div>

            {/* content */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Payment successful</h3>
              <p className="text-sm text-slate-300 mt-1">
                Your booking <strong className="text-white">{bookingRef}</strong> is confirmed.
              </p>

              <div className="mt-3">
                <div className="flex gap-2 items-center">
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-900/60 text-emerald-300 text-xs font-medium">
                    Confirmed
                  </div>
                  <div className="text-xs text-slate-400">
                    A confirmation will be sent to your email (or logged to console if emailer is disabled).
                  </div>
                </div>

                {/* optional decorative image (local asset path injected below) */}
                <div className="mt-3 hidden sm:block">
                  {/* Developer-supplied local asset path (change if needed) */}
                  <img
                    src="/thumbsup.svg"
                    alt="celebration"
                    className="w-full max-w-xs rounded-md opacity-90"
                    style={{ filter: "saturate(0.98) contrast(1.02)" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* footer actions */}
          <div className="px-4 py-3 bg-gradient-to-t from-black/6 to-transparent flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-3 py-2 rounded border border-white/8 bg-transparent text-slate-200 hover:bg-white/3 transition"
            >
              Close
            </button>

            <button
              onClick={handleView}
              className="px-3 py-2 rounded btn-accent shadow-sm"
            >
              View booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(content, document.body);
}
