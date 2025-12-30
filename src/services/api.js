// src/services/api.js
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const client = axios.create({
  baseURL: BASE,
  withCredentials: false,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' }
});

client.interceptors.request.use((cfg) => {
  try {
    const token =
      localStorage.getItem('jwt') ||
      localStorage.getItem('fb_token') ||
      sessionStorage.getItem('fb_token') ||
      null;

    cfg.headers = cfg.headers || {};
    if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
    // DEBUG: show final URL (base + url)
    // NOTE: remove or comment out in production
    // eslint-disable-next-line no-console
    console.debug('[api] Request:', (cfg.baseURL || BASE) + (cfg.url || ''));
  } catch (e) {
    // swallow
  }
  return cfg;
}, (err) => Promise.reject(err));

client.interceptors.response.use((r) => r, (err) => {
  try {
    if (err && err.response && err.response.status === 401) {
      localStorage.removeItem('jwt');
    }
  } catch (e) { }
  return Promise.reject(err);
});

export function apiBase() { return BASE; }

async function normalizeResponse(res) {
  // res is axios response (we return res.data from each wrapper),
  // but callers expect either an array or the actual payload.
  // `data` may be [] or { flights: [...] } or { data: [...] } or { payload: { flights: [...] } }
  if (res == null) return null;
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.flights)) return res.flights;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.payload?.flights)) return res.payload.flights;
  // otherwise return res as-is (object or primitive)
  return res;
}

export async function get(path, config = {}) {
  const p = path.startsWith('/') ? path : `/${path}`;
  // DEBUG: show exact URL we will call
  // eslint-disable-next-line no-console
  console.debug('[api] GET ->', BASE + p);
  const res = await client.get(p, { ...config, headers: { ...(config.headers || {}) } });
  // eslint-disable-next-line no-console
  console.debug('[api] GET response.data ->', res.data);
  return normalizeResponse(res.data);
}

export async function post(path, body = {}, config = {}) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const res = await client.post(p, body, { ...config, headers: { ...(config.headers || {}) } });
  return res.data;
}
export async function put(path, body = {}, config = {}) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const res = await client.put(p, body, { ...config, headers: { ...(config.headers || {}) } });
  return res.data;
}
export async function del(path, config = {}) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const res = await client.delete(p, { ...config, headers: { ...(config.headers || {}) } });
  return res.data;
}

export async function patch(path, body = {}, config = {}) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const res = await client.patch(p, body, {
    ...config,
    headers: { ...(config.headers || {}) }
  });
  return res.data;
}



export default client;
