// src/components/Footer.jsx
import React from 'react';

export default function Footer() {
  return (
    <footer className="app-footer mt-12 text-gray-300">
      <div className="max-w-7xl mx-auto py-4 px-4 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <div className="text-white font-semibold mb-2">
            <img src="/logo.png" alt="FLYO" className="h-10 inline-block mb-1" />
            <span className="ml-2">FLYO</span>
          </div>
          <div className="text-sm text-gray-400">Book flights, manage bookings and explore curated packages.</div>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Explore</h4>
          <ul className="space-y-1 text-sm">
            <li>Flights</li>
            <li>Offers</li>
            <li>Bookings</li>
            <li>Support</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Support</h4>
          <ul className="space-y-1 text-sm">
            <li>FAQs</li>
            <li>Contact us</li>
            <li>Refund policy</li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold text-white mb-2">Follow us</div>
          <div className="flex items-center gap-3">
            <a href="#" className="text-gray-300 hover:text-white"><img src="/instagram.svg" alt="G" className="w-5 h-5" /></a>
            <a href="#" className="text-gray-300 hover:text-white"><img src="/facebook.svg" alt="G" className="w-5 h-5" /></a>
            <a href="#" className="text-gray-300 hover:text-white"><img src="/twitter.svg" alt="G" className="w-5 h-5" /></a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 text-center text-xs text-gray-500 py-3">
        © {new Date().getFullYear()} FLYO — All rights reserved
      </div>
    </footer>
  );
}
