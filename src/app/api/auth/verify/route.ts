export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    redirect("/login?error=InvalidToken");
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const authToken = await db.authToken.findUnique({
    where: { token: hashedToken },
  });

  console.log('DEBUG_VERIFY:', {
    tokenFound: !!authToken,
    expiresAt: authToken?.expiresAt,
    now: new Date(),
    isExpired: authToken ? authToken.expiresAt < new Date() : null
  });

  if (!authToken || authToken.expiresAt < new Date()) {
    redirect("/login?error=ExpiredToken");
  }

  // Помечаем как использованный, атомарная проверка (Race Condition Guard)
  const result = await db.authToken.updateMany({
    where: { id: authToken.id, used: false },
    data: { used: true },
  });

  if (result.count === 0) {
    redirect("/login?error=AlreadyUsed");
  }

  const user = await db.user.findUnique({ where: { id: authToken.userId } });
  if (!user || user.isDeleted || !user.isActive) {
    redirect("/login?error=AccountBlocked");
  }

  // Устанавливаем куку сессии и даем разрешение на сброс пароля (через JWT)
  if (!user.isEmailVerified) {
    await db.user.update({ where: { id: user.id }, data: { isEmailVerified: true } });
  }
  const { sessionToken, expiresAt } = await createSession(authToken.userId, true);
  
  const redirectPath = ["OWNER", "ADMIN", "MANAGER", "SUPPORT"].includes(user.role)
    ? "/admin/dashboard"
    : "/dashboard";

  const cookieStore = await cookies();
  cookieStore.set('session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  redirect(redirectPath);
}
