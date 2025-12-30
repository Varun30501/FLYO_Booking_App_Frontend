// src/components/OfferModal.jsx
import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

/**
 * OfferModal
 * - Uses images only from the offer object (offer.images or offer.img)
 * - Does NOT fallback to hero-bg or any project-wide default image.
 * - If there are no images on the offer, shows a "No image available" block.
 */
export default function OfferModal({ open, offer, onClose, onBook }) {
  if (!open || !offer) return null;

  // Use only DB-provided images, filter out falsy values.
  // Do not fall back to a global hero-bg here.
  const imagesSource = Array.isArray(offer.images) && offer.images.length
    ? offer.images
    : (offer.img ? [offer.img] : []);
  const images = imagesSource.filter(Boolean);

  const sliderSettings = {
    dots: true,
    infinite: Math.max(1, images.length) > 1,
    speed: 450,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true
  };

  return (
    <div
      className="
        fixed inset-0 z-[100]
        bg-black/60 backdrop-blur-sm
        flex items-center justify-center
        p-4
      "
      onClick={onClose}
    >
      <div
        className="
          w-full max-w-3xl 
          rounded-xl shadow-2xl
          bg-[#0d1433]/95
          border border-white/10
          overflow-hidden
          animate-fadeUp
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            {offer.title || `${offer.origin || ""} → ${offer.destination || ""}`}
          </h2>

          <button
            onClick={onClose}
            className="
              text-white text-2xl font-light 
              hover:text-red-300 transition
            "
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6">

          {/* IMAGE CAROUSEL or placeholder */}
          <div className="rounded-lg overflow-hidden shadow-lg bg-[#071028]">
            {images.length ? (
              <Slider {...sliderSettings}>
                {images.map((src, idx) => (
                  <div key={idx} className="w-full">
                    {/* Make sure img uses object-cover and full width/height */}
                    <img
                      src={src}
                      alt={offer.title || `offer-${idx}`}
                      className="w-full h-72 object-cover"
                      onError={(e) => {
                        // if an image fails to load, hide it gracefully
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ))}
              </Slider>
            ) : (
              <div className="w-full h-72 flex items-center justify-center text-gray-400">
                No image available
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div>
            <div className="text-gray-300 mb-1">
              From:
              <span className="text-white ml-2">
                {offer.origin || offer.from || "—"} → {offer.destination || offer.to || "—"}
              </span>
            </div>

            <div className="text-gray-300">
              {offer.subtitle || offer.description || offer.subtitle || ""}
            </div>

            {/* Itinerary */}
            {offer.itinerary && (
              <div className="mt-4 text-gray-300 space-y-2">
                <div>
                  <strong className="text-white">Duration:</strong>{" "}
                  {offer.itinerary.duration || "—"}
                </div>
                <div>
                  <strong className="text-white">Layovers:</strong>{" "}
                  {offer.itinerary.layovers ?? 0}
                </div>

                <div>
                  <strong className="text-white">Segments:</strong>
                  <ul className="list-disc pl-5 mt-1 text-sm space-y-1">
                    {(offer.itinerary.segments || []).map((s, idx) => (
                      <li key={idx}>
                        {s.from} → {s.to}
                        {s.flight ? (
                          <span className="text-gray-400 ml-1">
                            ({s.flight})
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="
                px-4 py-2 rounded-md 
                bg-white/10 hover:bg-white/20 
                text-white transition
              "
            >
              Close
            </button>

            <button
              onClick={() => onBook && onBook(offer)}
              className="btn-accent px-5 py-2"
            >
              Book now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
