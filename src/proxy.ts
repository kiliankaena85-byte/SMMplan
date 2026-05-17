import { NextResponse } from 'next/server';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { ROUTES } from '@/lib/routes';

// Map of legacy routes to new static routes
const legacyRedirects: Record<string, string> = {
  '/p/offer': ROUTES.LEGAL.TERMS,
  '/p/terms': ROUTES.LEGAL.TERMS,
  '/p/privacy': ROUTES.LEGAL.PRIVACY,
  '/p/refund': ROUTES.LEGAL.REFUND,
  '/p/faq': ROUTES.FAQ,
};

export async function proxy(req: Request) {
  const url = new URL(req.url);

  // Check if the exact pathname matches a legacy route
  const newPath = legacyRedirects[url.pathname];
  if (newPath) {
    const redirectUrl = new URL(newPath, req.url);
    
    // If the new path has a hash (like /#faq), we must assign it
    if (newPath.includes('#')) {
      const [pathPart, hashPart] = newPath.split('#');
      redirectUrl.pathname = pathPart;
      redirectUrl.hash = hashPart;
    }
    
    return NextResponse.redirect(redirectUrl, 301); // 301 Permanent Redirect
  }

  // [SECURITY] PB-002: Apply rate limiting only to public APIs to shield from scrapers/bots
  if (url.pathname.startsWith('/api/')) {
    const { getClientIp } = await import('@/utils/ip');
    const ip = await getClientIp();
    
    // Call the robust, Node.js-compatible Redis + Postgres RateLimitService!
    // Since proxy in Next.js 16 runs in the Node.js runtime (not Edge), ioredis and Prisma work seamlessly.
    // Implement Fail-Open timeout (300ms) to prevent Redis from blocking the entire proxy
    const checkPromise = RateLimitService.check(url.pathname, 60, 60, false);
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        console.error(`[PROXY] RateLimitService timeout on ${url.pathname} - Failing OPEN`);
        resolve(true); // Fail-open
      }, 300);
    });

    const isAllowed = await Promise.race([checkPromise, timeoutPromise]);
    
    if (!isAllowed) {
      console.warn(`[PROXY] Rate Limit Exceeded for IP: ${ip} on API: ${url.pathname}`);
      return new NextResponse(
        JSON.stringify({ error: 'Too Many Requests', message: 'You have exceeded the rate limit. Please try again later.' }), 
        { 
          status: 429, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
  
  const ref = url.searchParams.get('ref');
  const response = NextResponse.next();

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

// See "Matching Paths" below to learn more
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
