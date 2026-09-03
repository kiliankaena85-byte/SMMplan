import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

describe('CSP Nonce-Based Styles Security Suite (P1-9)', () => {
  it('injects nonce into style-src in production proxy headers', async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';

    const req = new NextRequest('https://smmplan.pro/services', {
      headers: {
        host: 'smmplan.pro',
      },
    });

    const res = await proxy(req);
    const csp = res.headers.get('Content-Security-Policy');

    expect(csp).toBeDefined();
    expect(csp).toContain("style-src 'self' 'unsafe-inline' 'nonce-");

    (process.env as any).NODE_ENV = originalEnv;
  });
});
