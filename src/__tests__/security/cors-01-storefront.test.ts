import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

describe('CORS-01: Storefront API CORS Restrictions', () => {
  it('does NOT reflect untrusted Origin with Access-Control-Allow-Credentials: true on preflight', async () => {
    const req = new NextRequest('http://127.0.0.1:3000/api/storefront/v1/orders', {
      method: 'OPTIONS',
      headers: {
        host: '127.0.0.1:3000',
        origin: 'https://evil-attacker.com',
      },
    });

    const res = await proxy(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull();
  });

  it('reflects authorized Origin with Access-Control-Allow-Credentials: true on preflight for allowed tenant', async () => {
    const req = new NextRequest('http://127.0.0.1:3000/api/storefront/v1/orders', {
      method: 'OPTIONS',
      headers: {
        host: '127.0.0.1:3000',
        origin: 'https://smmplan.pro',
      },
    });

    const res = await proxy(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://smmplan.pro');
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('does NOT reflect untrusted Origin with Access-Control-Allow-Credentials: true on GET response', async () => {
    const req = new NextRequest('http://127.0.0.1:3000/api/storefront/v1/orders', {
      method: 'GET',
      headers: {
        host: '127.0.0.1:3000',
        origin: 'https://evil-attacker.com',
      },
    });

    const res = await proxy(req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull();
  });

  it('reflects authorized Origin with Access-Control-Allow-Credentials: true on GET response', async () => {
    const req = new NextRequest('http://127.0.0.1:3000/api/storefront/v1/orders', {
      method: 'GET',
      headers: {
        host: '127.0.0.1:3000',
        origin: 'https://smmflux.ru',
      },
    });

    const res = await proxy(req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://smmflux.ru');
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });
});
