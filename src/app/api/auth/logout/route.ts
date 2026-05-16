import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-v2';
const encodedKey = new TextEncoder().encode(secretKey);

async function deleteSessionFromDB(token?: string) {
  if (token) {
    try {
      const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] });
      if (payload.sessionId) {
        await db.session.delete({ where: { id: payload.sessionId as string } }).catch(() => {});
      }
    } catch (e) {
      // ignore validation errors on logout
    }
  }
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  await deleteSessionFromDB(token);
  
  cookieStore.delete('session_token');
  const url = new URL('/', request.url);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  await deleteSessionFromDB(token);
  
  cookieStore.delete('session_token');
  const url = new URL('/', request.url);
  return NextResponse.redirect(url);
}
