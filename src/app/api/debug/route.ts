import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const revalidate = searchParams.get('revalidate');
  
  if (revalidate) {
    (revalidateTag as any)(revalidate);
    return NextResponse.json({ success: true, revalidated: revalidate });
  }

  const cookieStore = await cookies();
  
  return NextResponse.json({
    allCookies: cookieStore.getAll(),
    sessionToken: cookieStore.get('session_token')?.value,
    verifiedSession: session
  });
}
