import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const inMemoryWebhookHits = new Map<string, { count: number; resetAt: number }>();
const MAX_ENTRIES = 2000;
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 60; // Max 60 webhook hits per minute per IP & tenant

/**
 * IP + Tenant-scoped rate limiter for all /api/webhooks/* endpoints.
 * Executed in proxy.ts middleware BEFORE signature checking or DB lookups.
 * Returns HTTP 429 with Retry-After header if limit is exceeded.
 */
export function checkWebhookRateLimit(
  request: NextRequest,
  tenantId: string
): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith('/api/webhooks/')) {
    return null;
  }

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  // Sub-route classification (yookassa, robokassa, telegram, crypto, provider, inbound-email)
  const routeParts = pathname.split('/');
  const subRoute = routeParts[3] || 'general';

  const key = `${clientIp}:${tenantId}:${subRoute}`;
  const now = Date.now();

  let entry = inMemoryWebhookHits.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    inMemoryWebhookHits.set(key, entry);
  } else {
    entry.count += 1;
  }

  // Periodic pruning of expired entries
  if (inMemoryWebhookHits.size > MAX_ENTRIES) {
    for (const [k, e] of inMemoryWebhookHits.entries()) {
      if (e.resetAt <= now) {
        inMemoryWebhookHits.delete(k);
      }
    }
  }

  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return NextResponse.json(
      { error: 'Too Many Requests: Webhook rate limit exceeded', tenantId, retryAfter: retryAfterSec },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return null;
}

export function resetWebhookRateLimiterStore(): void {
  inMemoryWebhookHits.clear();
}
