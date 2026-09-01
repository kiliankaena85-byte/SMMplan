import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { SettingsProvider } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(request?: Request) {
  let host = '';
  try {
    if (request?.headers) {
      host = request.headers.get('host') || request.headers.get('x-forwarded-host') || '';
    } else {
      const reqHeaders = await headers();
      host = reqHeaders.get('host') || reqHeaders.get('x-forwarded-host') || '';
    }
  } catch {
    // Non-request context fallback
  }
  const isTestDomain = host.includes('test.') || host.includes('flux.') || host.includes('localhost') || host.includes('127.0.0.1') || host.includes('.ts.net') || host.includes('tailscale');

  const isMaintenanceMode = isTestDomain ? false : (process.env.MAINTENANCE_MODE === 'true');

  if (isMaintenanceMode) {
    const contactSettings = await SettingsProvider.getContactAndLegalSettings();
    return NextResponse.json({
      isMaintenanceMode: true,
      siteName: contactSettings.SITE_NAME || "SMMplan",
      message: "На платформе проводятся плановые технические работы. Сервис скоро возобновит работу.",
    });
  }

  return NextResponse.json({ isMaintenanceMode: false });
}

