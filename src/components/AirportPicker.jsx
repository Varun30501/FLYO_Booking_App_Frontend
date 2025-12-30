// src/components/AirportPicker.jsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AIRPORTS } from "../data/airports";


export default function AirportPicker({
  value,
  onChange,
  name = "Select",
  placeholder = "Search airports...",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(AIRPORTS);

  const rootRef = useRef(null);

  /* filter results */
  useEffect(() => {
    const q = query.toLowerCase();
    if (!q) {
      setResults(AIRPORTS);
    } else {
      setResults(
        AIRPORTS.filter(
          (a) =>
            a.code.toLowerCase().includes(q) ||
            a.city.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q)
        )
      );
    }
  }, [query]);

  /* click outside */
  useEffect(() => {
    function handlePointerDown(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("pointerdown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);


  const display =
    value && typeof value === "object"
      ? `${value.city} • ${value.code}`
      : typeof value === "string"
        ? value
        : placeholder;



  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen(true);
          setQuery("");
        }}
        className="w-full text-left p-3 rounded bg-white/10 border border-white/20 flex justify-between items-center"
      >
        <div>
          <div className="text-xs text-slate-300">{name}</div>
          <div className="text-white font-medium">{display}</div>
        </div>
        <span className="text-slate-300">▼</span>
      </button>

      {/* Dropdown */}
      {open &&
        createPortal(
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: rootRef.current?.getBoundingClientRect().bottom + 8 || 0,
              left: rootRef.current?.getBoundingClientRect().left || 0,
              width: rootRef.current?.offsetWidth || 300,
              zIndex: 9999,
            }}
            className="
    bg-[#07102a]
    border border-white/20
    rounded-xl
    p-3
    shadow-2xl
  "
          >

            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="
          w-full p-2 rounded
          bg-white/10 text-white
          border border-white/20
          placeholder:text-slate-400 mb-3
        "
            />

            <div className="max-h-60 overflow-auto space-y-1">
              {results.length === 0 && (
                <div className="text-slate-400 p-3">No results</div>
              )}

              {results.map((a) => (
                <button
                  key={a.code}
                  onClick={() => {
                    onChange(a);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="
              w-full text-left p-2 rounded
              hover:bg-white/10
              flex items-center gap-3
            "
                >
                  <span className="text-lg font-bold text-white w-14 flex items-center gap-1">
                    <span className="text-lg font-bold text-white w-14">
                      {a.code}
                    </span>
                  </span>



                  <div>
                    <div className="font-medium text-white">{a.city}</div>
                    <div className="text-xs text-slate-400">{a.name}</div>
                    <div className="text-xs text-slate-300">{a.country}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )
      }

    </div>
  );
}
