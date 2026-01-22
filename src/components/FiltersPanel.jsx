// src/components/FiltersPanel.jsx
import React, { useState } from 'react';

export default function FiltersPanel({ onChange = () => { } }) {
  const [stops, setStops] = useState({ nonstop: false, one: false, twoPlus: false });
  const [fare, setFare] = useState('regular');

  function toggleStop(key) {
    const next = { ...stops, [key]: !stops[key] };
    setStops(next);
    onChange({ stops: next, fare });
  }

  function changeFare(v) {
    setFare(v);
    onChange({ stops, fare: v });
  }

  return (
    <div className="panel-3d p-4 rounded-md lg:sticky lg:top-20">
      <h4 className="text-white font-semibold mb-2">Filters</h4>

      <div className="mb-4">
        <div className="text-sm text-slate-300">Stops</div>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={stops.nonstop} onChange={() => toggleStop('nonstop')} />
            <span className="text-sm">Non stop</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={stops.one} onChange={() => toggleStop('one')} />
            <span className="text-sm">1 stop</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={stops.twoPlus} onChange={() => toggleStop('twoPlus')} />
            <span className="text-sm">2+ stops</span>
          </label>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-slate-300">Fare type</div>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="fare" checked={fare === 'regular'} onChange={() => changeFare('regular')} />
            <span className="text-sm">Regular</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="fare" checked={fare === 'student'} onChange={() => changeFare('student')} />
            <span className="text-sm">Student</span>
          </label>
        </div>
      </div>

      <div className="mt-3">
        <button className="btn-accent px-3 py-2 rounded">Apply</button>
      </div>
    </div>
  );
}
