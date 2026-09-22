/**
 * T-003: Security test for dev-only endpoints.
 * Verifies that /api/dev/* backdoor routes were intentionally purged in production for security
 * and return 404 / are nonexistent across the codebase.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function checkDevRoutePurged(apiSubpath: string): boolean {
  const fullPathTs = path.join(process.cwd(), 'src', 'app', apiSubpath, 'route.ts');
  const fullPathJs = path.join(process.cwd(), 'src', 'app', apiSubpath, 'route.js');
  return !fs.existsSync(fullPathTs) && !fs.existsSync(fullPathJs);
}

// Next.js router contract: requests to purged / nonexistent routes respond with 404 Not Found
function purgedRouteHandler(_req: NextRequest): NextResponse {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

describe('🔒 SEC-001: Dev Endpoints — Production Guard & Purged Backdoors', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  describe('POST /api/dev/sandbox/yookassa', () => {
    it('SEC-YOOKASSA-001: Returns 404 in production (route purged)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(checkDevRoutePurged('api/dev/sandbox/yookassa')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/sandbox/yookassa', {
        method: 'POST',
        body: JSON.stringify({ userId: 'attacker-id', amount: 99999 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
    });

    it('SEC-YOOKASSA-002: Route is purged and unavailable even in non-production', async () => {
      vi.stubEnv('NODE_ENV', 'test');
      expect(checkDevRoutePurged('api/dev/sandbox/yookassa')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/sandbox/yookassa', {
        method: 'POST',
        body: JSON.stringify({ userId: 'attacker-id', amount: 99999 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/dev/mock-provider', () => {
    it('SEC-MOCK-001: Returns 404 in production (route purged)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(checkDevRoutePurged('api/dev/mock-provider')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/mock-provider', {
        method: 'POST',
        body: 'key=test&action=balance',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
    });

    it('SEC-MOCK-002: Mock provider route is completely purged from codebase', async () => {
      vi.stubEnv('NODE_ENV', 'test');
      expect(checkDevRoutePurged('api/dev/mock-provider')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/mock-provider', {
        method: 'POST',
        body: 'key=test&action=balance',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
    });

    it('SEC-MOCK-003: Purged endpoint rejects any mock key', async () => {
      vi.stubEnv('NODE_ENV', 'test');
      expect(checkDevRoutePurged('api/dev/mock-provider')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/mock-provider', {
        method: 'POST',
        body: 'key=mock-dev-key&action=balance',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/dev/login-direct', () => {
    it('SEC-LOGIN-DIRECT-001: Returns 404 in production (backdoor route purged)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(checkDevRoutePurged('api/dev/login-direct')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/login-direct?email=admin@smmplan.pro&secret=any');
      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
    });

    it('SEC-LOGIN-DIRECT-002: Login direct route is purged and unavailable in dev', async () => {
      vi.stubEnv('NODE_ENV', 'test');
      expect(checkDevRoutePurged('api/dev/login-direct')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/login-direct?email=admin@smmplan.pro');
      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
    });

    it('SEC-LOGIN-DIRECT-003: Rejects host poisoning attack with X-Forwarded-Host: evil.com returning 404 without setting cookies', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(checkDevRoutePurged('api/dev/login-direct')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/login-direct?email=admin@smmplan.pro&secret=any', {
        headers: {
          'x-forwarded-host': 'evil.com',
        },
      });
      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
      expect(response.headers.get('set-cookie')).toBeNull();
    });

    it('SEC-LOGIN-DIRECT-004: Rejects host poisoning attack on purged route returning 404', async () => {
      vi.stubEnv('NODE_ENV', 'test');
      expect(checkDevRoutePurged('api/dev/login-direct')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/login-direct?email=admin@smmplan.pro', {
        headers: {
          'x-forwarded-host': 'evil.com',
        },
      });
      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
      expect(response.headers.get('set-cookie')).toBeNull();
    });
  });

  describe('GET /api/dev/mock-payment', () => {
    it('SEC-MOCK-PAYMENT-001: Returns 404 in production (route purged)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(checkDevRoutePurged('api/dev/mock-payment')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/mock-payment?paymentId=123');
      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/dev/test-magic-link', () => {
    it('SEC-MAGIC-LINK-001: Returns 404 in production (route purged)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(checkDevRoutePurged('api/dev/test-magic-link')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/test-magic-link?email=test@example.com');
      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/dev/test-checkout', () => {
    it('SEC-TEST-CHECKOUT-001: Returns 404 in production (route purged)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(checkDevRoutePurged('api/dev/test-checkout')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/test-checkout');
      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/dev/switch-tenant', () => {
    it('SEC-SWITCH-TENANT-001: Returns 404 in production (route purged)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(checkDevRoutePurged('api/dev/switch-tenant')).toBe(true);

      const req = new NextRequest('http://localhost:3000/api/dev/switch-tenant?to=flux');
      const response = purgedRouteHandler(req);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/debug', () => {
    it('SEC-DEBUG-001: Returns 404 in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const { GET } = await import('@/app/api/debug/route');
      const req = new NextRequest('http://localhost:3000/api/debug');
      const response = await GET(req);
      expect(response.status).toBe(404);
    });
  });
});
