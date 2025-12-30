// src/components/LoadingBlock.jsx
import React from 'react';

export default function LoadingBlock({ text = 'Loading…' }) {
  return (
    <div className="p-6 flex items-center justify-center text-slate-300">
      <div className="flex items-center gap-3">
        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  );
}
