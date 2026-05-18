import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { db } from './db';

// W0-2 SECURITY FIX: Fail-fast — never allow hardcoded fallback in any environment
if (!process.env.JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is not set. ' +
    'This is required for session security. Add it to your .env file.'
  );
}
const secretKey = process.env.JWT_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

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
    .sign(encodedKey);
    
  (await cookies()).set('session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function verifySession() {
  const sessionToken = (await cookies()).get('session_token')?.value;

  if (!sessionToken) {
    if (process.env.NODE_ENV !== 'production' && process.env.DEV_AUTO_LOGIN === 'true') {
      // ВРЕМЕННЫЙ ХАК: Авто-вход для локальной разработки
      const devOwner = await db.user.findFirst({ where: { role: 'OWNER' } });
      if (devOwner) return { userId: devOwner.id };
    }
    return null;
  }

  try {
    const { payload } = await jwtVerify(sessionToken, encodedKey, {
      algorithms: ['HS256'],
    });
    
    const sessionId = payload.sessionId as string;
    const session = await db.session.findUnique({ where: { id: sessionId } });
    if (!session) return null;

    // W3-1 SECURITY FIX: Enforce database-level session expiration
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return null;
    }

    // OSAD-V2 SECURITY FIX: Session Fixation / Hijacking Protection (User-Agent verify)
    const reqHeaders = await headers();
    const currentUserAgent = reqHeaders.get('user-agent') || 'unknown';
    if (session.userAgent && session.userAgent !== 'unknown' && session.userAgent !== currentUserAgent) {
      console.warn(`[verifySession] Session Hijacking blocked: User-Agent mismatch for user ${payload.userId}`);
      return null;
    }

    return { userId: payload.userId as string };
  } catch (err) {
    console.warn('[verifySession] JWT verification failed:', err instanceof Error ? err.message : 'Unknown error');
    if (process.env.NODE_ENV !== 'production' && process.env.DEV_AUTO_LOGIN === 'true') {
      // ВРЕМЕННЫЙ ХАК: Авто-вход для локальной разработки
      const devOwner = await db.user.findFirst({ where: { role: 'OWNER' } });
      if (devOwner) return { userId: devOwner.id };
    }
    return null;
  }
}
