// src/services/auth.js
import api, { post, get, apiBase } from './api';

// token key used across the app
const USER_TOKEN_KEY = 'fb_token';
const USER_KEY = 'fb_user';

const TOKEN_KEY = USER_TOKEN_KEY;
const ADMIN_KEY = 'fb_is_admin';

/** Internal: notify other tabs/components that auth changed */
function _notifyAuthChange() {
    try {
        window.dispatchEvent(new Event('storage'));
    } catch (e) {
        // ignore in non-browser env
    }
}

// 🔧 PATCH: missing helper used by logout()
function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('jwt');
  } catch (e) {}
}


/** Token helpers */
export function saveToken(token) {
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
    _notifyAuthChange();
}
export const setToken = saveToken; // alias

// ---------- USER AUTH ----------
export function getUserToken() {
  return (
    localStorage.getItem('jwt') ||
    localStorage.getItem(USER_TOKEN_KEY)
  );
}

export function clearUserAuth() {
  localStorage.removeItem('jwt');
  localStorage.removeItem(TOKEN_KEY);
}

// ---------- ADMIN AUTH ----------
export function getAdminToken() {
  return (
    localStorage.getItem(ADMIN_KEY) ||
    sessionStorage.getItem(ADMIN_KEY)
  );
}

export function clearAdminAuth() {
  localStorage.removeItem(ADMIN_KEY);
  sessionStorage.removeItem(ADMIN_KEY);
}


/** User helpers */
export function saveUser(user) {
    if (!user) return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    _notifyAuthChange();
}
export const setUser = saveUser; // Expose setUser (alias)

export function getUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
        return null;
    }
}

export function clearUser() {
    localStorage.removeItem(USER_KEY);
    _notifyAuthChange();
}

/** Admin flag helpers (stored locally for UI gating) */
export function setAdminFlag(val = false) {
    try {
        localStorage.setItem(ADMIN_KEY, val ? '1' : '0');
        _notifyAuthChange();
    } catch (e) { /* noop */ }
}
export function getAdminFlag() {
    return localStorage.getItem(ADMIN_KEY) === '1';
}

/** Convenience: logout */
export function logout() {
    clearToken();
    clearUser();
    setAdminFlag(false);
    _notifyAuthChange();
}

/** Quick helper: returns true if currently logged-in user looks like admin.
 * This checks:
 *  1) stored user object `user.isAdmin` or `user.roles` includes 'admin'
 *  2) OR admin flag persisted (setAdminFlag) — useful for dev/testing
 */
export function isAdmin() {
    const u = getUser();
    if (u) {
        if (u.isAdmin) return true;
        if (Array.isArray(u.roles) && u.roles.includes('admin')) return true;
    }
    return getAdminFlag();
}

/** Auth actions using backend helpers
 *  login(payload) now accepts (email, password, rememberAdmin=false)
 */
// login expects backend returns { token, user? }
export async function login({ email, password, rememberAdmin = false } = {}) {
    const res = await post('/auth/login', { email, password });
    if (res?.token) {
        saveToken(res.token);
        if (res.user) {
            saveUser(res.user);
            // persist admin flag from backend user object, or honor rememberAdmin
            if (res.user.isAdmin || (Array.isArray(res.user.roles) && res.user.roles.includes('admin'))) {
                setAdminFlag(true);
            } else {
                setAdminFlag(!!rememberAdmin);
            }
        } else {
            // no user returned; honor rememberAdmin if true (dev)
            setAdminFlag(!!rememberAdmin);
        }
        _notifyAuthChange();
    }
    return res;
}

/**
 * register(payload, rememberAdmin=false)
 * payload should include name,email,password etc.
 */
export async function register(payload = {}, rememberAdmin = false) {
    const res = await post('/auth/register', payload);
    if (res?.token) {
        saveToken(res.token);
        if (res.user) {
            saveUser(res.user);
            if (res.user.isAdmin || (Array.isArray(res.user.roles) && res.user.roles.includes('admin'))) {
                setAdminFlag(true);
            } else {
                setAdminFlag(!!rememberAdmin);
            }
        } else {
            setAdminFlag(!!rememberAdmin);
        }
        _notifyAuthChange();
    }
    return res;
}

export async function forgotPassword(email) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) throw new Error('Email is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Enter a valid email address');
  }
  const res = await post('/auth/forgot-password', { email: normalized });
  return res;
}

export function clearAuth() {
  try {
    localStorage.removeItem('fb_token');
    localStorage.removeItem('fb_user');
  } catch (e) {}

  try {
    sessionStorage.removeItem('fb_token');
    sessionStorage.removeItem('fb_user');
  } catch (e) {}
}

// 🔧 PATCH: admin-only logout (used by AdminLayout)
export function adminLogout() {
  try {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ADMIN_KEY);
  } catch (e) {}

  try {
    sessionStorage.removeItem(USER_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ADMIN_KEY);
  } catch (e) {}

  _notifyAuthChange();
}

export const getToken = getUserToken;