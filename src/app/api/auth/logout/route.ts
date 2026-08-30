import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decryptSessionToken } from '@/lib/session-edge';

async function deleteSessionFromDB(token?: string) {
  if (token) {
    try {
      const payload = await decryptSessionToken(token);
      if (payload && payload.sessionId) {
        await db.session.deleteMany({ where: { id: String(payload.sessionId) } }).catch(() => {});
      }
    } catch {
      // ignore validation errors on logout
    }
  }
}

export async function GET(request: Request) {
  // Sec-Fetch-Site check to prevent Logout CSRF via <img> tags from third-party sites
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'same-site' && secFetchSite !== 'none') {
    return NextResponse.json({ error: 'Cross-site logout rejected' }, { status: 403 });
  }
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
    maxAge: 60 * 5, // 5 minutes
  });

  const reqHeaders = await headers();
  const hostHeader = reqHeaders.get('host');
  const fwdHost = reqHeaders.get('x-forwarded-host');
  const fwdProto = reqHeaders.get('x-forwarded-proto');

  let host = hostHeader || fwdHost || '';
  const ALLOWED_HOSTS = new Set([
    'smmplan.pro',
    'test.smmplan.pro',
    'smmflux.ru',
    'flux.smmplan.pro',
    'localhost',
    '127.0.0.1'
  ]);
  const cleanHost = host.split(':')[0].toLowerCase();
  if (!ALLOWED_HOSTS.has(cleanHost) || host.includes('0.0.0.0') || host.includes('host.docker.internal')) {
    host = process.env.NODE_ENV === 'production' 
      ? (process.env.APP_URL ? new URL(process.env.APP_URL).host : 'test.smmplan.pro') 
      : 'localhost:3000';
  }
  const proto = fwdProto || (process.env.NODE_ENV === 'production' && !host.includes('localhost') ? 'https' : 'http');
  const targetUrl = `${proto}://${host}/login`;

  const isFetch = request.headers.get('sec-fetch-mode') === 'cors' || 
                  request.headers.get('accept')?.includes('application/json') ||
                  request.headers.get('x-requested-with') === 'XMLHttpRequest';

  const response = isFetch 
    ? NextResponse.json({ success: true, redirect: targetUrl }) 
    : NextResponse.redirect(targetUrl, 303);

  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  return response;
}
