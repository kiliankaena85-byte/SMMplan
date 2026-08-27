export const dynamic = 'force-dynamic';
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const { normalizeTenantId } = await import('@/lib/tenant-resolver-edge');
  const tenant = normalizeTenantId(url.searchParams.get("tenant")) || "smmplan";
  const customRedirect = url.searchParams.get("redirectTo");

  const loginBase = tenant === "flux" ? "/login?tenant=flux&" : "/login?";

  if (!token) {
    redirect(`${loginBase}error=InvalidToken`);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const authToken = await db.authToken.findUnique({
    where: { token: hashedToken },
  });

  if (!authToken || authToken.expiresAt < new Date()) {
    redirect(`${loginBase}error=ExpiredToken`);
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
    redirect(`${loginBase}error=AlreadyUsed`);
  }

  const user = await db.user.findUnique({ where: { id: authToken.userId } });
  if (!user || user.isDeleted || !user.isActive) {
    redirect(`${loginBase}error=AccountBlocked`);
  }

  if (!user.isEmailVerified) {
    await db.user.update({ where: { id: user.id }, data: { isEmailVerified: true } });
  }

  const { sessionToken, expiresAt } = await createSession(authToken.userId, true);
  
  const cookieStore = await cookies();
  cookieStore.set('session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  const { sanitizeRedirectUrl } = await import('@/lib/security/redirect-guard');
  let destination = sanitizeRedirectUrl(customRedirect, '/dashboard');

  const isFlux = user.tenantId === 'flux' || tenant === 'flux';
  if (isFlux && !destination.includes('tenant=flux')) {
    destination += (destination.includes('?') ? '&' : '?') + 'tenant=flux';
  }

  redirect(destination);
}
