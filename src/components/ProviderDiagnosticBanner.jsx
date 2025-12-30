import React, { useState } from 'react';

/**
 * ProviderDiagnosticBanner
 * - `diagnostic`: any object/string returned from server describing upstream/provider issues
 * - `message`: optional short message override
 * - `variant`: 'warn'|'info' (changes color)
 */
export default function ProviderDiagnosticBanner({ diagnostic, message, variant = 'warn' }) {
  const [open, setOpen] = useState(false);

  if (!diagnostic) return null;

  const short = message || 'Live data temporarily unavailable — showing cached results';
  const bg = variant === 'warn' ? 'bg-amber-700/95' : 'bg-cyan-700/95';
  const border = variant === 'warn' ? 'border-amber-400' : 'border-cyan-400';

  // pretty-print for user debug (safe: non-sensitive)
  let pretty = '';
  try {
    pretty = typeof diagnostic === 'string' ? diagnostic : JSON.stringify(diagnostic, null, 2);
  } catch (e) {
    pretty = String(diagnostic);
  }

  return (
    <div className={`rounded p-3 mb-4 ${bg} text-black border ${border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-semibold">{short}</div>
          <div className="text-sm mt-1 text-black/80">We are showing fallback/cached results while the live provider is having issues.</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="px-2 py-1 text-xs rounded bg-black/10 hover:bg-black/12"
            aria-expanded={open}
          >
            {open ? 'Hide details' : 'Show details'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 bg-black/5 rounded p-2 text-xs overflow-auto max-h-44">
          <pre className="whitespace-pre-wrap text-[12px] leading-tight">{pretty}</pre>
        </div>
      )}
    </div>
  );
}
