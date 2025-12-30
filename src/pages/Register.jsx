// src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as apiRegister } from '../services/auth';
import AuthModal from '../components/AuthModal';

export default function Register({ onAuthChange }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await apiRegister({ name, email, password });
      if (res && res.token) {
        if (onAuthChange) onAuthChange();
        setSuccessMsg('Registered — redirecting...');
        setTimeout(() => navigate('/dashboard'), 600);
      } else {
        setErr(res?.message || 'Registration failed');
      }
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthModal open={true} onClose={() => navigate('/')} title="Create your account" subtitle="Sign up to start booking flights" bgImage="/hero-bg.png">
      <div className="animate-fadeUp w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
          <div>
            <label className="text-sm text-slate-200">Full name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full p-3 rounded-md dark-input placeholder:text-slate-400" placeholder="Your name" />
          </div>

          <div>
            <label className="text-sm text-slate-200">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full p-3 rounded-md dark-input placeholder:text-slate-400" placeholder="you@example.com" />
          </div>

          <div>
            <label className="text-sm text-slate-200">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1 w-full p-3 rounded-md dark-input placeholder:text-slate-400" placeholder="Choose a secure password" />
          </div>

          {err && <div className="text-sm text-red-400">{String(err)}</div>}
          {successMsg && <div className="text-sm text-green-400">{successMsg}</div>}

          <div className="pt-2">
            <button type="submit" disabled={loading} className="w-full btn-accent py-3 rounded-md font-semibold">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <span className="text-slate-300">Already have an account </span>
            <Link to="/login" className="text-indigo-300 font-semibold hover:underline">Sign In</Link>
          </div>

          <div className="text-xs text-slate-400 text-center pt-4">By creating an account you agree to our Terms & Privacy.</div>
        </form>
      </div>
    </AuthModal>
  );
}
