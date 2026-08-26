import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { db } from './db';
import { getEncodedKey, decryptSessionToken } from './session-edge';
export { getEncodedKey, decryptSessionToken };

import { getClientIp } from '@/utils/ip';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';

export async function createSession(userId: string, canResetPassword: boolean = false) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней
  
  let userAgent = 'unknown';
  let ipAddress = '127.0.0.1';
  try {
    const reqHeaders = await headers();
    userAgent = reqHeaders.get('user-agent') || 'unknown';
    ipAddress = await getClientIp();
  } catch {
    // Non-request scope fallback
  }

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

export async function verifySession(requiredTenantId?: string): Promise<{ userId: string; canResetPassword?: boolean; role?: string; tenantId?: string } | null> {
  let sessionToken: string | undefined;
  try {
    const cookieStore = await cookies();
    const explicitLogout = cookieStore.get('explicit_logout')?.value;
    if (explicitLogout === 'true') {
      return null;
    }
    sessionToken = cookieStore.get('session_token')?.value;
  } catch {
    // If called outside Next.js request scope (e.g. background tasks or CLI)
    return null;
  }

  if (!sessionToken) {
    return handleDevAutoLogin();
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
    if (!session) {
      console.warn(`[verifySession] Session not found in DB or revoked`);
      return null;
    }
    if (session.expiresAt < new Date()) {
      console.warn(`[verifySession] Session expired in DB`);
      return null;
    }

    const user = session.user;
    if (!user || user.isDeleted === true || user.isActive === false || user.role === 'BANNED') {
      console.warn('[verifySession] null because: user missing, deleted, inactive, or banned');
      return null;
    }

    const reqHeaders = await headers();
    const currentTenantId = normalizeTenantId(requiredTenantId || reqHeaders.get("x-tenant-id")) || "smmplan";
    const userTenantId = normalizeTenantId(user.tenantId) || "smmplan";
    
    // Staff roles (OWNER, ADMIN, MANAGER, SUPPORT) have global multi-tenant access
    const isStaffRole = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'].includes(user.role);
    if (!isStaffRole && userTenantId !== currentTenantId) {
      console.warn(`[verifySession] null because: user tenant "${user.tenantId}" does not match request tenant "${currentTenantId}"`);
      try {
        const cookieStore = await cookies();
        cookieStore.delete('session_token');
      } catch {}
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
      role: user.role,
      tenantId: user.tenantId
    };
  } catch (err) {
    console.warn('[verifySession] JWT verification failed:', err instanceof Error ? err.message : 'Unknown error');
    return null;
  }
}

async function handleDevAutoLogin() {
  if (process.env.APP_ENV === 'test') {
    return null;
  }
  if (
    process.env.NODE_ENV === 'development' &&
    (process.env.DEV_AUTO_LOGIN === 'true' || process.env.DEV_AUTO_LOGIN === '1')
  ) {
    const bypassEmail = process.env.DEV_BYPASS_EMAIL;
    console.info("[verifySession] DEV_AUTO_LOGIN triggered. bypassEmail:", bypassEmail);
    
    const devUser = await db.user.findFirst({ 
      where: bypassEmail 
        ? { email: bypassEmail, isDeleted: false, isActive: true } 
        : { role: 'OWNER', isDeleted: false, isActive: true } 
    });
    console.info("[verifySession] devUser found:", !!devUser);
    if (devUser && devUser.role !== 'BANNED') {
      return { userId: devUser.id, role: devUser.role, tenantId: devUser.tenantId };
    }
  }
  return null;
}


