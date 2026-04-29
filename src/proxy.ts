import { NextResponse } from 'next/server';
import { RateLimitService } from '@/services/core/rate-limit.service';

export async function proxy(req: Request) {
  const url = new URL(req.url);

  // [SECURITY] PB-002: Apply rate limiting only to public APIs to shield from scrapers/bots
  if (url.pathname.startsWith('/api/')) {
    const forwardedFor = req.headers.get('x-forwarded-for');
    // For local dev where req.ip isn't available on standard Request, fallback to 127.0.0.1
    const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';
    
    // Call the robust, Node.js-compatible Redis + Postgres RateLimitService!
    // Since proxy in Next.js 16 runs in the Node.js runtime (not Edge), ioredis and Prisma work seamlessly.
    const isAllowed = await RateLimitService.check(url.pathname, 60, 60);
    
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
  
  return NextResponse.next();
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
