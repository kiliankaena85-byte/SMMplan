/**
 * src/lib/order-token.ts
 *
 * Cryptographic Capability Tokens for Secure Guest Order Tracking (OWASP ASVS v4.0.3 Level 2).
 * Allows customers to track their paid order without exposing the full user account,
 * preventing Account Takeover (ATO) exploits via cross-account payment.
 */

import crypto from 'crypto';

const ORDER_TOKEN_SALT = process.env.ORDER_TOKEN_SECRET || process.env.SESSION_SECRET || 'smmplan-guest-order-token-salt-2026';

/**
 * Generates a tamper-proof capability token for a specific order.
 */
export function generateGuestOrderToken(orderId: string, numericId: number): string {
  const payload = `order:${orderId}:${numericId}`;
  return crypto
    .createHmac('sha256', ORDER_TOKEN_SALT)
    .update(payload)
    .digest('hex');
}

/**
 * Verifies that the provided token matches the expected HMAC for this order.
 * Uses timingSafeEqual to prevent side-channel timing attacks.
 */
export function verifyGuestOrderToken(orderId: string, numericId: number, token: string): boolean {
  if (!token || typeof token !== 'string') return false;

  try {
    const expected = generateGuestOrderToken(orderId, numericId);
    const tokenBuf = Buffer.from(token, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');

    if (tokenBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}
