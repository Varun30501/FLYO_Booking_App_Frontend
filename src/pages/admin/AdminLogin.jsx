// src/pages/admin/AdminLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post, get } from '../../services/api';
import { saveToken as saveTokenLocal, saveUser as saveUserLocal } from '../../services/auth';

/**
 * persistCredentials
 * - if remember === true -> save to localStorage via app helpers
 * - else -> save token/user to sessionStorage (so closing browser clears it)
 */
function persistCredentials({ token, user, remember }) {
  if (remember) {
    saveTokenLocal(token);
    if (user) saveUserLocal(user);
    return;
  }

  try {
    sessionStorage.setItem('fb_token', token);
    if (user) sessionStorage.setItem('fb_user', JSON.stringify(user));
  } catch (e) {
    // fallback to local if sessionStorage unavailable
    saveTokenLocal(token);
    if (user) saveUserLocal(user);
  }
}

/** helper to clear both storages quickly */
function clearCredentials() {
  try {
    localStorage.removeItem('fb_token'); localStorage.removeItem('fb_user');
  } catch (e) { /* ignore */ }
  try {
    sessionStorage.removeItem('fb_token'); sessionStorage.removeItem('fb_user');
  } catch (e) { /* ignore */ }
}

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // call login endpoint
      const loginRes = await post('/auth/login', { email, password });

      // post() wrapper may return the response data directly.
      const token = loginRes?.token || (loginRes?.data && loginRes.data.token);
      const possibleUser = loginRes?.user || (loginRes?.data && loginRes.data.user) || null;

      if (!token) {
        throw new Error('Login failed: no token returned from server');
      }

      // persist token now so subsequent /auth/me uses it
      persistCredentials({ token, user: possibleUser, remember });

      // Try to get the authoritative user object from /auth/me
      let user = possibleUser;
      try {
        const me = await get('/auth/me');
        // get() wrapper typically returns the data directly
        // me may be user object or { user: {...} }
        if (me && me._id) user = me;
        else if (me && me.user) user = me.user;
        else {
          // fallback - if me is empty, leave user as possibleUser
        }
      } catch (meErr) {
        // If /auth/me fails, attempt to use possibleUser (if present) else fail
        console.warn('[AdminLogin] /auth/me fetch failed', meErr);
      }

      // Validate admin flag
      const isAdmin = !!(user && (user.isAdmin || (user.role && String(user.role).toLowerCase() === 'admin')));
      if (!isAdmin) {
        // not admin -> clear stored credentials
        clearCredentials();
        setError('This account does not have admin privileges.');
        setLoading(false);
        return;
      }

      // Save the final user object (ensure it is present in storage)
      persistCredentials({ token, user, remember });

      localStorage.setItem('fb_is_admin', '1');

      // Navigate to reconciliation dashboard
      navigate('/admin/overview');
    } catch (err) {
      // Read server-friendly messages where possible
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || String(err);
      console.error('[AdminLogin] login error', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md panel-3d p-6">
        <h2 className="text-xl font-semibold mb-4">Admin sign in</h2>

        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="dark-input w-full p-3 rounded"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
          <input
            type="password"
            className="dark-input w-full p-3 rounded"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between">
            <label className="text-sm inline-flex items-center gap-2">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Remember me</span>
            </label>

            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-4 text-xs text-gray-400">
          Admin credentials are required to access the reconciliation dashboard.
        </div>
      </div>
    </div>
  );
}
