// src/components/AdminRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * AdminRoute wrapper:
 * - Checks for token & user in localStorage or sessionStorage
 * - Expects stored user object to have isAdmin or role === 'admin'
 * - If condition fails, redirect to /admin/login
 */
function loadStoredUser() {
  let user = null;
  try {
    const rawLocal = localStorage.getItem('fb_user');
    if (rawLocal) user = JSON.parse(rawLocal);
    else {
      const rawSession = sessionStorage.getItem('fb_user');
      if (rawSession) user = JSON.parse(rawSession);
    }
  } catch (e) {
    user = null;
  }
  return user;
}

function loadStoredToken() {
  return localStorage.getItem('fb_token') || sessionStorage.getItem('fb_token') || null;
}

export default function AdminRoute({ children }) {
  const token = loadStoredToken();
  const user = loadStoredUser();

  if (!token || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!(user.isAdmin || user.role === 'admin')) {
    // not an admin -> clear token + user and redirect
    try { localStorage.removeItem('fb_token'); localStorage.removeItem('fb_user'); } catch {}
    try { sessionStorage.removeItem('fb_token'); sessionStorage.removeItem('fb_user'); } catch {}
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
