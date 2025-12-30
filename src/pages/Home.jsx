// src/pages/Home.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getToken } from '../services/auth';

export default function Home({ onAuthChange }) {
  const navigate = useNavigate();
  const logged = !!getToken();

  function handleEnter() {
    if (logged) navigate('/dashboard');
    else navigate('/login');
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-b from-slate-900 via-indigo-900 to-slate-800 text-white">
      <div className="absolute inset-0">
        <img src="/flight1.png" alt="hero" className="w-full h-full object-cover opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-black/10" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-52 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover, Compare & Book Flights</h1>
          <p className="text-lg text-slate-200 mb-6">Curated deals, packages and instant offers — designed for travellers</p>
          <p className="text-lg text-slate-400 mb-6">Join millions of happy customers booking with FLYO</p>

          <div className="flex gap-4">
            <button onClick={handleEnter} className="btn-accent px-6 py-3 rounded-md font-semibold">Get started</button>
          </div>
        </div>

        <div className="w-full md:w-1/3 panel-3d p-4 bg-white/5 rounded-lg">
          <div className="font-semibold">Popular offers</div>
          <ul className="mt-3 text-sm text-slate-300 space-y-2">
            <li>Weekend Goa — From ₹4,999</li>
            <li>Festive Dubai — From ₹22,999</li>
            <li>Singapore Sale — Flexible Dates</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
