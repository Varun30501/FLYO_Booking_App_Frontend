// src/components/ErrorBanner.jsx
import React from 'react';

export default function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="mb-4 p-3 rounded bg-red-600/90 text-white text-sm">
      {message}
    </div>
  );
}
