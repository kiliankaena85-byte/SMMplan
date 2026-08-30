import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { SettingsProvider } from '@/lib/settings';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const reqHeaders = await headers();
  const host = reqHeaders.get('host') || reqHeaders.get('x-forwarded-host') || '';
  const isTestDomain = host.includes('test.') || host.includes('flux.') || host.includes('localhost') || host.includes('127.0.0.1') || host.includes('.ts.net') || host.includes('tailscale');

  const isMaintenanceMode = isTestDomain ? false : (process.env.MAINTENANCE_MODE === 'true');
  let isStaff = false;

  const session = await verifySession();
  if (session?.userId) {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });
    if (user && ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT', 'OPERATOR'].includes(user.role)) {
      isStaff = true;
    }
  }

  if (isMaintenanceMode) {
    const contactSettings = await SettingsProvider.getContactAndLegalSettings();
    return NextResponse.json({
      isMaintenanceMode,
      isStaff,
      siteName: contactSettings.SITE_NAME || "SMMplan",
      supportTelegram: contactSettings.TELEGRAM_SUPPORT_BOT || "smmplan_support_bot",
      supportEmail: contactSettings.SUPPORT_EMAIL || "support@smmplan.pro",
    }, {
      headers: { 'x-build-id': 'launch-v5-live; 2026-08-29T14:30Z' }
    });
  }

  return NextResponse.json({ isMaintenanceMode, isStaff }, {
    headers: { 'x-build-id': 'launch-v5-live; 2026-08-29T14:30Z' }
  });
}
