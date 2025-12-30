// src/components/AirlineModal.jsx
import React from "react";
import ReactDOM from "react-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

/**
 * AirlineModal - stronger contrast, less translucent
 */
function InnerModal({ airline, onClose }) {
  if (!airline) return null;

  const slides = (airline.images && airline.images.length > 0) ? airline.images : [airline.image || "/icons/airline-placeholder.png"];
  const settings = {
    dots: true,
    arrows: true,
    infinite: true,
    speed: 360,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      {/* stronger dark overlay */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl mx-4 rounded-lg overflow-hidden shadow-2xl" role="dialog" aria-modal="true">
        {/* Modal panel: dark solid with clear borders */}
        <div className="bg-[#07102a] border border-white/6 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/6">
            <div className="flex items-center gap-3">
              <img src={airline.image || "/icons/airline-placeholder.png"} alt={airline.name} className="w-12 h-10 object-cover rounded" />
              <div>
                <div className="text-lg font-semibold text-white">{airline.name}</div>
                <div className="text-xs text-gray-300">{airline.code || ""} • {airline.rating ? `${airline.rating} ★` : "—"}</div>
              </div>
            </div>

            <button onClick={onClose} className="text-white bg-white/6 hover:bg-white/8 px-3 py-1 rounded">
              Close ✕
            </button>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <div className="rounded overflow-hidden mb-4">
                <Slider {...settings}>
                  {slides.map((s, idx) => (
                    <div key={`${s}-${idx}`}>
                      <img src={s} alt={`${airline.name}-${idx}`} className="w-full h-64 object-cover" />
                    </div>
                  ))}
                </Slider>
              </div>

              <div className="text-sm text-gray-200">
                <p>{airline.description || "No description available for this carrier yet."}</p>

                <div className="mt-4">
                  <strong className="text-white">Offers</strong>
                  <div className="mt-3 space-y-3">
                    {airline.offers && airline.offers.length > 0 ? airline.offers.map((of, i) => (
                      <div key={of.id || i} className="p-3 rounded bg-[#091528] border border-white/5">
                        <div className="font-medium text-white">{of.title || of.name || `Offer ${i+1}`}</div>
                        {of.subtitle && <div className="text-xs text-gray-300">{of.subtitle}</div>}
                      </div>
                    )) : (
                      <div className="text-gray-400">No special offers listed.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <aside className="p-3 rounded panel-3d bg-[#081427] border border-white/6">
              <div className="text-sm text-gray-300">Quick facts</div>
              <div className="mt-3 space-y-2 text-sm text-gray-200">
                <div><strong className="text-white">{airline.rating ?? "—"}</strong> rating</div>
                <div>{airline.meta?.headquarters ? airline.meta.headquarters : "Headquarters: —"}</div>
                <div>
                  {airline.meta?.website ? (
                    <a href={airline.meta.website} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">Website</a>
                  ) : ("Website: —")}
                </div>
              </div>

              <div className="mt-4">
                <button onClick={() => { onClose && onClose(); }} className="btn-accent w-full">View flights</button>
              </div>
            </aside>
          </div>

          <div className="px-5 py-3 border-t border-white/6 text-xs text-gray-400 bg-[#061020]">
            Ratings & comments coming soon.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AirlineModal({ open, airline, onClose }) {
  if (!open) return null;
  return ReactDOM.createPortal(<InnerModal airline={airline} onClose={onClose} />, document.body);
}
