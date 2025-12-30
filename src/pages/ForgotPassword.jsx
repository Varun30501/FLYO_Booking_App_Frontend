import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword } from '../services/auth';
import AuthModal from '../components/AuthModal';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    setSuccessMsg(null);

    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) return setErr('Email is required');

    setLoading(true);
    try {
      const res = await forgotPassword(normalized);
      setSuccessMsg('If that email exists, a reset link was sent (check inbox).');
      // dev preview optional
      if (res && res.resetUrl) {
        // eslint-disable-next-line no-console
        console.debug('[forgotPassword] preview resetUrl', res.resetUrl);
      }
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthModal open={true} onClose={() => navigate('/')} title="Reset your password" subtitle="Enter the email address to receive a reset link" bgImage="/hero-bg.png">
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <div>
          <label className="text-sm text-slate-200">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full p-3 rounded-md dark-input placeholder:text-slate-400"
            placeholder="you@example.com"
            autoFocus
          />
        </div>

        {err && <div className="text-sm text-red-400">{String(err)}</div>}
        {successMsg && <div className="text-sm text-green-400">{successMsg}</div>}

        <div className="pt-2">
          <button type="submit" disabled={loading} className="w-full btn-accent py-3 rounded-md font-semibold">
            {loading ? 'Sending…' : 'Send reset link'}
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
          <span className="text-slate-300">Remembered your password? </span>
          <Link to="/login" className="text-indigo-300 font-semibold hover:underline">Sign In</Link>
        </div>

        <div className="text-xs text-slate-400 text-center pt-4">If you don't see the email, check your spam folder or try again.</div>
      </form>
    </AuthModal>
  );
}
