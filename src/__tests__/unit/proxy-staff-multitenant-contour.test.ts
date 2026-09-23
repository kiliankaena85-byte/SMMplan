import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

vi.mock('@/lib/session-edge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/session-edge')>();
  return {
    ...actual,
    decryptSessionToken: vi.fn(),
    readSessionTokenFromCookies: vi.fn().mockReturnValue('mock_token'),
  };
});

import { decryptSessionToken } from '@/lib/session-edge';

describe('OmniSMM 1.0 Staff Multi-Tenant Contour Isolation in Proxy', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it('allows staff (OWNER/ADMIN with undefined role in JWT) with smmplan token to access smmflux.ru/admin/dashboard without redirect to login', async () => {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production';
    process.env.CONTOUR = 'flux';

    // Staff session payload: role is undefined (per P2-10, read dynamically by Server Component), userId exists
    vi.mocked(decryptSessionToken).mockResolvedValueOnce({
      sessionId: 'sess-owner',
      userId: 'owner-uuid-123',
      role: undefined,
      tenantId: 'smmplan',
      contour: 'prod',
    });

    const req = new NextRequest('https://smmflux.ru/admin/dashboard', {
      headers: {
        host: 'smmflux.ru',
        cookie: 'session_token=mock_owner_token',
      },
    });

    const res = await proxy(req);
    // Should NOT redirect to /login and should NOT have status 307 to login
    const location = res.headers.get('location');
    expect(location).toBeNull();
    expect(res.status).not.toBe(307);
  });

  it('rejects regular USER with smmplan token accessing smmflux.ru customer dashboard', async () => {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production';
    process.env.CONTOUR = 'flux';

    // Regular customer session payload
    vi.mocked(decryptSessionToken).mockResolvedValueOnce({
      sessionId: 'sess-user',
      userId: 'user-uuid-456',
      role: 'USER',
      tenantId: 'smmplan',
      contour: 'prod',
    });

    const req = new NextRequest('https://smmflux.ru/dashboard', {
      headers: {
        host: 'smmflux.ru',
        cookie: 'session_token=mock_user_token',
      },
    });

    const res = await proxy(req);
    // Regular customer must be rejected and redirected to login due to contour/tenant mismatch
    const location = res.headers.get('location');
    expect(location).toContain('/login');
  });
});
