import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getUser, setUser } from '../services/auth';

/* ---------------------------
   Helpers
--------------------------- */

function normalizeUser(u) {
  return {
    name: u?.name || '',
    email: u?.email || '',
    phone: u?.phone || '',
    profile: {
      title: u?.profile?.title || '',
      firstName: u?.profile?.firstName || '',
      lastName: u?.profile?.lastName || '',
      dob: u?.profile?.dob || '',
      nationality: u?.profile?.nationality || '',
      documentType: u?.profile?.documentType || '',
      documentNumber: u?.profile?.documentNumber || '',
      address: u?.profile?.address || ''
    }
  };
}

function calculateAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function maskDocument(value = '') {
  if (!value) return '';
  if (value.length <= 4) return value;
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

/* ---------------------------
   Component
--------------------------- */

export default function Profile() {
  const stored = getUser();
  const [user, setLocalUser] = useState(normalizeUser(stored));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stored) {
      (async () => {
        try {
          const data = await api.get('/auth/me');
          const u = data.user || data;
          setLocalUser(normalizeUser(u));
          setUser(u);
        } catch (err) {
          console.error('fetch profile', err);
        }
      })();
    }
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/me', user);
      const savedUser = res.user || res;
      setUser(savedUser);
      setLocalUser(normalizeUser(savedUser));
      alert('Profile updated');
    } catch (err) {
      console.error('update profile', err);
      alert(err.response?.data?.message || err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  const age = calculateAge(user.profile.dob);

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Profile</h2>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Display Name */}
        <Field label="Display Name">
          <input
            value={user.name}
            onChange={e => setLocalUser(p => ({ ...p, name: e.target.value }))}
            className="dark-input p-3 rounded-md w-full"
          />
        </Field>

        {/* Email */}
        <Field label="Email">
          <input
            value={user.email}
            disabled
            className="dark-input p-3 rounded-md w-full opacity-70"
          />
        </Field>

        {/* Phone */}
        <Field label="Phone Number">
          <input
            value={user.phone}
            onChange={e => setLocalUser(p => ({ ...p, phone: e.target.value }))}
            className="dark-input p-3 rounded-md w-full"
          />
        </Field>

        {/* Passenger Name */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name">
            <input
              value={user.profile.firstName}
              onChange={e =>
                setLocalUser(p => ({
                  ...p,
                  profile: { ...p.profile, firstName: e.target.value }
                }))
              }
              className="dark-input p-3 rounded-md w-full"
            />
          </Field>

          <Field label="Last Name">
            <input
              value={user.profile.lastName}
              onChange={e =>
                setLocalUser(p => ({
                  ...p,
                  profile: { ...p.profile, lastName: e.target.value }
                }))
              }
              className="dark-input p-3 rounded-md w-full"
            />
          </Field>
        </div>

        {/* DOB */}
        <Field label="Date of Birth">
          <input
            type="date"
            value={
              user.profile.dob
                ? new Date(user.profile.dob).toISOString().slice(0, 10)
                : ''
            }
            onChange={e =>
              setLocalUser(p => ({
                ...p,
                profile: { ...p.profile, dob: e.target.value }
              }))
            }
            className="dark-input p-3 rounded-md w-full"
          />
          {age !== '' && (
            <div className="text-sm text-slate-300 mt-1">
              Age: <span className="font-medium">{age} years</span>
            </div>
          )}
        </Field>

        {/* Nationality */}
        <Field label="Nationality">
          <input
            value={user.profile.nationality}
            onChange={e =>
              setLocalUser(p => ({
                ...p,
                profile: { ...p.profile, nationality: e.target.value }
              }))
            }
            className="dark-input p-3 rounded-md w-full"
          />
        </Field>

        {/* Document Type */}
        <Field label="ID Document Type">
          <select
            value={user.profile.documentType}
            onChange={e =>
              setLocalUser(p => ({
                ...p,
                profile: { ...p.profile, documentType: e.target.value }
              }))
            }
            className="dark-input p-3 rounded-md w-full"
          >
            <option value="">Select document</option>
            <option value="passport">Passport</option>
            <option value="aadhaar">Aadhaar</option>
          </select>
        </Field>

        {/* Document Number */}
        <Field label="Document Number">
          <input
            value={user.profile.documentNumber}
            onChange={e =>
              setLocalUser(p => ({
                ...p,
                profile: { ...p.profile, documentNumber: e.target.value }
              }))
            }
            className="dark-input p-3 rounded-md w-full"
          />
          {user.profile.documentNumber && (
            <div className="text-xs text-slate-400 mt-1">
              Saved as: {maskDocument(user.profile.documentNumber)}
            </div>
          )}
        </Field>

        {/* Address */}
        <Field label="Address">
          <textarea
            value={user.profile.address}
            onChange={e =>
              setLocalUser(p => ({
                ...p,
                profile: { ...p.profile, address: e.target.value }
              }))
            }
            className="dark-input p-3 rounded-md w-full"
            rows={3}
          />
        </Field>

        <button
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded w-full"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}

/* ---------------------------
   Reusable Field Wrapper
--------------------------- */

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-slate-400">{label}</label>
      {children}
    </div>
  );
}
