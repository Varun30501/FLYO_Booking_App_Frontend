// src/components/AuthModal.jsx (patched)
import React, { useEffect } from "react";

/**
 * AuthModal (patched)
 * - Ensures modal sits above the site navbar by using a very large z-index
 * - Locks document scrolling while modal is open to avoid exposing top/bottom bars
 * - Provides a near-opaque container background so the site behind cannot be seen
 *
 * Props:
 * - open, onClose, title, subtitle, bgImage, children (same as before)
 */
export default function AuthModal({
  open = true,
  onClose = () => {},
  title = "Sign in",
  subtitle = "",
  bgImage = "/flight-bg.png",
  children,
}) {
  // lock body scroll while modal is mounted
  useEffect(() => {
    if (!open) return;
    const prev = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight
    };
    // prevent scrolling (and layout shift from scrollbar disappearing)
    document.body.style.overflow = "hidden";
    // if needed you could compute scrollbar width and apply paddingRight to avoid shift
    return () => {
      document.body.style.overflow = prev.overflow || "";
      document.body.style.paddingRight = prev.paddingRight || "";
    };
  }, [open]);

  if (!open) return null;

  return (
    // high z-index so it always overlays the fixed navbar
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* backdrop - sits under the container but above page */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
        style={{ zIndex: 9998 }}
      />

      {/* modal container - give an opaque shell so page doesn't show through */}
      <div
        className="relative w-full mx-auto rounded-xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2"
        style={{
          maxWidth: 1100,
          // near-opaque shell to hide background; visual panels live inside this
          background: "rgba(6,10,18,0.96)",
          // ensure this sits above the backdrop
          zIndex: 9999,
        }}
      >
        {/* Promo / image panel */}
        <div
          className="hidden md:block relative h-96 md:h-auto"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
          }}
        >
          {/* darker overlay to make text readable (keeps promo image visible) */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-transparent" />

          {/* layered content (text + icons) */}
          <div className="absolute inset-0 p-8 flex flex-col justify-center text-white">
            <h2 className="text-2xl font-bold mb-4 drop-shadow-md">
              Sign up / Login now
            </h2>

            <ul className="space-y-5 w-full max-w-xs">
              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 h-11 w-11 rounded-lg bg-white/10 flex items-center justify-center text-xl">
                  ✈️
                </div>
                <div>
                  <div className="font-semibold text-lg drop-shadow-sm">
                    Lock Flight Prices & Pay Later
                  </div>
                  <div className="text-sm text-white/80">
                    Reserve price, pay when ready
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 h-11 w-11 rounded-lg bg-white/10 flex items-center justify-center text-xl">
                  🏨
                </div>
                <div>
                  <div className="font-semibold text-lg drop-shadow-sm">
                    Book Hotels @ ₹0
                  </div>
                  <div className="text-sm text-white/80">
                    Flexible payment options
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 h-11 w-11 rounded-lg bg-white/10 flex items-center justify-center text-xl">
                  💳
                </div>
                <div>
                  <div className="font-semibold text-lg drop-shadow-sm">
                    Easy Refunds & Support
                  </div>
                  <div className="text-sm text-white/80">
                    Hassle-free help when needed
                  </div>
                </div>
              </li>
            </ul>

            <div className="mt-8">
              <div className="inline-flex items-center gap-2 bg-white/6 px-3 py-2 rounded-full text-sm">
                <span className="font-semibold">New</span>
                <span className="text-xs text-white/75">
                  Festive fares — up to 40% off
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form panel (right) */}
        <div
          className="p-6 md:p-8 flex flex-col justify-center"
          // right panel itself can keep a subtle translucent look while container blocks background
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))"
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-semibold text-white">{title}</h3>
              {subtitle && <div className="text-sm text-white/80">{subtitle}</div>}
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4 text-sm text-white/80 hidden md:block">
            Sign in to Book your Flight Tickets
          </div>

          <div className="w-full">{children}</div>

          {/* mobile promo fallback */}
          <div
            className="md:hidden mt-6 rounded-lg overflow-hidden relative"
            style={{
              backgroundImage: `url(${bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-transparent" />
            <div className="relative p-4 text-white">
              <h4 className="font-semibold">Sign up / Login now</h4>
              <div className="text-sm mt-2">Lock Flight Prices • Book Hotels • Easy Refunds</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
