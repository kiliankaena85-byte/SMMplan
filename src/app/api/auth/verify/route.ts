export const dynamic = 'force-dynamic';
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SecurityAuditLogger } from "@/lib/security/audit-logger";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const tenant = url.searchParams.get("tenant") || "smmplan";
  const customRedirect = url.searchParams.get("redirectTo");

  const loginBase = tenant === "lovable" ? "/login?tenant=lovable&" : "/login?";
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  if (!token) {
    await SecurityAuditLogger.log({
      event: 'MAGIC_LINK_INVALID_TOKEN',
      severity: 'WARNING',
      ip,
      userAgent,
      tenantId: tenant,
      details: { reason: 'Missing token in query' },
    });
    redirect(`${loginBase}error=InvalidToken`);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const authToken = await db.authToken.findUnique({
    where: { token: hashedToken },
  });

  if (!authToken || authToken.expiresAt < new Date()) {
    await SecurityAuditLogger.log({
      event: 'MAGIC_LINK_EXPIRED_OR_INVALID',
      severity: 'WARNING',
      ip,
      userAgent,
      userId: authToken?.userId,
      tenantId: tenant,
      details: { reason: !authToken ? 'Token not found' : 'Token expired' },
    });
    redirect(`${loginBase}error=ExpiredToken`);
  }

  // Atomic race-condition guard
  const result = await db.authToken.updateMany({
    where: { id: authToken.id, used: false },
    data: { used: true },
  });

  if (result.count === 0) {
    // CRITICAL: someone is trying to reuse an already-consumed token — potential replay attack
    await SecurityAuditLogger.log({
      event: 'MAGIC_LINK_REUSE',
      severity: 'CRITICAL',
      ip,
      userAgent,
      userId: authToken.userId,
      tenantId: tenant,
      details: { reason: 'Token already used (replay attempt)', tokenId: authToken.id },
    });
    redirect(`${loginBase}error=AlreadyUsed`);
  }

  const user = await db.user.findUnique({ where: { id: authToken.userId } });
  if (!user || user.isDeleted || !user.isActive) {
    await SecurityAuditLogger.log({
      event: 'MAGIC_LINK_ACCOUNT_BLOCKED',
      severity: 'HIGH',
      ip,
      userAgent,
      userId: authToken.userId,
      tenantId: tenant,
      details: { reason: !user ? 'User not found' : (user.isDeleted ? 'Account deleted' : 'Account inactive') },
    });
    redirect(`${loginBase}error=AccountBlocked`);
  }

  if (!user.isEmailVerified) {
    await db.user.update({ where: { id: user.id }, data: { isEmailVerified: true } });
  }

  const { sessionToken, expiresAt } = await createSession(authToken.userId, true);
  
  await SecurityAuditLogger.log({
    event: 'LOGIN_SUCCESS',
    severity: 'INFO',
    ip,
    userAgent,
    userId: user.id,
    tenantId: tenant,
    details: { method: 'magic_link' },
  });

  const cookieStore = await cookies();
  cookieStore.set('session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  function isSafeRedirect(url: string | null): url is string {
    if (!url) return false;
    if (!url.startsWith('/')) return false;
    if (url.startsWith('//')) return false;
    if (url.includes('\\')) return false;
    return true;
  }

  let destination = '/dashboard';
  if (isSafeRedirect(customRedirect)) {
    destination = customRedirect;
  }
  const isLovable = user.tenantId === 'lovable' || tenant === 'lovable';
  if (isLovable && !destination.includes('tenant=lovable')) {
    destination += (destination.includes('?') ? '&' : '?') + 'tenant=lovable';
  }

  redirect(destination);
}
