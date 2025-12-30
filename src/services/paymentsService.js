// src/services/paymentsService.js
import { post } from "./api";
import { v4 as uuidv4 } from "uuid";

/**
 * Refund a booking / payment
 * body: { bookingIdentifier, amount, restoreInventory, reason, paymentIntent, chargeId }
 * returns server response
 */
export async function refundPayment(body = {}, opts = {}) {
  // ensure idempotency: fresh per attempt derived from client
  const idempotencyKey = opts.idempotencyKey || `client-refund-${uuidv4()}`;
  const headers = { "Idempotency-Key": idempotencyKey };
  // post helper should attach Authorization automatically if available
  return post("/payments/refund", body, { headers });
}
