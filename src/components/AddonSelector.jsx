import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * AddonSelector
 *
 * Props:
 *  - addons: array of addon objects from backend (active addons)
 *  - seatCount: number of seats in current booking
 *  - selectedAddons: [{ offerId, qty, perSeat:boolean, seatMap? }] (controlled)
 *  - setSelectedAddons: function to update selectedAddons
 *
 * Notes:
 *  - addon.metadata.perSeat (boolean) or metadata.applyTo === 'perSeat' marks per-seat addons.
 *  - For per-seat addons we allow toggling per passenger (quick: select quantity = number of seats selected).
 *  - For per-booking addons we allow qty and add/remove toggle.
 */

export default function AddonSelector({ addons = [], seatCount = 1, selectedAddons = [], setSelectedAddons }) {
  // helpers
  const indexed = useMemo(() => {
    const map = {};
    (addons || []).forEach(a => {
      map[String(a._id || a.id || a.code || a.code)] = a;
    });
    return map;
  }, [addons]);

  function findSel(offerId) {
    return selectedAddons.find(s => String(s.offerId) === String(offerId));
  }

  function toggleAddon(offerId, opts = {}) {
    const existing = findSel(offerId);
    if (existing) {
      // remove
      setSelectedAddons(selectedAddons.filter(s => String(s.offerId) !== String(offerId)));
    } else {
      const add = {
        offerId: String(offerId),
        qty: opts.qty ?? 1,
        perSeat: !!opts.perSeat,
        raw: indexed[String(offerId)] || null
      };
      // For perSeat default qty = seatCount
      if (add.perSeat) add.qty = seatCount;
      setSelectedAddons([...(selectedAddons || []), add]);
    }
  }

  function changeQty(offerId, qty) {
    setSelectedAddons((prev) => prev.map(p => (String(p.offerId) === String(offerId) ? { ...p, qty: Math.max(1, Number(qty) || 1) } : p)));
  }

  // quick calculation for display
  function computeUnit(addon) {
    return Number(addon.amount || addon.price || addon.value || 0);
  }

  return (
    <div className="space-y-3">
      {(addons || []).length === 0 && <div className="text-sm text-slate-400">No add-ons available</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(addons || []).map((a) => {
          const id = a._id || a.id || a.code || a.code;
          const selected = !!findSel(id);
          const perSeat = !!(a.metadata && (a.metadata.perSeat === true || a.metadata.applyTo === 'perSeat'));
          const unit = computeUnit(a);
          const labelPrice = unit ? `${unit ? ` • ${unit.toLocaleString()} ${a.currency || 'INR'}` : ''}${perSeat ? ' /seat' : ''}` : '';
          return (
            <div key={id} className="p-3 bg-[#07182a] rounded flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-white truncate">{a.title || a.name}</div>
                  {a.category && <div className="text-xs text-slate-400 px-2 py-0.5 rounded bg-white/5">{String(a.category).toUpperCase()}</div>}
                </div>
                {a.subtitle && <div className="text-xs text-slate-400 mt-1">{a.subtitle}</div>}
                {a.metadata?.description && <div className="text-xs text-slate-400 mt-1">{a.metadata.description}</div>}
                <div className="text-xs text-slate-400 mt-1">{labelPrice}</div>

                {/* per-seat quick controls */}
                {perSeat && (
                  <div className="text-xs text-slate-400 mt-2">
                    Applies to {seatCount} seat{seatCount > 1 ? 's' : ''}.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selected ? (
                  <>
                    {/* quantity */}
                    <input
                      aria-label={`Quantity for ${a.title || a.name}`}
                      type="number"
                      min="1"
                      value={findSel(id)?.qty || 1}
                      onChange={(e) => changeQty(id, e.target.value)}
                      className="dark-input p-1 rounded w-20 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleAddon(id)}
                      className="px-3 py-1 rounded border border-white/12"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    {perSeat ? (
                      <button
                        type="button"
                        onClick={() => toggleAddon(id, { perSeat: true })}
                        className="btn-accent px-3 py-1 rounded"
                        title="Apply per-seat addon for all seats"
                      >
                        Add (per-seat)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleAddon(id, { qty: 1 })}
                        className="btn-accent px-3 py-1 rounded"
                      >
                        Add
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

AddonSelector.propTypes = {
  addons: PropTypes.array,
  seatCount: PropTypes.number,
  selectedAddons: PropTypes.array,
  setSelectedAddons: PropTypes.func.isRequired
};
