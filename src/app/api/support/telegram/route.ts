import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { SettingsProvider } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const contactSettings = await SettingsProvider.getContactAndLegalSettings();
  const botUsername = contactSettings.TELEGRAM_SUPPORT_BOT;

  if (!botUsername) {
    console.error('[TelegramSupport] TELEGRAM_SUPPORT_BOT not configured in settings');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://smmplan.pro';
    return NextResponse.redirect(`${appUrl}/dashboard`);
  }

  const baseUrl = `https://t.me/${botUsername}`;
  
  try {
    const session = await verifySession();
    const { searchParams } = new URL(req.url);
    const forceAuth = searchParams.get('forceAuth') === 'true';
    
    // Если пользователь не авторизован
    if (!session || !session.userId) {
      if (forceAuth) {
        // Требуем обязательной авторизации (Level 2 Protocol)
        const host = process.env.NEXT_PUBLIC_APP_URL || 'https://smmplan.pro';
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
