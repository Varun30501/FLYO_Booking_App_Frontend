// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { login } from '../services/auth';
import AuthModal from '../components/AuthModal';

export default function Login({ onAuthChange }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberAdmin, setRememberAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await login({ email, password, rememberAdmin });

      // Defensive: many auth helpers return { token, user } or { token, userId } or whole user object.
      // If login() returned a token / user info, persist it for SeatMap & other components.
      if (res && (res.token || res.accessToken || res.jwt)) {
        const token = res.token || res.accessToken || res.jwt;
        try {
          localStorage.setItem('jwt', token);
        } catch (e) { /* ignore storage errors */ }
      }

      // Try to persist a userId if present
      const candidateUserId =
        (res && (res.userId || res.id || res._id)) ||
        (res && res.user && (res.user.id || res.user._id || res.user.userId));
      if (candidateUserId) {
        try {
          localStorage.setItem('userId', String(candidateUserId));
        } catch (e) { /* ignore */ }
      }

      // If login returned entire user object, also persist a minimal JSON for later
      if (res && res.user && typeof res.user === 'object') {
        try {
          localStorage.setItem('user', JSON.stringify(res.user));
        } catch (e) { /* ignore */ }
      }

      if (onAuthChange) onAuthChange();
      navigate(next);
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || 'Login error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthModal open={true} onClose={() => navigate('/')} title="Welcome" bgImage="/hero-bg.png">
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
        <div>
          <label className="text-sm text-slate-200">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full p-3 rounded-md dark-input placeholder:text-slate-400"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="text-sm text-slate-200">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full p-3 rounded-md dark-input placeholder:text-slate-400"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={rememberAdmin}
              onChange={(e) => setRememberAdmin(e.target.checked)}
              className="accent-indigo-400"
            />
            <span>Remember me on this device</span>
          </label>
          <Link to="/forgot-password" className="text-indigo-200 hover:underline">Forgot?</Link>
        </div>

        {err && <div className="text-sm text-red-400">{String(err)}</div>}

        <div className="pt-2">
          <button type="submit" disabled={loading} className="w-full btn-accent py-3 rounded-md font-semibold">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <div className="text-center text-sm text-slate-300 pt-4">Or continue with</div>

        <div className="flex gap-3 justify-center pt-3">
          <button type="button" className="p-3 rounded-full bg-white/8" aria-label="Sign in with Google">
            <img src="/google.svg" alt="G" className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-400 text-center pt-4">By signing in you agree to our Terms & Privacy.</div>

        <div className="mt-6 text-center">
          <span className="text-slate-300">New here? </span>
          <Link to="/register" className="text-indigo-300 font-semibold hover:underline">Create an account</Link>
        </div>
      </form>
    </AuthModal>
  );
}
