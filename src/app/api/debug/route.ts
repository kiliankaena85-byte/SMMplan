import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import { revalidateTag } from 'next/cache';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const revalidate = searchParams.get('revalidate');
  
  if (revalidate) {
    (revalidateTag as any)(revalidate);
    return NextResponse.json({ success: true, revalidated: revalidate });
  }

  const cookieStore = await cookies();
  const session = await verifySession();
  
  return NextResponse.json({
    allCookies: cookieStore.getAll(),
    sessionToken: cookieStore.get('session_token')?.value,
    verifiedSession: session
  });
}
