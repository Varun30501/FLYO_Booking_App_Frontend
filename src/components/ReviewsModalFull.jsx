// src/components/ReviewsModalFull.jsx
import React, { useMemo, useState, useEffect } from "react";

/**
 * ReviewsModalFull
 * Props:
 *  - open: boolean
 *  - reviews: array of { id, name, rating, text, date? }
 *  - onClose: function
 *
 * Features:
 *  - Filter by rating (All / 5 → 1)
 *  - Clickable histogram (rating distribution)
 *  - Scrollable list
 *  - Dark theme, panel-3d like styles
 */

export default function ReviewsModalFull({ open, reviews = [], onClose }) {
  const [filter, setFilter] = useState("all"); // 'all' or 5..1
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  // reset pagination & search when opening/closing or changing filter
  useEffect(() => {
    setPage(0);
    setSearch("");
  }, [open, filter]);

  const counts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (Array.isArray(reviews) ? reviews : []).forEach((r) => {
      const k = Math.min(5, Math.max(1, Number(r.rating) || 0));
      if (k >= 1 && k <= 5) c[k] += 1;
    });
    c.total = Object.values(c).reduce((s, v) => s + v, 0);
    return c;
  }, [reviews]);

  const filtered = useMemo(() => {
    let list = Array.isArray(reviews) ? reviews.slice() : [];
    if (filter !== "all") list = list.filter((r) => Number(r.rating) === Number(filter));
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.text || "").toLowerCase().includes(q)
      );
    }
    // sort newest first if date available, else keep original order
    list.sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });
    return list;
  }, [reviews, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSlice = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div
        className="max-w-4xl w-full max-h-[90vh] bg-[#071024] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div>
            <h3 className="text-lg font-semibold text-white">Reviews</h3>
            <div className="text-xs text-slate-400">
              {counts.total} reviews • Avg. {counts.total ? ((5 * counts[5] + 4 * counts[4] + 3 * counts[3] + 2 * counts[2] + 1 * counts[1]) / counts.total).toFixed(1) : "—"} ★
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              placeholder="Search reviews"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="px-3 py-2 rounded bg-white/5 text-white placeholder:text-slate-400 border border-white/8 focus:outline-none"
              style={{ minWidth: 180 }}
            />
            <button onClick={onClose} className="px-3 py-2 rounded bg-white/6 text-white">Close</button>
          </div>
        </div>

        {/* Content: left=histogram+filters, right=reviews list */}
        <div className="flex gap-4">
          {/* Left column: histogram & filters */}
          <div className="w-48 p-4 border-r border-white/6">
            <div className="text-sm text-slate-300 mb-3">Filter by rating</div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 mb-4">
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All ({counts.total})</FilterButton>
              {[5, 4, 3, 2, 1].map((r) => (
                <FilterButton key={r} active={String(filter) === String(r)} onClick={() => setFilter(r)}>
                  <div className="flex items-center justify-between w-full">
                    <div className="text-sm">{r} ★</div>
                    <div className="text-xs text-slate-400">{counts[r] || 0}</div>
                  </div>
                </FilterButton>
              ))}
            </div>

            {/* Histogram (clickable bars) */}
            <div>
              <div className="text-sm text-slate-300 mb-2">Rating distribution</div>
              <RatingHistogram counts={counts} onBarClick={(r) => setFilter(r)} active={filter} />
            </div>
          </div>

          {/* Right column: reviews list */}
          <div className="flex-1 p-4 overflow-y-auto max-h-[65vh]">
            <div className="space-y-3">
              {pageSlice.length === 0 && (
                <div className="text-center text-slate-400 py-12">No reviews found for selected filter.</div>
              )}

              {pageSlice.map((r, i) => (
                <div key={r.id || `${r.name}-${i}`} className="panel-3d p-4 border border-white/6">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold">
                      {(r.name || "U").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{r.name || "Traveller"}</div>
                          <div className="text-xs text-slate-400">{r.date ? new Date(r.date).toLocaleDateString() : ""}</div>
                        </div>
                        <div className="text-yellow-300">{Array(Math.max(1, Math.min(5, Number(r.rating) || 5))).fill('★').join('')}</div>
                      </div>

                      <div className="mt-2 text-sm text-gray-300">{r.text}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Showing {Math.min(filtered.length, page * PAGE_SIZE + 1)}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1 rounded bg-white/6 text-white disabled:opacity-40"
                >
                  Prev
                </button>
                <div className="text-sm text-slate-300 px-2">{page + 1}/{totalPages}</div>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="px-3 py-1 rounded bg-white/6 text-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ---------------------------
   Helper UI components
   --------------------------- */

function FilterButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded ${active ? "bg-cyan-500/10 text-cyan-300 border border-cyan-300/20" : "bg-white/5 text-white border border-white/10"} hover:opacity-95`}
    >
      {children}
    </button>
  );
}

function RatingHistogram({ counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 }, onBarClick = () => { }, active }) {
  const arr = [5, 4, 3, 2, 1];
  const maxCount = Math.max(...arr.map(i => counts[i] || 0), 1);

  return (
    <div className="space-y-2">
      {arr.map((r) => {
        const value = counts[r] || 0;
        const pct = Math.round((value / Math.max(1, maxCount)) * 100);
        const isActive = String(active) === String(r);
        return (
          <button
            key={r}
            onClick={() => onBarClick(r)}
            className="w-full flex items-center gap-3"
          >
            <div className="w-8 text-sm text-slate-300">{r}★</div>
            <div className="flex-1 h-4 bg-white/6 rounded overflow-hidden">
              <div
                style={{ width: `${pct}%` }}
                className={`h-full ${isActive ? "bg-cyan-400" : "bg-white/40"} transition-all`}
              />
            </div>
            <div className="w-8 text-xs text-slate-400 text-right">{value}</div>
          </button>
        );
      })}
    </div>
  );
}
