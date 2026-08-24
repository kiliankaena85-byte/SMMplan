import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/bot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
    const providedToken = req.headers.get('x-telegram-bot-api-secret-token');

    if (secretToken && providedToken !== secretToken) {
      console.error('[Telegram Webhook] Invalid secret token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await bot.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Error processing update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'telegram-webhook' });
}
