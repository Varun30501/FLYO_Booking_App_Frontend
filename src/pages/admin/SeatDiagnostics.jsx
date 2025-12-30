import React, { useEffect, useState } from "react";
import { get } from "../../services/api";

export default function SeatDiagnostics() {
  const [seats, setSeats] = useState([]);

  useEffect(() => {
    get("/admin/seats/locks").then(r => setSeats(r.seats || []));
  }, []);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl mb-4">Seat Locks</h1>

      <div className="panel-3d p-4">
        {seats.length === 0 && <div>No locked seats 🎉</div>}

        {seats.map((s, i) => (
          <div key={i} className="border-b border-white/10 py-2 text-sm">
            Flight {s.flightId} — Seat {s.seatId} — {s.status}
            {s.heldUntil && (
              <span className="text-slate-400 ml-2">
                until {new Date(s.heldUntil).toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
