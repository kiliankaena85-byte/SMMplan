import { jwtVerify } from 'jose';

let cachedEncodedKey: Uint8Array | null = null;

export function getEncodedKey() {
  if (cachedEncodedKey) return cachedEncodedKey;
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is not set. ' +
      'This is required for session security. Add it to your .env file.'
    );
  }
  cachedEncodedKey = new TextEncoder().encode(process.env.JWT_SECRET);
  return cachedEncodedKey;
}

import { normalizeTenantId } from '@/lib/tenant-resolver';

/**
 * Decrypts JWT session token in an Edge-safe manner (no DB calls).
 */
export async function decryptSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), {
      algorithms: ['HS256'],
    });
    const parsed = payload as { sessionId: string; userId: string; role: string; tenantId: string; canResetPassword?: boolean };
    if (parsed && parsed.tenantId) {
      parsed.tenantId = normalizeTenantId(parsed.tenantId);
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message.includes('FATAL:')) {
      console.error(error.message);
    }
    return null;
  }
}
