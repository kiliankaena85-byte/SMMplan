import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '@/app/api/auth/dev-login/route';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findFirst: vi.fn().mockResolvedValue({ id: 'u1', email: 'support@smmplan.pro', role: 'SUPPORT', tenantId: 'smmplan' }),
      create: vi.fn().mockResolvedValue({ id: 'u1', email: 'support@smmplan.pro', role: 'SUPPORT', tenantId: 'smmplan' }),
      update: vi.fn().mockResolvedValue({ id: 'u1', email: 'support@smmplan.pro', role: 'SUPPORT', tenantId: 'smmplan' }),
    },
    session: {
      create: vi.fn().mockResolvedValue({ id: 's1', token: 'tok' }),
    },
    systemSettings: {
      findUnique: vi.fn().mockResolvedValue({ siteName: 'SMMplan' }),
    },
  },
}));

vi.mock('@/lib/session-edge', () => ({
  getEncodedKey: vi.fn().mockReturnValue(new Uint8Array(32)),
  SESSION_COOKIE_NAME: 'session_token',
}));

describe('AUTH-01: Dev-Login Gate Hardening', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects with 404 when ALLOW_DEV_LOGIN is not explicitly set to "true"', async () => {
    process.env.ALLOW_DEV_LOGIN = 'false';
    (process.env as any).NODE_ENV = 'development';

    const req = new Request('http://localhost:3005/api/auth/dev-login', {
      headers: { host: 'localhost:3005' },
    });
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('rejects with 404 unconditionally in production mode', async () => {
    process.env.ALLOW_DEV_LOGIN = 'true';
    (process.env as any).NODE_ENV = 'production';

    const req = new Request('http://localhost:3005/api/auth/dev-login', {
      headers: { host: 'localhost:3005' },
    });
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('blocks host spoofing like evil3005.com or 3005.attacker.net with 403', async () => {
    process.env.ALLOW_DEV_LOGIN = 'true';
    (process.env as any).NODE_ENV = 'development';
    process.env.APP_ENV = 'test';

    const spoofedReq = new Request('http://evil3005.com/api/auth/dev-login', {
      headers: { host: 'evil3005.com' },
    });
    const res = await GET(spoofedReq);
    expect(res.status).toBe(403);
  });

  it('allows access only with ALLOW_DEV_LOGIN=true and valid local/stage port 3005', async () => {
    process.env.ALLOW_DEV_LOGIN = 'true';
    (process.env as any).NODE_ENV = 'development';
    process.env.APP_ENV = 'test';

    const validReq = new Request('http://localhost:3005/api/auth/dev-login?role=SUPPORT', {
      headers: { host: 'localhost:3005' },
    });
    const res = await GET(validReq);
    expect(res.status).toBe(307); // redirect to dashboard/tickets
  });
});
