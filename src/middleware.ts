import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decryptSessionToken } from '@/lib/session-edge';
import { ROUTES } from '@/lib/routes';

import { resolveTenantFromHostEdge, normalizeTenantId } from '@/lib/tenant-resolver-edge';

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

  // 0. Strip any client-supplied x-tenant-id to prevent spoofing
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-tenant-id');

  const host = request.headers.get('host') || '';
  if (host.includes('lovable.pro')) {
    return NextResponse.redirect('https://smmflux.ru' + request.nextUrl.pathname, 301);
  }
  const isProduction = process.env.NODE_ENV === 'production';
  const isTestOrStaging = !isProduction;

  const fromQuery = isTestOrStaging ? normalizeTenantId(request.nextUrl.searchParams.get('tenant')) : null;
  const fromCookie = isTestOrStaging ? normalizeTenantId(request.cookies.get('x_tenant')?.value) : null;
  const fromAdminCookie = normalizeTenantId(request.cookies.get('x_admin_tenant')?.value);
  const fromHost = normalizeTenantId(resolveTenantFromHostEdge(host));

  let finalTenantId = 'smmplan';
  let isExplicitTenant = false;

  if (isProduction) {
    if (fromAdminCookie && pathname.startsWith('/admin')) {
      finalTenantId = fromAdminCookie;
    } else {
      finalTenantId = fromHost || 'smmplan';
    }
  } else {
    if (fromQuery) {
      finalTenantId = fromQuery;
      isExplicitTenant = true;
    } else if (fromHost && fromHost !== 'smmplan') {
      finalTenantId = fromHost;
    } else if (fromAdminCookie && pathname.startsWith('/admin')) {
      finalTenantId = fromAdminCookie;
    } else if (fromCookie) {
      finalTenantId = fromCookie;
      isExplicitTenant = true;
    } else {
      finalTenantId = fromHost || 'smmplan';
    }
  }

  requestHeaders.set('x-tenant-id', finalTenantId);

  const applyStickyCookie = (res: NextResponse) => {
    res.headers.set('x-tenant-id', finalTenantId);
    if (isExplicitTenant) {
      res.cookies.set('x_tenant', finalTenantId, {
        path: '/',
        httpOnly: false, // Allow client-side QA Dock to switch brands
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }
    return res;
  };

  // 2. Check legacy redirects
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

  // 3. Legacy redirects handled above

  // 4. Auth Route Protection
  const protectedPaths = ['/admin', '/dashboard', '/operator'];
  if (protectedPaths.some(p => pathname.startsWith(p))) {
    const sessionToken = request.cookies.get('session_token')?.value;
    const explicitLogout = request.cookies.get('explicit_logout')?.value;
    const isRSC = request.headers.has('rsc') || request.headers.has('next-action');

    const isDevBypassAllowed =
      process.env.NODE_ENV === 'development' &&
      process.env.ENABLE_DEV_BYPASS === 'true' &&
      process.env.APP_ENV !== 'test';

    if (explicitLogout === 'true' || !sessionToken) {
      if (isRSC) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Dev mode auto-login bypass for local environment
      if (isDevBypassAllowed) {
        const autoLoginUrl = new URL('/api/dev/login-direct', request.url);
        autoLoginUrl.searchParams.set('email', process.env.DEV_BYPASS_EMAIL || 'infosokoloff@yandex.ru');
        autoLoginUrl.searchParams.set('tenant', finalTenantId);
        return applyStickyCookie(NextResponse.redirect(autoLoginUrl));
      }
      return applyStickyCookie(NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url)));
    }

    const payload = await decryptSessionToken(sessionToken);
    const isStaffRole = payload?.role && ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'].includes(payload.role);
    const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/operator');

    // Enforce tenant isolation for regular users (Staff roles have global multi-tenant access in /admin)
    const isTenantMismatch = !isStaffRole && !isAdminPath && (!payload || normalizeTenantId(payload.tenantId) !== finalTenantId);

    if (!payload || isTenantMismatch) {
      if (isRSC) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Dev mode auto-login bypass on tenant mismatch in local environment
      if (isDevBypassAllowed && explicitLogout !== 'true') {
        const autoLoginUrl = new URL('/api/dev/login-direct', request.url);
        autoLoginUrl.searchParams.set('email', process.env.DEV_BYPASS_EMAIL || 'infosokoloff@yandex.ru');
        autoLoginUrl.searchParams.set('tenant', finalTenantId);
        const response = NextResponse.redirect(autoLoginUrl);
        response.cookies.delete('session_token');
        return applyStickyCookie(response);
      }
      const response = NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
      response.cookies.delete('session_token');
      return applyStickyCookie(response);
    }

    // Role verification for /admin and /operator
    if (isAdminPath) {
      if (!isStaffRole) {
        if (isRSC) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return applyStickyCookie(NextResponse.redirect(new URL(ROUTES.DASHBOARD.HOME, request.url)));
      }
    }
  }

  // Set headers for layout detection and tenant isolation
  requestHeaders.set('x-pathname', pathname);

  // Handle ref cookie if present in URL query
  const ref = request.nextUrl.searchParams.get('ref');
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-tenant-id', finalTenantId);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // Inject X-Robots-Tag for sensitive routes to prevent indexing
  if (['/admin', '/dashboard', '/operator', '/api'].some(p => pathname.startsWith(p))) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  if (ref) {
    response.cookies.set('ref', ref, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  return applyStickyCookie(response);
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
