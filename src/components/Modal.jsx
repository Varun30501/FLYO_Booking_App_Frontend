// src/components/Modal.jsx
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

/**
 * Modal
 * Props:
 *  - open (bool)
 *  - onClose (fn)
 *  - title (string | node)
 *  - children (node)
 *  - className (string) optional additional classes for modal container
 *  - size (string) optional: 'md'|'lg'|'xl' (controls maxWidth)
 *
 * Usage: replace previous Modal with this file. Default is wide layout optimized for seatmap.
 */

export default function Modal({ open, onClose, title, children, className = '', size = 'xl' }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  // size mapping
  const sizeMap = {
    md: 'max-w-4xl',     // ~48rem
    lg: 'max-w-5xl',     // ~64rem
    xl: 'max-w-[1200px]' // custom larger option (~1200px)
  };
  const sizeClass = sizeMap[size] || sizeMap.xl;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/60 p-6"
      onMouseDown={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`mt-6 w-[95vw] ${sizeClass} bg-[linear-gradient(180deg,rgba(12,16,28,0.98),rgba(8,10,20,0.98))] text-white rounded-xl shadow-2xl p-0 mx-2 border border-white/6 ${className}`}
        style={{ backdropFilter: 'blur(6px)', minHeight: '60vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* header */}
        <div className="flex items-center justify-between p-6 border-b border-white/6">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-300 hover:text-white text-2xl leading-none px-2">✕</button>
        </div>

        {/* body (scrollable) */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>

        {/* footer placeholder (optional) */}
        <div className="border-t border-white/6 p-4 flex items-center justify-end gap-3">
          {/* If you want default buttons here, add them. We leave footer empty so pages/components inside modal can render their own actions */}
        </div>
      </div>
    </div>,
    document.body
  );
}
