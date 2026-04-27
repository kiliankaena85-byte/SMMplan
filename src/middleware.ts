import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simplistic in-memory Token Bucket for Edge environments (where ioredis fails).
// In a multi-node production setup, this should be replaced with Upstash Redis.
const rateLimitMap = new Map<string, { tokens: number; lastRefill: number }>();

const REFILL_RATE = 1; // 1 token per second = 60 tokens per minute
const MAX_BURST = 60; // Max allowed requests in a burst

export function middleware(request: NextRequest) {
  // Only protect /api routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = (request as any).ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    
    let bucket = rateLimitMap.get(ip);
    const now = Date.now();

    if (!bucket) {
      bucket = { tokens: MAX_BURST, lastRefill: now };
      rateLimitMap.set(ip, bucket);
    }

    // Refill logic
    const secondsPassed = Math.floor((now - bucket.lastRefill) / 1000);
    if (secondsPassed > 0) {
      bucket.tokens = Math.min(MAX_BURST, bucket.tokens + secondsPassed * REFILL_RATE);
      bucket.lastRefill = now;
    }

    // Attempt token consumption
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return NextResponse.next();
    } else {
      // 429 Too Many Requests
      return new NextResponse(
        JSON.stringify({ error: 'Too Many Requests', details: 'Rate limit exceeded. Please wait.' }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
