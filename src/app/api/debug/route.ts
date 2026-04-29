import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';

export async function GET() {
  const cookieStore = await cookies();
  const session = await verifySession();
  
  return NextResponse.json({
    allCookies: cookieStore.getAll(),
    sessionToken: cookieStore.get('session_token')?.value,
    verifiedSession: session
  });
}
