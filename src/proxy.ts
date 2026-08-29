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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Strip any client-supplied x-tenant-id to prevent spoofing
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-tenant-id');

  const hostHeader = request.headers.get('host');
  const fwdHost = request.headers.get('x-forwarded-host');
  const fwdProto = request.headers.get('x-forwarded-proto');

  let host = hostHeader || fwdHost || '';
  if (host.includes('0.0.0.0') || host.includes('host.docker.internal')) {
    host = process.env.NODE_ENV === 'production' 
      ? (process.env.APP_URL ? new URL(process.env.APP_URL).host : 'test.smmplan.pro') 
      : 'localhost:3000';
  }

  const proto = fwdProto || (process.env.NODE_ENV === 'production' && !host.includes('localhost') ? 'https' : 'http');
  const originBase = `${proto}://${host}`;

  const resolveRedirectUrl = (target: string | URL): URL => {
    if (target instanceof URL) {
      if (target.hostname === '0.0.0.0' || target.hostname === 'host.docker.internal') {
        return new URL(`${target.pathname}${target.search}${target.hash}`, originBase);
      }
      return target;
    }
    return new URL(target, originBase);
  };

  const LOVABLE_HOSTS = new Set(['lovable.pro', 'www.lovable.pro', 'flux.lovable.pro']);
  const cleanHost = host.split(':')[0].toLowerCase();
  if (LOVABLE_HOSTS.has(cleanHost)) {
    const targetUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, 'https://smmflux.ru');
    return NextResponse.redirect(targetUrl, 302);
  }
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevOrQA = !isProduction || 
    process.env.ENABLE_DEV_ROUTES === 'true' || 
    process.env.NEXT_PUBLIC_ENABLE_QA_DOCK === 'true' || 
    host.includes('test.') || 
    host.includes('localhost') || 
    host.includes('127.0.0.1');

  const fromQuery = normalizeTenantId(request.nextUrl.searchParams.get('tenant'));
  const fromCookie = normalizeTenantId(request.cookies.get('x_tenant')?.value);
  const fromAdminCookie = normalizeTenantId(request.cookies.get('x_admin_tenant')?.value);
  const fromHost = normalizeTenantId(resolveTenantFromHostEdge(host));

  let finalTenantId = 'smmplan';
  let isExplicitTenant = false;

  if (isDevOrQA && fromQuery) {
    finalTenantId = fromQuery;
    isExplicitTenant = true;
  } else if (isDevOrQA && fromCookie) {
    finalTenantId = fromCookie;
    isExplicitTenant = true;
  } else if (fromAdminCookie && (pathname.startsWith('/admin') || pathname.startsWith('/operator')) && request.cookies.has('session_token')) {
    finalTenantId = fromAdminCookie;
  } else if (fromHost && fromHost !== 'smmplan') {
    finalTenantId = fromHost;
  } else {
    finalTenantId = fromHost || 'smmplan';
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

  // 1. Instant UI Logout Interception (/logout UI link)
  // Note: /api/auth/logout MUST pass through to route.ts to delete session in PostgreSQL (F-7.1)
  if (pathname === '/logout') {
    const res = NextResponse.redirect(resolveRedirectUrl(ROUTES.AUTH.LOGIN));
    res.cookies.set('session_token', '', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      expires: new Date(0),
    });
    res.cookies.set('explicit_logout', 'true', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return applyStickyCookie(res);
  }

  // 1.5 Strict Production Maintenance Gate (F-7.4)
  // When smmplan.pro is in maintenance mode, block /login, /dashboard, /admin, /operator, /api/v2
  const isProdHost = host === 'smmplan.pro';
  const isMaintenanceActive = process.env.MAINTENANCE_MODE === 'true' || (isProdHost && process.env.ENABLE_PROD_ACCESS !== 'true');

  if (isProdHost && isMaintenanceActive) {
    const isAllowedMaintenancePath = 
      pathname === '/' ||
      pathname === '/prelaunch' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname === '/security.txt' ||
      pathname.startsWith('/.well-known/') ||
      pathname === '/api/health' ||
      pathname === '/api/maintenance-status' ||
      pathname === '/api/prelaunch/subscribe' ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/images/') ||
      pathname === '/favicon.ico';

    if (!isAllowedMaintenancePath) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Service Unavailable - Platform under maintenance before launch' },
          { status: 503, headers: { 'Retry-After': '3600' } }
        );
      }
      return applyStickyCookie(NextResponse.redirect(resolveRedirectUrl('/')));
    }
  }

  // 2. Check legacy redirects
  const newPath = legacyRedirects[pathname];
  if (newPath) {
    const redirectUrl = resolveRedirectUrl(newPath);
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

    if (explicitLogout === 'true' || !sessionToken) {
      if (isRSC) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return applyStickyCookie(NextResponse.redirect(resolveRedirectUrl(ROUTES.AUTH.LOGIN)));
    }

    const payload = await decryptSessionToken(sessionToken);
    const isStaffRole = payload?.role && ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT', 'OPERATOR'].includes(payload.role);
    const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/operator');

    // Enforce tenant isolation for regular users (Staff roles have global multi-tenant access in /admin)
    const isTenantMismatch = !isStaffRole && !isAdminPath && (!payload || normalizeTenantId(payload.tenantId) !== finalTenantId);

    if (!payload || isTenantMismatch) {
      if (isRSC) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const response = NextResponse.redirect(resolveRedirectUrl(ROUTES.AUTH.LOGIN));
      response.cookies.set('session_token', '', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 0,
      });
      return applyStickyCookie(response);
    }

    // Role verification for /admin and /operator
    if (isAdminPath) {
      if (!isStaffRole) {
        if (isRSC) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return applyStickyCookie(NextResponse.redirect(resolveRedirectUrl(ROUTES.DASHBOARD.HOME)));
      }
    }
  }

  // Set headers for layout detection and tenant isolation
  requestHeaders.set('x-pathname', pathname);

  // Generate cryptographic Nonce for strict-dynamic CSP (V-05)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  requestHeaders.set('x-nonce', nonce);

  // Nonce-based Content Security Policy (PCI DSS 4.0 / OWASP ASVS 4.0.3)
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://yookassa.ru https://auth.robokassa.ru;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://yookassa.ru https://auth.robokassa.ru;
    frame-ancestors 'self';
    frame-src 'self' https://challenges.cloudflare.com https://yookassa.ru https://auth.robokassa.ru;
    connect-src 'self' https://challenges.cloudflare.com https://yookassa.ru https://auth.robokassa.ru https://api.cryptobot.org https://api.telegram.org;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  requestHeaders.set('Content-Security-Policy', cspHeader);

  // Handle ref cookie if present in URL query
  const ref = request.nextUrl.searchParams.get('ref');
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-tenant-id', finalTenantId);
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  response.headers.set('x-build-id', '5cfea0248; 2026-08-29T14:00Z');
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
