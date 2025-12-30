import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { post } from '../services/api';
import AuthModal from '../components/AuthModal';

function normalizeToken(raw) {
  if (!raw && raw !== '') return '';
  try {
    let t = String(raw || '').trim();
    if (t.startsWith('#')) {
      const m = t.match(/(?:#|&)?token=([^&]+)/);
      if (m) t = m[1];
    }
    if (t.indexOf(' ') >= 0) t = t.replace(/\s+/g, '+');
    try { t = decodeURIComponent(t); } catch (e) { /* keep original */ }
    return t;
  } catch (e) {
    return String(raw || '');
  }
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const fragment = location.hash || '';
  const tokenFromQuery = searchParams.get('token') || '';
  const tokenFromFragmentMatch = (fragment && fragment.includes('token=')) ? (fragment.match(/token=([^&]+)/) || [])[1] : '';
  const initialToken = paramToken || tokenFromQuery || tokenFromFragmentMatch || '';

  const [token, setToken] = useState(normalizeToken(initialToken || ''));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const manualTokenRef = useRef(null);

  useEffect(() => {
    const t = normalizeToken(paramToken || tokenFromQuery || tokenFromFragmentMatch || '');
    setToken(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramToken, tokenFromQuery, tokenFromFragmentMatch]);

  useEffect(() => {
    if (!token) {
      setErr('Invalid or missing reset token. Paste the token below or check the link in your email.');
    } else {
      setErr(null);
    }
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    setSuccessMsg(null);

    const finalToken = normalizeToken(token || '');
    if (!finalToken) return setErr('Missing token. Please paste the token from the email.');

    if (!password || password.length < 6) return setErr('Password must be at least 6 characters');
    if (password !== confirm) return setErr('Passwords do not match');

    setLoading(true);
    try {
      const url = `/auth/reset-password/${encodeURIComponent(finalToken)}`;
      await post(url, { password, token: finalToken });

      setSuccessMsg('Password reset successful — redirecting to login...');
      setTimeout(() => navigate('/login'), 900);
    } catch (ex) {
      const message = ex?.response?.data?.message || ex?.response?.data?.error || ex?.message || 'Failed to reset password';
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthModal open={true} onClose={() => navigate('/')} title="Set a new password" subtitle="Choose a strong password to secure your account" bgImage="/hero-bg.png">
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        {!token && (
          <div>
            <label className="text-sm text-slate-200">Reset token (paste from email)</label>
            <input
              ref={manualTokenRef}
              value={token}
              onChange={(e) => setToken(normalizeToken(e.target.value))}
              className="mt-1 w-full p-3 rounded-md dark-input placeholder:text-slate-400"
              placeholder="Paste reset token or full link here"
              autoFocus
            />
            <div className="text-xs text-slate-400 mt-1">If your link didn't open automatically, copy the token from the email and paste it here.</div>
          </div>
        )}

        <div>
          <label className="text-sm text-slate-200">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 w-full p-3 rounded-md dark-input placeholder:text-slate-400"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label className="text-sm text-slate-200">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            className="mt-1 w-full p-3 rounded-md dark-input placeholder:text-slate-400"
            placeholder="Repeat your password"
          />
        </div>

        {err && <div className="text-sm text-red-400">{String(err)}</div>}
        {successMsg && <div className="text-sm text-green-400">{successMsg}</div>}

        <div className="pt-2">
          <button type="submit" disabled={loading} className="w-full btn-accent py-3 rounded-md font-semibold">
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </div>

        <div className="text-center text-sm text-slate-300 pt-2">Or continue with</div>

        <div className="flex gap-3 justify-center pt-3">
          <button type="button" className="p-3 rounded-full bg-white/8" aria-label="Sign in with Google">
            <img src="/icons/google.svg" alt="G" className="w-5 h-5" />
          </button>
          <button type="button" className="p-3 rounded-full bg-white/8" aria-label="Sign in with Email">
            <img src="/icons/mail.svg" alt="E" className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 text-center">
          <span className="text-slate-300">Need help? </span>
          <a onClick={() => navigate('/forgot-password')} className="text-indigo-300 font-semibold hover:underline cursor-pointer">Resend link</a>
        </div>

        <div className="text-xs text-slate-400 text-center pt-4">After updating you'll be redirected to the login page.</div>
      </form>
    </AuthModal>
  );
}
