import { NextResponse } from 'next/server';
import { PreLaunchService } from '@/services/marketing/prelaunch-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email : '';
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId : 'smmplan';
    const source = typeof body.source === 'string' ? body.source : 'holding_page';

    const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    const result = await PreLaunchService.subscribe({
      email,
      tenantId,
      source,
      ip
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('[API PreLaunch Subscribe] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Произошла непредвиденная ошибка. Попробуйте позже.' },
      { status: 500 }
    );
  }
}
