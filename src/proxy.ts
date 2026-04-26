import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const ref = url.searchParams.get('ref');
  
  if (ref) {
    const response = NextResponse.next();
    response.cookies.set('ref', ref, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 дней
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
