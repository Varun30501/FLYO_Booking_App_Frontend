// src/components/NavBar.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getToken, logout, getUser } from "../services/auth";

function Initials({ name = "", size = 32 }) {
  const parts = (name || "").trim().split(/\s+/).slice(0,2);
  const initials = (parts.length === 0) ? "U" : parts.map(p => p[0]?.toUpperCase()).join("");
  return (
    <div
      className="flex items-center justify-center rounded-full bg-white/8 text-white font-semibold"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export default function NavBar({ onAuthChange }) {
  const nav = useNavigate();
  const location = useLocation();
  const logged = !!getToken();
  const user = getUser() || {};
  const isAdmin = !!(user.isAdmin || user.role === "admin");

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 6);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function doLogout() {
    logout();
    if (onAuthChange) onAuthChange();
    nav("/");
  }

  if (!logged) return null;

  const activeClass = (path) =>
    location.pathname.startsWith(path)
      ? "text-white font-semibold"
      : "text-slate-300 hover:text-white";

  return (
    <nav
      className={`fixed top-0 left-0 w-full h-14 z-50 transition-all duration-300 ${
        scrolled ? "backdrop-blur-md bg-[rgba(6,8,24,0.70)] shadow-lg border-b border-white/8" : "bg-[linear-gradient(90deg,#0b1535,#0d1941/0.9)]"
      }`}
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/logo.png" alt="FLYO" className="h-12 w-12 object-contain" />
          </Link>

          {/* Links */}
          <div className="hidden md:flex items-center gap-4 ml-4">
            <Link to="/dashboard" className={activeClass("/dashboard")}>Dashboard</Link>
            <Link to="/search" className={activeClass("/search")}>Search</Link>
            <Link to="/bookings" className={activeClass("/bookings")}>My Bookings</Link>
            <Link to="/support" className={activeClass("/support")}>Support</Link>

          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Profile */}
          <Link to="/profile" className="flex items-center gap-3 bg-white/6 px-3 py-1 rounded-md hover:bg-white/10 transition">
            {user?.avatar ? (
              <img src={user.avatar} alt={user?.name || "profile"} className="h-8 w-8 rounded-full object-cover border border-white/10" />
            ) : (
              <Initials name={user?.name || user?.email || "User"} size={32} />
            )}

            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-white">{user?.name || "User"}</span>
              <span className="text-xs text-slate-300">{user?.email ? user.email : ""}</span>
            </div>
          </Link>

          {/* Admin badge with pulse when admin */}
          {isAdmin && (
            <Link
              to="/admin/reconciliation"
              className="px-3 py-1 rounded text-sm text-cyan-200 bg-cyan-600/8 hover:bg-cyan-600/12 flex items-center gap-2"
              aria-label="Admin dashboard"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
              <span className="whitespace-nowrap">Admin</span>
            </Link>
          )}

          {/* Logout */}
          <button
            onClick={doLogout}
            className="
              px-4 py-2 rounded 
              bg-gradient-to-r from-[#06b6d4] to-[#4f5ff6]
              text-white font-medium shadow-md hover:opacity-95 transition
            "
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
