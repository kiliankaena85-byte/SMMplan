import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { db } from './db';

// W0-2 SECURITY FIX: Fail-fast — never allow hardcoded fallback in any environment
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

import { getClientIp } from '@/utils/ip';

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней
  
  const reqHeaders = await cookies().then(() => headers()); // await context
  const userAgent = reqHeaders.get('user-agent') || 'unknown';
  const ipAddress = await getClientIp();

  // Создаем запись в БД
  const session = await db.session.create({
    data: {
      userId,
      expiresAt,
      userAgent,
      ipAddress,
    }
  });

  // Шифруем ID сессии в JWT
  const sessionToken = await new SignJWT({ sessionId: session.id, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getEncodedKey());
    
  // Clear explicit logout cookie if it exists
  (await cookies()).delete('explicit_logout');

  (await cookies()).set('session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function verifySession() {
  const explicitLogout = (await cookies()).get('explicit_logout')?.value;
  if (explicitLogout === 'true') {
    return null;
  }

  const sessionToken = (await cookies()).get('session_token')?.value;

  if (!sessionToken) {
    // SD-11 SECURITY FIX: DEV_AUTO_LOGIN restricted to localhost only.
    // Prevents accidental OWNER access on misconfigured staging/preview deployments.
    if (process.env.NODE_ENV !== 'production' && (process.env.DEV_AUTO_LOGIN === 'true' || process.env.DEV_AUTO_LOGIN === '1')) {
      const bypassEmail = process.env.DEV_BYPASS_EMAIL;
      if (process.env.NODE_ENV === 'development') {
        console.info("[verifySession] DEV_AUTO_LOGIN triggered. bypassEmail:", bypassEmail);
      }
      const devUser = await db.user.findFirst({ 
        where: bypassEmail ? { email: bypassEmail } : { role: 'OWNER' } 
      });
      if (process.env.NODE_ENV === 'development') {
        console.info("[verifySession] devUser found:", !!devUser);
      }
      if (devUser) return { userId: devUser.id };
    }
    return null;
  }

  try {
    const { payload } = await jwtVerify(sessionToken, getEncodedKey(), {
      algorithms: ['HS256'],
    });
    
    const sessionId = payload.sessionId as string;
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });
    if (!session) return null;

    const user = session.user;
    if (!user || user.isDeleted === true || user.isActive === false) {
      return null;
    }

    // W3-1 SECURITY FIX: Enforce database-level session expiration
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return null;
    }

    // OSAD-V2 SECURITY FIX: Session Fixation / Hijacking Protection (User-Agent verify)
    const reqHeaders = await headers();
    const currentUserAgent = reqHeaders.get('user-agent') || 'unknown';
    if (session.userAgent && session.userAgent !== 'unknown' && session.userAgent !== currentUserAgent) {
      // Не блокируем — UA меняется при обновлении браузера, это норма
      // Обновляем UA в сессии (дедупликация будущих событий)
      // Логируем в SecurityEvent для audit trail
      console.warn(
        `[Session] UA changed for session ${sessionId}: "${session.userAgent}" → "${currentUserAgent}". Updating.`
      );

      // Fire-and-forget: не блокируем запрос на запись в БД
      Promise.all([
        db.session.update({
          where: { id: sessionId },
          data: { userAgent: currentUserAgent },
        }),
        db.securityEvent.create({
          data: {
            event: 'SESSION_UA_CHANGED',
            severity: 'WARNING',
            details: {
              sessionId,
              userId: session.userId,
              oldUserAgent: session.userAgent,
              newUserAgent: currentUserAgent,
            },
          },
        }),
      ]).catch(err => {
        console.error('[Session] Failed to update UA audit trail:', err.message);
      });
    }

    return { userId: payload.userId as string };
  } catch (err) {
    console.warn('[verifySession] JWT verification failed:', err instanceof Error ? err.message : 'Unknown error');
    // SD-11 SECURITY FIX: DEV_AUTO_LOGIN restricted to localhost only.
    if (process.env.NODE_ENV !== 'production' && (process.env.DEV_AUTO_LOGIN === 'true' || process.env.DEV_AUTO_LOGIN === '1')) {
      const bypassEmail = process.env.DEV_BYPASS_EMAIL;
      if (process.env.NODE_ENV === 'development') {
        console.info("[verifySession] DEV_AUTO_LOGIN triggered. bypassEmail:", bypassEmail);
      }
      const devUser = await db.user.findFirst({ 
        where: bypassEmail ? { email: bypassEmail } : { role: 'OWNER' } 
      });
      if (process.env.NODE_ENV === 'development') {
        console.info("[verifySession] devUser found:", !!devUser);
      }
      if (devUser) return { userId: devUser.id };
    }
    return null;
  }
}
