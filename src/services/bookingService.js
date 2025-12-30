// src/services/bookingService.js
import { post } from './api';

export async function createBooking(payload, idempotencyKey = null) {
  const headers = {};
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  return post('/bookings', payload, { headers });
}
