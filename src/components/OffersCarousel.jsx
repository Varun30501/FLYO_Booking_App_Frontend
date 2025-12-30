// src/components/OffersCarousel.jsx
import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function OffersCarousel({ items = [], onClickOffer }) {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    arrows: true,
    slidesToShow: Math.min(3, Math.max(1, items.length)),
    slidesToScroll: 1,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2 } },
      { breakpoint: 640, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <Slider {...settings}>
      {items.map((o) => (
        <div key={o.id} className="p-3">
          <div
            className="relative panel-3d rounded-xl overflow-hidden cursor-pointer"
            onClick={() => onClickOffer && onClickOffer(o)}
          >
            <img
              src={o.img}
              alt={o.title}
              className="w-full h-40 object-cover"
            />

            {/* Hover Overlay CTA */}
            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition flex items-center justify-center">
              <button className="btn-accent">View Offer</button>
            </div>

            <div className="p-4">
              <div className="font-semibold text-white">{o.title}</div>
              <div className="text-sm text-gray-300">{o.subtitle}</div>
            </div>
          </div>
        </div>
      ))}
    </Slider>
  );
}
