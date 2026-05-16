export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import crypto from "crypto";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://smmplan.pro';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=InvalidToken", BASE_URL));
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const authToken = await db.authToken.findUnique({
    where: { token: hashedToken },
  });

  if (!authToken || authToken.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login?error=ExpiredToken", BASE_URL));
  }

  // Помечаем как использованный, атомарная проверка (Race Condition Guard)
  const result = await db.authToken.updateMany({
    where: { id: authToken.id, used: false },
    data: { used: true },
  });

  if (result.count === 0) {
    return NextResponse.redirect(new URL("/login?error=AlreadyUsed", BASE_URL));
  }

  // Устанавливаем куку сессии
  await createSession(authToken.userId);

  const user = await db.user.findUnique({ where: { id: authToken.userId } });
  
  if (user && ["OWNER", "ADMIN", "MANAGER", "SUPPORT"].includes(user.role)) {
    return NextResponse.redirect(new URL("/admin/dashboard", BASE_URL));
  }

  return NextResponse.redirect(new URL("/dashboard", BASE_URL));
}

