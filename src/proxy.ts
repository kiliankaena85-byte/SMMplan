import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decryptSessionToken } from '@/lib/session-edge';
import { ROUTES } from '@/lib/routes';
import { BUILD_ID } from '@/lib/build-info';
import { resolveTenantFromHostEdge, normalizeTenantId, resolveContourFromHost, type ContourId } from '@/lib/tenant-resolver-edge';

// Map of legacy routes to new static routes
const legacyRedirects: Record<string, string> = {
  '/register': '/login?tab=register',
  '/p/offer': ROUTES.LEGAL.TERMS,
  '/p/terms': ROUTES.LEGAL.TERMS,
  '/p/privacy': ROUTES.LEGAL.PRIVACY,
  '/p/refund': ROUTES.LEGAL.REFUND,
  '/p/faq': ROUTES.FAQ,
};

// N-10.3: Strict Trusted Contour Domain Allowlist
const TRUSTED_CONTOUR_MAP: Record<ContourId, Set<string>> = {
  test: new Set([
    'test.smmplan.pro',
    'test-flux.smmplan.pro',
    'smmplan.pro',
    'www.smmplan.pro',
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'host.docker.internal',
  ]),
  prod: new Set([
    'smmplan.pro',
    'www.smmplan.pro',
  ]),
  flux: new Set([
    'smmflux.ru',
    'www.smmflux.ru',
    'flux.smmplan.pro',
    'flux.smmplan.ru',
    'smmflux.local',
    'flux.local',
  ]),
};

const ALLOWED_CONTOUR_DOMAINS = new Set([
  'smmplan.pro',
  'www.smmplan.pro',
  'test.smmplan.pro',
  'test-flux.smmplan.pro',
  'smmflux.ru',
  'www.smmflux.ru',
  'flux.smmplan.pro',
  'flux.smmplan.ru',
  'smmflux.local',
  'flux.local',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'host.docker.internal'
]);

export const INTERNAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'host.docker.internal'
]);

export function isInternalHost(h: string | null | undefined): boolean {
  if (!h) return false;
  const clean = h.split(':')[0].toLowerCase().trim();
  return INTERNAL_HOSTS.has(clean);
}

function getActiveServerContour(): ContourId {
  if (process.env.CONTOUR === 'test' || process.env.CONTOUR === 'prod' || process.env.CONTOUR === 'flux') {
    return process.env.CONTOUR;
  }
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || '';
  if (appUrl) {
    try {
      return resolveContourFromHost(new URL(appUrl).host);
    } catch {}
  }
  if (process.env.NODE_ENV === 'development') {
    return 'test';
  }
  return 'prod';
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Strip any client-supplied x-tenant-id to prevent spoofing
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-tenant-id');

  const hostHeader = request.headers.get('host');
  const fwdHost = request.headers.get('x-forwarded-host');
  const fwdProto = request.headers.get('x-forwarded-proto');

  let host = (fwdHost && !isInternalHost(fwdHost))
    ? fwdHost
    : (hostHeader || '');

  if (isInternalHost(host) || !host) {
    host = process.env.APP_URL ? new URL(process.env.APP_URL).host : 'test.smmplan.pro';
  }

  const proto = fwdProto || (process.env.NODE_ENV === 'production' && !isInternalHost(host) ? 'https' : 'http');
  const originBase = `${proto}://${host}`;

  const resolveRedirectUrl = (target: string | URL): URL => {
    if (target instanceof URL) {
      if (isInternalHost(target.hostname)) {
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
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

  const fromQuery = normalizeTenantId(request.nextUrl.searchParams.get('tenant'));
  const fromCookie = normalizeTenantId(request.cookies.get('x_tenant')?.value);
  const fromAdminCookie = normalizeTenantId(request.cookies.get('x_admin_tenant')?.value);
  const fromHost = normalizeTenantId(resolveTenantFromHostEdge(host));

  let finalTenantId = 'smmplan';
  let isExplicitTenant = false;

  const activeContour = getActiveServerContour();
  const STAFF_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT', 'OPERATOR']);

  let isAllowedQueryTenant = true;
  if (fromQuery && activeContour !== 'test' && process.env.NODE_ENV === 'production' && !isLocalhost) {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      isAllowedQueryTenant = false;
    } else {
      const payload = await decryptSessionToken(sessionToken);
      if (!payload || !payload.role || !STAFF_ROLES.has(payload.role)) {
        isAllowedQueryTenant = false;
      }
    }
  }

  // 1. Explicit query parameter override (permitted for staff on prod, or unrestricted on test/localhost)
  if (fromQuery && isAllowedQueryTenant) {
    finalTenantId = fromQuery;
    isExplicitTenant = true;
  }
  // 2. Global Site Switcher for Admin/Operator panels
  else if (fromAdminCookie && (pathname.startsWith('/admin') || pathname.startsWith('/operator')) && request.cookies.has('session_token')) {
    finalTenantId = fromAdminCookie;
  }
  // 3. Dedicated Domain Resolution (test.smmplan.pro -> smmplan, flux.smmplan.pro -> flux) - ABSOLUTE PRIORITY OVER STALE COOKIES
  else if (fromHost && !isLocalhost) {
    finalTenantId = fromHost;
  }
  // 4. Local Development Cookie Fallback (only on localhost:3000 / 127.0.0.1)
  else if (isLocalhost && fromCookie) {
    finalTenantId = fromCookie;
    isExplicitTenant = true;
  }
  // 5. Default Fallback
  else {
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

  // 0.1 N-10.3: Strict Host & Cross-Contour Spoofing Shield (OWASP A01 / A05)
  const isSecurityTxt = pathname === '/.well-known/security.txt' || pathname === '/security.txt';
  const rawHostClean = (hostHeader || '').split(':')[0].toLowerCase();
  const rawFwdClean = (fwdHost || '').split(':')[0].toLowerCase();

  // If host is completely unknown
  if (rawHostClean && !ALLOWED_CONTOUR_DOMAINS.has(rawHostClean) && !isSecurityTxt) {
    return NextResponse.json({ error: 'Forbidden: Invalid Host header' }, { status: 403 });
  }

  // Cross-contour spoofing check (e.g. connecting to smmplan.pro with Host: test.smmplan.pro or vice versa)
  if (rawHostClean && rawFwdClean && rawHostClean !== rawFwdClean && !isSecurityTxt) {
    if (!isInternalHost(rawFwdClean) && !isInternalHost(rawHostClean)) {
      return NextResponse.json(
        { error: 'Forbidden: Cross-contour host header spoofing detected' },
        { status: 403 }
      );
    }
  }

  // Strict validation against current active server contour (TRUSTED_CONTOUR_MAP)
  const allowedForContour = TRUSTED_CONTOUR_MAP[activeContour];
  const effectiveHost = (rawFwdClean && !isInternalHost(rawFwdClean)) ? rawFwdClean : rawHostClean;

  if (effectiveHost && allowedForContour && !isInternalHost(effectiveHost) && !allowedForContour.has(effectiveHost) && !isSecurityTxt) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Forbidden: Host not permitted for active server contour' },
        { status: 403 }
      );
    }
  }

  // 1. Instant UI Logout Interception (/logout or /api/auth/logout)
  if (pathname === '/logout' || pathname === '/api/auth/logout') {
    const res = NextResponse.redirect(resolveRedirectUrl(ROUTES.AUTH.LOGIN), 307);
    res.cookies.set('explicit_logout', 'true', {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
    });
    res.cookies.set('session_token', '', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
    });
    return applyStickyCookie(res);
  }

  // 1.5 Production Maintenance Gate
  // Activated strictly only if MAINTENANCE_MODE is explicitly set to 'true' in env
  const isMaintenanceActive = process.env.MAINTENANCE_MODE === 'true';

  if (isMaintenanceActive) {
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
          { error: 'Service Unavailable - Platform under maintenance' },
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

  // 4. Auth Route Protection & N-10.5 Strict Redirection
  const protectedPaths = ['/admin', '/dashboard', '/operator'];
  if (protectedPaths.some(p => pathname.startsWith(p))) {
    const sessionToken = request.cookies.get('session_token')?.value;
    const explicitLogout = request.cookies.get('explicit_logout')?.value;
    const isRSC = request.headers.has('rsc') || request.headers.has('next-action');

    if (explicitLogout === 'true' || !sessionToken) {
      if (isRSC) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const res = NextResponse.redirect(resolveRedirectUrl(ROUTES.AUTH.LOGIN), 307);
      res.cookies.set('session_token', '', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
      });
      return applyStickyCookie(res);
    }

    const payload = await decryptSessionToken(sessionToken);
    const isStaffRole = payload?.role && ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT', 'OPERATOR'].includes(payload.role);
    const isAdminPath = pathname.startsWith('/admin');
    const isOperatorPath = pathname.startsWith('/operator');

    // Enforce tenant isolation for regular users (Staff roles have global multi-tenant access)
    const isTenantMismatch = !isStaffRole && !isAdminPath && !isOperatorPath && (!payload || normalizeTenantId(payload.tenantId) !== finalTenantId);

    // Enforce contour matching in JWT (tokens issued in test contour cannot be used in prod contour)
    const currentContour = resolveContourFromHost(host);
    const tokenContour = payload?.contour || (normalizeTenantId(payload?.tenantId) === 'flux' ? 'flux' : 'test');
    const isContourMismatch = payload?.role !== 'OWNER' && tokenContour !== currentContour;

    if (!payload || isTenantMismatch || isContourMismatch) {
      if (isRSC) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const response = NextResponse.redirect(resolveRedirectUrl(ROUTES.AUTH.LOGIN), 307);
      response.cookies.set('session_token', '', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
      });
      return applyStickyCookie(response);
    }

    // Role verification for /admin and /operator
    if (isAdminPath) {
      const isAdminRole = payload.role && ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'].includes(payload.role);
      if (!isAdminRole) {
        if (isRSC) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (payload.role === 'OPERATOR') {
          return applyStickyCookie(NextResponse.redirect(resolveRedirectUrl('/operator'), 307));
        }
        return applyStickyCookie(NextResponse.redirect(resolveRedirectUrl(ROUTES.DASHBOARD.HOME), 307));
      }
    }

    if (isOperatorPath) {
      if (!isStaffRole) {
        if (isRSC) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return applyStickyCookie(NextResponse.redirect(resolveRedirectUrl(ROUTES.DASHBOARD.HOME), 307));
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
    report-uri /api/telemetry/csp-report;
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
  response.headers.set('x-build-id', BUILD_ID);
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
