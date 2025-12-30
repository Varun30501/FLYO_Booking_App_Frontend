// src/components/ReviewsSection.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import ReviewsModalFull from "./ReviewsModalFull";
import { post } from "../services/api";

export default function ReviewsSection({ reviews = [] }) {
  const [openFull, setOpenFull] = useState(false);
  const [writeMode, setWriteMode] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const preview = reviews.slice(0, 4);

  const count = reviews.length;
  const avg =
    count > 0
      ? (
          reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count
        ).toFixed(1)
      : "—";

  async function submitReview(e) {
    e.preventDefault();
    if (!text.trim()) return alert("Please write a review");

    setSubmitting(true);
    try {
      await post("/reviews", { name, rating, text });
      window.location.reload(); // simple + reliable refresh
    } catch (err) {
      alert("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="panel-3d p-6 bg-white/5 mb-10 mt-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg text-white">User Ratings & Reviews</h3>
            <div className="text-sm text-slate-400">
              {count} reviews • {avg} ★ avg
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setWriteMode((v) => !v)}
              className="btn-accent px-4 py-2 text-sm"
            >
              {writeMode ? "Cancel" : "Write a review"}
            </button>

            <button
              onClick={() => setOpenFull(true)}
              className="px-4 py-2 rounded bg-white/10 text-white text-sm hover:bg-white/20"
            >
              View all
            </button>
          </div>
        </div>

        {/* WRITE REVIEW */}
        {writeMode && (
          <form
            onSubmit={submitReview}
            className="panel-3d p-4 space-y-3 bg-white/3"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="dark-input p-2 w-full"
            />

            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="dark-input p-2 w-full"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} ★
                </option>
              ))}
            </select>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your experience"
              className="dark-input p-2 w-full"
              rows={3}
            />

            <button
              disabled={submitting}
              className="btn-accent px-4 py-2"
            >
              {submitting ? "Submitting…" : "Submit review"}
            </button>
          </form>
        )}

        {/* PREVIEW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {preview.map((r, i) => (
            <motion.div
              key={r._id || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-gradient-to-b from-white/10 to-white/5 p-5 border border-white/10 shadow-xl"
            >
              <ReviewCard review={r} />
            </motion.div>
          ))}
        </div>
      </div>

      <ReviewsModalFull
        open={openFull}
        reviews={reviews}
        onClose={() => setOpenFull(false)}
      />
    </>
  );
}

function ReviewCard({ review }) {
  const name = review.name || "Traveller";
  const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div>
      <div className="flex items-start gap-3 mb-2">
        <div className="h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center font-semibold">
          {initials}
        </div>
        <div>
          <div className="font-semibold text-white">{name}</div>
          <div className="text-yellow-300 text-sm">
            {"★".repeat(rating)}
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-300 line-clamp-4">
        {review.text}
      </div>
    </div>
  );
}
