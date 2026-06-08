import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  // SD-04 SECURITY FIX: Completely disable in production to prevent session token leakage.
  // This route exposes raw JWT tokens and all cookies — unacceptable attack surface in prod.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let session: Awaited<ReturnType<typeof verifySession>> = null;
  const isTest = process.env.NEXT_PUBLIC_APP_ENV === 'test';
  if (!isTest) {
    session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const revalidate = searchParams.get('revalidate');
  
  if (revalidate) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)(revalidate);
    return NextResponse.json({ success: true, revalidated: revalidate });
  }

  const syncPrices = searchParams.get('syncPrices');
  if (syncPrices) {
    const usdToRub = parseFloat(syncPrices);
    if (!isNaN(usdToRub)) {
      const { adminCatalogService } = await import('@/services/admin/catalog.service');
      await adminCatalogService.syncDenormalizedPrices(usdToRub);
      return NextResponse.json({ success: true, syncedWithRate: usdToRub });
    }
  }

  const cookieStore = await cookies();
  
  return NextResponse.json({
    allCookies: cookieStore.getAll(),
    sessionToken: cookieStore.get('session_token')?.value,
    verifiedSession: session
  });
}
