// src/services/addons.js
export async function fetchAddons({ airline = null, category = null } = {}) {
  const qs = [];
  if (airline) qs.push(`airline=${encodeURIComponent(airline)}`);
  if (category) qs.push(`category=${encodeURIComponent(category)}`);
  const url = `/api/addons${qs.length ? ('?' + qs.join('&')) : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed fetching addons');
  const body = await res.json();
  if (!body.success) throw new Error(body.message || 'error');
  return body.addons || [];
}
