// src/services/flightsService.js
import { get } from './api';

export async function searchFlights(q) {
  const params = new URLSearchParams(q || {}).toString();
  return await get(`/flights/search?${params}`);
}

export async function getFlight(id) {
  return get(`/flights/${id}`);
}
