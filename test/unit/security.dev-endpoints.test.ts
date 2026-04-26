/**
 * T-003: Security test for dev-only endpoints.
 * Verifies that /api/dev/* endpoints are blocked in production.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

describe('🔒 SEC-001: Dev Endpoints — Production Guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe('POST /api/dev/sandbox/yookassa', () => {
    it('SEC-YOOKASSA-001: Returns 403 in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const { POST } = await import(
        '@/app/api/dev/sandbox/yookassa/route'
      );
      const req = new NextRequest('http://localhost:3000/api/dev/sandbox/yookassa', {
        method: 'POST',
        body: JSON.stringify({ userId: 'attacker-id', amount: 99999 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Not available in production');
    });

    it('SEC-YOOKASSA-002: Blocks unauthenticated requests in dev', async () => {
      vi.stubEnv('NODE_ENV', 'test'); // non-production

      // Mock requireAdmin to return unauthorized
      vi.doMock('@/lib/server/rbac', () => ({
        requireAdmin: vi.fn().mockResolvedValue({ success: false, error: 'Unauthorized access' }),
      }));

      const { POST } = await import(
        '@/app/api/dev/sandbox/yookassa/route'
      );
      const req = new NextRequest('http://localhost:3000/api/dev/sandbox/yookassa', {
        method: 'POST',
        body: JSON.stringify({ userId: 'attacker-id', amount: 99999 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req);
      // Should be 401 (unauthorized) not 200
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/dev/mock-provider', () => {
    it('SEC-MOCK-001: Returns 403 in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const { POST } = await import(
        '@/app/api/dev/mock-provider/route'
      );
      const req = new NextRequest('http://localhost:3000/api/dev/mock-provider', {
        method: 'POST',
        body: 'key=test&action=balance',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const response = await POST(req);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Not available in production');
    });

    it('SEC-MOCK-002: Returns 403 with wrong API key in dev', async () => {
      vi.stubEnv('NODE_ENV', 'test');
      vi.stubEnv('MOCK_PROVIDER_KEY', 'secure-key-from-env');

      const { POST } = await import(
        '@/app/api/dev/mock-provider/route'
      );
      const req = new NextRequest('http://localhost:3000/api/dev/mock-provider', {
        method: 'POST',
        // Attacker sends old hardcoded key 'test'
        body: 'key=test&action=balance',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const response = await POST(req);
      expect(response.status).toBe(403);
    });

    it('SEC-MOCK-003: Allows request with correct env-configured key in dev', async () => {
      vi.stubEnv('NODE_ENV', 'test');
      vi.stubEnv('MOCK_PROVIDER_KEY', 'mock-dev-key');

      const { POST } = await import(
        '@/app/api/dev/mock-provider/route'
      );
      const req = new NextRequest('http://localhost:3000/api/dev/mock-provider', {
        method: 'POST',
        body: 'key=mock-dev-key&action=balance',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('balance');
    });
  });
});
