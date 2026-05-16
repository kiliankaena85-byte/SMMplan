import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'smmplan_bot';
  const baseUrl = `https://t.me/${botUsername}`;
  
  try {
    const session = await verifySession();
    const { searchParams } = new URL(req.url);
    const forceAuth = searchParams.get('forceAuth') === 'true';
    
    // Если пользователь не авторизован
    if (!session || !session.userId) {
      if (forceAuth) {
        // Требуем обязательной авторизации (Level 2 Protocol)
        const host = process.env.NEXT_PUBLIC_APP_URL || 'https://smmplan.ru';
        const callbackUrl = encodeURIComponent('/api/support/telegram?forceAuth=true');
        return NextResponse.redirect(`${host}/auth?callbackUrl=${callbackUrl}`);
      }
      // Обычный переход с лендинга
      return NextResponse.redirect(`${baseUrl}?start=support`);
    }

    // Если авторизован, генерируем одноразовый токен для привязки (Smart Bind Protocol Level 1)
    const tokenStr = `tg_bind_${crypto.randomBytes(16).toString('hex')}`;
    
    await db.authToken.create({
      data: {
        token: tokenStr,
        userId: session.userId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 минут
      }
    });

    return NextResponse.redirect(`${baseUrl}?start=${tokenStr}`);
  } catch (error) {
    console.error('[TelegramSupportRedirect] Error:', error);
    // В случае ошибки БД всё равно отдаем базовую ссылку
    return NextResponse.redirect(`${baseUrl}?start=support`);
  }
}
