import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jwtVerify } from 'jose';
import { getEncodedKey } from '@/lib/session';

async function deleteSessionFromDB(token?: string) {
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getEncodedKey(), { algorithms: ['HS256'] });
      if (payload.sessionId) {
        await db.session.delete({ where: { id: payload.sessionId as string } }).catch(() => {});
      }
    } catch {
      // ignore validation errors on logout
    }
  }
}

export async function GET(request: Request) {
  return POST(request);
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

  const reqHeaders = await headers();
  const fwdHost = reqHeaders.get('x-forwarded-host');
  const hostHeader = reqHeaders.get('host');
  const fwdProto = reqHeaders.get('x-forwarded-proto');

  let host = fwdHost || hostHeader || '';
  if (host.includes('0.0.0.0') || host.includes('host.docker.internal') || !host) {
    host = process.env.NODE_ENV === 'production' 
      ? (process.env.APP_URL ? new URL(process.env.APP_URL).host : 'test.smmplan.pro') 
      : 'localhost:3000';
  }
  const proto = fwdProto || (process.env.NODE_ENV === 'production' && !host.includes('localhost') ? 'https' : 'http');
  const targetUrl = `${proto}://${host}/login`;

  const response = NextResponse.redirect(targetUrl, 303);
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  return response;
}
