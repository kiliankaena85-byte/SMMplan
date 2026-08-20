import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

describe('🧪 Mock Provider Sandbox API (SMM API v2)', () => {
  const TEST_KEY = 'test-mock-secret-key-2026';

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ENABLE_DEV_ROUTES', 'true');
    vi.stubEnv('MOCK_PROVIDER_KEY', TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const createRequest = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams({ key: TEST_KEY, ...params });
    return new NextRequest('http://localhost:3000/api/dev/mock-provider', {
      method: 'POST',
      body: searchParams.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  };

  describe('1. Auth & Security Guards', () => {
    it('returns 503 if MOCK_PROVIDER_KEY is not set in env', async () => {
      vi.stubEnv('MOCK_PROVIDER_KEY', '');
      const req = new NextRequest('http://localhost:3000/api/dev/mock-provider', {
        method: 'POST',
        body: 'key=any&action=balance',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const res = await POST(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toContain('MOCK_PROVIDER_KEY not set');
    });

    it('returns 403 if key does not match MOCK_PROVIDER_KEY', async () => {
      const req = new NextRequest('http://localhost:3000/api/dev/mock-provider', {
        method: 'POST',
        body: 'key=wrong-key&action=balance',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Incorrect API key');
    });

    it('returns 404 in production if isTestMode=false and ENABLE_DEV_ROUTES!=true', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('ENABLE_DEV_ROUTES', 'false');

      vi.doMock('@/lib/settings', () => ({
        SettingsProvider: {
          isTestMode: vi.fn().mockResolvedValue(false),
        },
      }));

      const req = createRequest({ action: 'balance' });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });
  });

  describe('2. Balance Action', () => {
    it('returns balance and currency', async () => {
      const req = createRequest({ action: 'balance' });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        balance: '150000.00',
        currency: 'RUB',
      });
    });
  });

  describe('3. Services Action', () => {
    it('returns catalog of mock services with proper fields', async () => {
      const req = createRequest({ action: 'services' });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json.length).toBeGreaterThanOrEqual(4);

      const tg = json.find((s: any) => s.service === '100');
      expect(tg).toBeDefined();
      expect(tg.name).toContain('Telegram');
      expect(tg.dripfeed).toBe(true);
      expect(tg.refill).toBe(true);
      expect(tg.cancel).toBe(true);
    });
  });

  describe('4. Add Order Action & Chaos Triggers', () => {
    it('creates standard order with deterministic ID', async () => {
      const req = createRequest({
        action: 'add',
        service: '100',
        link: 'https://t.me/mychannel',
        quantity: '500',
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.order).toMatch(/^mock_std_\d+_q500$/);
    });

    it('creates partial simulation order if link contains "partial"', async () => {
      const req = createRequest({
        action: 'add',
        service: '100',
        link: 'https://t.me/channel-partial-test',
        quantity: '1000',
      });
      const res = await POST(req);
      const json = await res.json();
      expect(json.order).toMatch(/^mock_partial_\d+_q1000$/);
    });

    it('creates canceled simulation order if link contains "canceled"', async () => {
      const req = createRequest({
        action: 'add',
        service: '100',
        link: 'https://t.me/channel-canceled-test',
        quantity: '300',
      });
      const res = await POST(req);
      const json = await res.json();
      expect(json.order).toMatch(/^mock_canceled_\d+_q300$/);
    });

    it('triggers "Not enough balance" error on fail-create link', async () => {
      const req = createRequest({
        action: 'add',
        service: '100',
        link: 'https://test.me/fail-create',
        quantity: '100',
      });
      const res = await POST(req);
      const json = await res.json();
      expect(json.error).toBe('Not enough balance on provider');
    });

    it('triggers "Invalid link format" error on bad-link trigger', async () => {
      const req = createRequest({
        action: 'add',
        service: '100',
        link: 'https://test.me/bad-link',
        quantity: '100',
      });
      const res = await POST(req);
      const json = await res.json();
      expect(json.error).toBe('Invalid link format or private profile');
    });

    it('triggers HTTP 500 error on http-500 trigger', async () => {
      const req = createRequest({
        action: 'add',
        service: '100',
        link: 'https://test.me/http-500',
        quantity: '100',
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain('Chaos 500');
    });
  });

  describe('5. Status Action (Single & Multi)', () => {
    it('returns Completed for old standard order (>20s old)', async () => {
      const oldTimestamp = Date.now() - 30000;
      const orderId = `mock_std_${oldTimestamp}_q500`;
      const req = createRequest({ action: 'status', order: orderId });
      const res = await POST(req);
      const json = await res.json();

      expect(json.status).toBe('Completed');
      expect(json.remains).toBe('0');
      expect(json.charge).toBe('5.00');
    });

    it('returns Pending for recent order (<8s old)', async () => {
      const freshTimestamp = Date.now() - 2000;
      const orderId = `mock_std_${freshTimestamp}_q500`;
      const req = createRequest({ action: 'status', order: orderId });
      const res = await POST(req);
      const json = await res.json();

      expect(json.status).toBe('Pending');
      expect(json.remains).toBe('500');
    });

    it('returns Partial with remains for partial order (>8s old)', async () => {
      const timestamp = Date.now() - 15000;
      const orderId = `mock_partial_${timestamp}_q1000`;
      const req = createRequest({ action: 'status', order: orderId });
      const res = await POST(req);
      const json = await res.json();

      expect(json.status).toBe('Partial');
      expect(json.remains).toBe('400');
      expect(Number(json.charge)).toBeGreaterThan(0);
    });

    it('returns Canceled for canceled order (>6s old)', async () => {
      const timestamp = Date.now() - 10000;
      const orderId = `mock_canceled_${timestamp}_q500`;
      const req = createRequest({ action: 'status', order: orderId });
      const res = await POST(req);
      const json = await res.json();

      expect(json.status).toBe('Canceled');
      expect(json.charge).toBe('0.00');
    });

    it('returns batch statuses for comma-separated orders', async () => {
      const id1 = `mock_std_${Date.now() - 30000}_q100`;
      const id2 = `mock_canceled_${Date.now() - 10000}_q200`;

      const req = createRequest({ action: 'status', orders: `${id1},${id2}` });
      const res = await POST(req);
      const json = await res.json();

      expect(json[id1]).toBeDefined();
      expect(json[id1].status).toBe('Completed');
      expect(json[id2]).toBeDefined();
      expect(json[id2].status).toBe('Canceled');
    });
  });

  describe('6. Refill & Refill Status Actions', () => {
    it('creates refill ID for eligible order', async () => {
      const req = createRequest({ action: 'refill', order: 'mock_std_12345_q500' });
      const res = await POST(req);
      const json = await res.json();
      expect(json.refill).toMatch(/^mock_refill_\d+_mock_std_12345_q500$/);
    });

    it('returns error for no-refill trigger', async () => {
      const req = createRequest({ action: 'refill', order: 'mock_std_12345_no-refill' });
      const res = await POST(req);
      const json = await res.json();
      expect(json.error).toContain('not eligible for refill');
    });

    it('checks refill status lifecycle', async () => {
      const oldRefill = `mock_refill_${Date.now() - 30000}_mock_123`;
      const req = createRequest({ action: 'refill_status', refill: oldRefill });
      const res = await POST(req);
      const json = await res.json();
      expect(json.status).toBe('Completed');
    });
  });

  describe('7. Cancel Action', () => {
    it('cancels single order', async () => {
      const req = createRequest({ action: 'cancel', order: 'mock_std_123' });
      const res = await POST(req);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json[0].order).toBe('mock_std_123');
      expect(json[0].cancel.status).toBe('Success');
    });

    it('cancels batch of orders', async () => {
      const req = createRequest({ action: 'cancel', orders: 'mock_1,mock_2' });
      const res = await POST(req);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json.length).toBe(2);
      expect(json[0].cancel.status).toBe('Success');
      expect(json[1].cancel.status).toBe('Success');
    });
  });
});