import { jwtVerify } from 'jose';
import { normalizeTenantId, type ContourId } from '@/lib/tenant-resolver-edge';

let cachedEncodedKey: Uint8Array | null = null;
let cachedPreviousKeys: Uint8Array[] | null = null;

export function getEncodedKey(): Uint8Array {
  if (cachedEncodedKey) return cachedEncodedKey;
  const secret = process.env.JWT_SIGNING_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is not set. ' +
      'This is required for session security. Add it to your .env file.'
    );
  }
  cachedEncodedKey = new TextEncoder().encode(secret);
  return cachedEncodedKey;
}

export function getVerificationKeys(): Uint8Array[] {
  const primary = getEncodedKey();
  if (cachedPreviousKeys) return [primary, ...cachedPreviousKeys];

  const prevEnv = process.env.JWT_VERIFY_PREVIOUS_KEYS;
  if (prevEnv) {
    cachedPreviousKeys = prevEnv
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .map((k) => new TextEncoder().encode(k));
  } else {
    cachedPreviousKeys = [];
  }

  return [primary, ...cachedPreviousKeys];
}

/**
 * Decrypts JWT session token in an Edge-safe manner (supporting dual-key verification).
 */
export async function decryptSessionToken(token: string) {
  const keys = getVerificationKeys();

  for (const key of keys) {
    try {
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['HS256'],
      });
      const parsed = payload as { 
        sessionId: string; 
        userId: string; 
        role: string; 
        tenantId: string; 
        contour?: ContourId;
        canResetPassword?: boolean;
        sessionVer?: number;
      };
      if (parsed && parsed.tenantId) {
        parsed.tenantId = normalizeTenantId(parsed.tenantId);
      }
      return parsed;
    } catch {
      // Continue trying next key in verification chain
    }
  }

  return null;
}
