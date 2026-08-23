import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jwtVerify } from 'jose';
import { getEncodedKey } from '@/lib/session';
import { SecurityAuditLogger } from '@/lib/security/audit-logger';

async function deleteSessionFromDB(token?: string) {
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getEncodedKey(), { algorithms: ['HS256'] });
      if (payload.sessionId) {
        await db.session.delete({ where: { id: payload.sessionId as string } }).catch(() => {});
      }
    } catch {
      // ignore validation errors on logout
    }
  }
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  let userId: string | undefined;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getEncodedKey(), { algorithms: ['HS256'] });
      userId = payload.userId as string | undefined;
    } catch {
      // ignore jwt errors
    }
  }

  await deleteSessionFromDB(token);

  try {
    await SecurityAuditLogger.log({
      event: 'LOGOUT',
      severity: 'INFO',
      ip,
      userAgent,
      userId,
      details: { method: 'explicit_logout' },
    });
  } catch (err) {
    console.error('[Logout] Failed to log audit event:', err);
  }
  
  cookieStore.delete('session_token');
  cookieStore.set('explicit_logout', 'true', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  
  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  return response;
}
