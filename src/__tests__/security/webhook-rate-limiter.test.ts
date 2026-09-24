import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { checkWebhookRateLimit, resetWebhookRateLimiterStore } from '@/lib/security/webhook-rate-limiter';

describe('Item 5: Webhook Rate Limiter (/api/webhooks/*)', () => {
  beforeEach(() => {
    resetWebhookRateLimiterStore();
  });

  it('5.1 allows webhook requests under the limit (60 req/min)', () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/yookassa', {
      headers: { 'x-forwarded-for': '198.51.100.1' },
    });

    const res = checkWebhookRateLimit(req, 'smmplan');
    expect(res).toBeNull();
  });

  it('5.2 returns 429 with Retry-After when rate limit is exceeded', () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/robokassa', {
      headers: { 'x-forwarded-for': '198.51.100.2' },
    });

    // Send 60 allowed requests
    for (let i = 0; i < 60; i++) {
      const res = checkWebhookRateLimit(req, 'smmplan');
      expect(res).toBeNull();
    }

    // 61st request triggers rate limit
    const blockedRes = checkWebhookRateLimit(req, 'smmplan');
    expect(blockedRes).not.toBeNull();
    expect(blockedRes!.status).toBe(429);
    expect(blockedRes!.headers.get('Retry-After')).toBeDefined();
  });
});
