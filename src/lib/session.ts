import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { db } from './db';
import { getEncodedKey, decryptSessionToken } from './session-edge';
export { getEncodedKey, decryptSessionToken };

import { getClientIp } from '@/utils/ip';

export async function createSession(userId: string, canResetPassword: boolean = false) {
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

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, tenantId: true }
  });
  const role = user?.role || 'USER';
  const tenantId = user?.tenantId || 'smmplan';

  // Шифруем ID сессии в JWT
  const sessionToken = await new SignJWT({ sessionId: session.id, userId, canResetPassword, role, tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getEncodedKey());
    
  try {
    // Clear explicit logout cookie if it exists
    (await cookies()).delete('explicit_logout');

    (await cookies()).set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      sameSite: 'lax',
      path: '/',
    });
  } catch (err) {
    // In Route Handlers (GET/etc) cookies() is read-only and throws an error.
    // The caller must use the returned sessionToken to set the cookie manually on the Response.
    console.warn('[Session] Failed to set cookie (expected in Route Handlers):', err instanceof Error ? err.message : String(err));
  }

  return { sessionToken, expiresAt };
}

export async function verifySession(): Promise<{ userId: string; canResetPassword?: boolean; role?: string } | null> {
  const reqHeaders = await headers();
  const rawIp = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '';
  // Very basic localhost sanity check if headers are present
  const isLocalhostRequest = !rawIp || rawIp.includes('127.0.0.1') || rawIp.includes('::1');

  const explicitLogout = (await cookies()).get('explicit_logout')?.value;
  if (explicitLogout === 'true') {
    return null;
  }

  const sessionToken = (await cookies()).get('session_token')?.value;

  if (!sessionToken) {
    return handleDevAutoLogin(isLocalhostRequest);
  }

  try {
    const { payload } = await jwtVerify(sessionToken, getEncodedKey(), {
      algorithms: ['HS256'],
    });
    
    const sessionId = payload.sessionId as string;
    console.warn(`[verifySession] Verifying sessionId: "${sessionId}"`);
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });
    if (!session) {
      console.warn(`[verifySession] null because: session "${sessionId}" not found in DB`);
      return null;
    }

    const user = session.user;
    if (!user || user.isDeleted === true || user.isActive === false) {
      console.warn('[verifySession] null because: user missing or deleted/inactive');
      return null;
    }

    // Verify tenant context match
    const currentTenantId = reqHeaders.get("x-tenant-id") || "smmplan";
    if (user.tenantId !== currentTenantId) {
      console.warn(`[verifySession] null because: user tenant "${user.tenantId}" does not match request tenant "${currentTenantId}"`);
      return null;
    }

    // W3-1 SECURITY FIX: Enforce database-level session expiration
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      console.warn('[verifySession] null because: session expired in DB');
      return null;
    }

    // OSAD-V2 SECURITY FIX: Session Fixation / Hijacking Protection (User-Agent verify)
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

    return { 
      userId: user.id,
      canResetPassword: payload.canResetPassword === true,
      role: user.role
    };
  } catch (err) {
    console.warn('[verifySession] JWT verification failed:', err instanceof Error ? err.message : 'Unknown error');
    return handleDevAutoLogin(isLocalhostRequest);
  }
}

async function handleDevAutoLogin(isLocalhostRequest: boolean) {
  if (
    isLocalhostRequest &&
    process.env.NODE_ENV !== 'production' &&
    (process.env.DEV_AUTO_LOGIN === 'true' || process.env.DEV_AUTO_LOGIN === '1')
  ) {
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
    if (devUser) return { userId: devUser.id, role: devUser.role };
  }
  return null;
}


