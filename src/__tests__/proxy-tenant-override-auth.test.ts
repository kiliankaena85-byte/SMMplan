import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

vi.mock('@/lib/session-edge', () => ({
  decryptSessionToken: vi.fn()
}));

import { decryptSessionToken } from '@/lib/session-edge';

describe('SEC-03: ?tenant= Override Staff Authentication Guard on Production', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it('ignores ?tenant= override on production when unauthenticated and resolves to smmplan', async () => {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production';
    process.env.CONTOUR = 'prod';

    const req = new NextRequest('https://smmplan.pro/services?tenant=flux', {
      headers: {
        host: 'smmplan.pro'
      }
    });

    const res = await proxy(req);
    expect(res.headers.get('x-tenant-id')).toBe('smmplan');
  });

  it('ignores ?tenant= override on production for regular USER role and resolves to smmplan', async () => {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production';
    process.env.CONTOUR = 'prod';

    vi.mocked(decryptSessionToken).mockResolvedValueOnce({
      sessionId: 'sess-1',
      userId: 'user-1',
      role: 'USER',
      tenantId: 'smmplan'
    });

    const req = new NextRequest('https://smmplan.pro/services?tenant=flux', {
      headers: {
        host: 'smmplan.pro',
        cookie: 'session_token=mock_user_token'
      }
    });

    const res = await proxy(req);
    expect(res.headers.get('x-tenant-id')).toBe('smmplan');
  });

  it('permits ?tenant= override on production for ADMIN staff role and resolves to flux', async () => {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production';
    process.env.CONTOUR = 'prod';

    vi.mocked(decryptSessionToken).mockResolvedValueOnce({
      sessionId: 'sess-admin',
      userId: 'admin-1',
      role: 'ADMIN',
      tenantId: 'smmplan'
    });

    const req = new NextRequest('https://smmplan.pro/services?tenant=flux', {
      headers: {
        host: 'smmplan.pro',
        cookie: 'session_token=mock_admin_token'
      }
    });

    const res = await proxy(req);
    expect(res.headers.get('x-tenant-id')).toBe('flux');
  });

  it('permits unrestricted ?tenant= override on test contour for QA workflow', async () => {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production';
    process.env.CONTOUR = 'test';

    const req = new NextRequest('https://test.smmplan.pro/services?tenant=flux', {
      headers: {
        host: 'test.smmplan.pro'
      }
    });

    const res = await proxy(req);
    expect(res.headers.get('x-tenant-id')).toBe('flux');
  });
});
