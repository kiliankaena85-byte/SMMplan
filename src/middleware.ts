import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decryptSessionToken } from '@/lib/session-edge';
import { ROUTES } from '@/lib/routes';

// Map of legacy routes to new static routes
const legacyRedirects: Record<string, string> = {
  '/p/offer': ROUTES.LEGAL.TERMS,
  '/p/terms': ROUTES.LEGAL.TERMS,
  '/p/privacy': ROUTES.LEGAL.PRIVACY,
  '/p/refund': ROUTES.LEGAL.REFUND,
  '/p/faq': ROUTES.FAQ,
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check legacy redirects
  const newPath = legacyRedirects[pathname];
  if (newPath) {
    const redirectUrl = new URL(newPath, request.url);
    if (newPath.includes('#')) {
      const [pathPart, hashPart] = newPath.split('#');
      redirectUrl.pathname = pathPart;
      redirectUrl.hash = hashPart;
    }
    return NextResponse.redirect(redirectUrl, 301); // 301 Permanent Redirect
  }

  // 2. Auth Route Protection
  const protectedPaths = ['/admin', '/dashboard'];
  if (protectedPaths.some(p => pathname.startsWith(p))) {
    const sessionToken = request.cookies.get('session_token')?.value;
    const explicitLogout = request.cookies.get('explicit_logout')?.value;
    const isRSC = request.headers.has('rsc') || request.headers.has('next-action');

    if (explicitLogout === 'true' || !sessionToken) {
      if (isRSC) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
    }

    const payload = await decryptSessionToken(sessionToken);
    if (!payload) {
      if (isRSC) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
    }

    // Role verification for /admin
    if (pathname.startsWith('/admin')) {
      const ADMIN_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];
      if (!payload.role || !ADMIN_ROLES.includes(payload.role)) {
        if (isRSC) {
          return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
        return NextResponse.redirect(new URL(ROUTES.DASHBOARD.HOME, request.url));
      }
    }
  }

  // Set x-pathname header for layout detection
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // Handle ref cookie if present in URL query
  const ref = request.nextUrl.searchParams.get('ref');
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (ref) {
    response.cookies.set('ref', ref, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
