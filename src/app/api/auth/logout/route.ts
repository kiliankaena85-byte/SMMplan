import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getBaseUrlSync } from '@/utils/get-base-url';
import { jwtVerify } from 'jose';

import { getEncodedKey } from '@/lib/session';

async function deleteSessionFromDB(token?: string) {
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getEncodedKey(), { algorithms: ['HS256'] });
      if (payload.sessionId) {
        await db.session.delete({ where: { id: payload.sessionId as string } }).catch(() => {});
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  cookieStore.set('explicit_logout', 'true', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = getBaseUrlSync(host, proto);
  const url = new URL('/login', baseUrl);
  
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  return response;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  await deleteSessionFromDB(token);
  
  cookieStore.delete('session_token');
  cookieStore.set('explicit_logout', 'true', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = getBaseUrlSync(host, proto);
  const url = new URL('/login', baseUrl);
  
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  return response;
}
