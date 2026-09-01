import { NextResponse } from 'next/server';
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import crypto from "crypto";
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { sanitizeRedirectUrl } from '@/lib/security/redirect-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const tenant = normalizeTenantId(url.searchParams.get("tenant")) || "smmplan";
  const customRedirect = url.searchParams.get("redirectTo") || url.searchParams.get("redirect") || url.searchParams.get("returnUrl");

  const hostHeader = request.headers.get('host') || url.host || 'localhost:3005';
  const cleanHost = hostHeader.includes('0.0.0.0') ? hostHeader.replace('0.0.0.0', 'localhost') : hostHeader;
  const proto = request.headers.get('x-forwarded-proto') || (url.protocol.startsWith('https') ? 'https' : 'http');
  const baseUrl = `${proto}://${cleanHost}`;

  const loginBase = tenant === "flux" ? "/login?tenant=flux&" : "/login?";

  if (!token) {
    return NextResponse.redirect(new URL(`${loginBase}error=InvalidToken`, baseUrl));
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  let authToken = await db.authToken.findFirst({
    where: {
      OR: [
        { token: hashedToken },
        { token: token },
      ],
    },
  });

  if (!authToken || authToken.expiresAt < new Date()) {
    return NextResponse.redirect(new URL(`${loginBase}error=ExpiredToken`, baseUrl));
  }

  const ipUsed = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";
  const userAgentUsed = request.headers.get("user-agent") || "Unknown";

  // Atomic race-condition guard
  const result = await db.authToken.updateMany({
    where: { id: authToken.id, used: false },
    data: {
      used: true,
      usedAt: new Date(),
      ipUsed,
      userAgentUsed,
    },
  });

  if (result.count === 0) {
    // If recently verified within last 10 seconds, allow graceful login instead of hard error
    const isRecent = authToken.usedAt && (Date.now() - authToken.usedAt.getTime() < 10000);
    if (!isRecent) {
      return NextResponse.redirect(new URL(`${loginBase}error=AlreadyUsed`, baseUrl));
    }
  }

  const user = await db.user.findUnique({ where: { id: authToken.userId } });
  if (!user || user.isDeleted || !user.isActive) {
    return NextResponse.redirect(new URL(`${loginBase}error=AccountBlocked`, baseUrl));
  }

  if (!user.isEmailVerified) {
    await db.user.update({ where: { id: user.id }, data: { isEmailVerified: true } });
  }

  const { sessionToken, expiresAt } = await createSession(authToken.userId, true);

  let destination = sanitizeRedirectUrl(customRedirect, user.role && ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'].includes(user.role) ? '/admin/dashboard' : '/dashboard');

  const isFlux = user.tenantId === 'flux' || tenant === 'flux';
  if (isFlux && !destination.includes('tenant=flux')) {
    destination += (destination.includes('?') ? '&' : '?') + 'tenant=flux';
  }

  const response = NextResponse.redirect(new URL(destination, baseUrl));

  // Clear any explicit logout blocker
  response.cookies.set('explicit_logout', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set('session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  response.cookies.set('x_tenant', user.tenantId || 'smmplan', {
    path: '/',
    expires: expiresAt,
  });

  response.cookies.set('x_admin_tenant', user.tenantId || 'smmplan', {
    path: '/',
    expires: expiresAt,
  });

  return response;
}
