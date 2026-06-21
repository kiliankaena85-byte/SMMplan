import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SettingsProvider } from '@/lib/settings';
import { decryptSessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const isMaintenanceMode = await SettingsProvider.isMaintenanceMode();
  let isStaff = false;

  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (token) {
    const payload = await decryptSessionToken(token);
    if (payload && payload.role) {
      isStaff = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'].includes(payload.role);
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
    });
  }

  return NextResponse.json({ isMaintenanceMode, isStaff });
}
