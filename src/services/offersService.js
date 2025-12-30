// src/services/offersService.js

/**
 * Offers service - small wrapper used by CouponsInput
 *
 * validateCode(payload) accepts either a string code or object { code, flightId?, seats?, date? }
 * listOffers() returns available offers
 */

export async function validateCode(payload) {
  const body = (typeof payload === 'string') ? { code: payload } : (payload || {});
  const res = await fetch('/api/offers/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return json;
}

export async function listOffers() {
  const res = await fetch('/api/offers');
  const json = await res.json();
  return json;
}
