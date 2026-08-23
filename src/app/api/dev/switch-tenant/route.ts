import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_ROUTES !== 'true') {
    return new Response('Not Found', { status: 404 });
  }
  
  const session = await verifySession();
  
  const { getBaseUrlAsync } = await import('@/utils/get-base-url');
  const baseUrl = await getBaseUrlAsync();

  if (!session || !['OWNER', 'ADMIN'].includes(session.role || '')) {
    return NextResponse.redirect(new URL('/login', baseUrl));
  }

  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('to') || 'flux';
  const targetTenant = rawTarget === 'flux' || rawTarget === 'smmflux' ? 'flux' : 'smmplan';

  try {
    await db.user.update({
      where: { id: session.userId },
      data: { tenantId: targetTenant },
    });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      return new NextResponse('Conflict: An account with this email already exists in the target tenant.', { status: 409 });
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to switch tenant:', error);
    return new NextResponse('Failed to switch tenant. ' + errorMessage, { status: 400 });
  }

  return NextResponse.redirect(new URL('/dashboard', baseUrl));
}
