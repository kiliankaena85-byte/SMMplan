import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

describe('🔒 SEC-WEBHOOKS: Cryptography & Webhook Access Guards', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  describe('YooKassa Webhook (/api/webhooks/yookassa)', () => {
    it('SEC-YOO-001: Returns 403 Forbidden when request comes from an untrusted IP address', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.doMock('@/utils/ip', () => ({
        getClientIp: vi.fn().mockResolvedValue('203.0.113.199'),
      }));
      vi.doMock('@/lib/settings', () => ({
        SettingsProvider: { isTestMode: vi.fn().mockResolvedValue(false) },
      }));
      vi.doMock('@/lib/db', () => ({
        db: { securityEvent: { create: vi.fn().mockResolvedValue({}) } },
      }));

      const { POST } = await import('@/app/api/webhooks/yookassa/route');
      const req = new NextRequest('https://smmplan.pro/api/webhooks/yookassa', {
        method: 'POST',
        body: JSON.stringify({ event: 'payment.succeeded' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized IP');
    });

    it('SEC-YOO-002: Returns 403 Forbidden when x-sha256-signature is missing and secret is configured', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('YOOKASSA_WEBHOOK_SECRET', 'test-yookassa-secret-key-12345');
      vi.doMock('@/utils/ip', () => ({
        getClientIp: vi.fn().mockResolvedValue('185.75.120.15'), // Trusted YooKassa IP prefix
      }));
      vi.doMock('@/lib/settings', () => ({
        SettingsProvider: { isTestMode: vi.fn().mockResolvedValue(false) },
      }));
      vi.doMock('@/lib/db', () => ({
        db: { securityEvent: { create: vi.fn().mockResolvedValue({}) } },
      }));

      const { POST } = await import('@/app/api/webhooks/yookassa/route');
      const req = new NextRequest('https://smmplan.pro/api/webhooks/yookassa', {
        method: 'POST',
        body: JSON.stringify({ event: 'payment.succeeded' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Missing webhook signature');
    });

    it('SEC-YOO-003: Returns 403 Forbidden when HMAC signature does not match payload', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const secret = 'test-yookassa-secret-key-12345';
      vi.stubEnv('YOOKASSA_WEBHOOK_SECRET', secret);
      vi.doMock('@/utils/ip', () => ({
        getClientIp: vi.fn().mockResolvedValue('185.75.120.15'),
      }));
      vi.doMock('@/lib/settings', () => ({
        SettingsProvider: { isTestMode: vi.fn().mockResolvedValue(false) },
      }));
      vi.doMock('@/lib/db', () => ({
        db: { securityEvent: { create: vi.fn().mockResolvedValue({}) } },
      }));

      const { POST } = await import('@/app/api/webhooks/yookassa/route');
      const rawBody = JSON.stringify({ event: 'payment.succeeded' });
      const req = new NextRequest('https://smmplan.pro/api/webhooks/yookassa', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'x-sha256-signature': '0000000000000000000000000000000000000000000000000000000000000000',
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Invalid signature');
    });
  });

  describe('Provider Webhook (/api/webhooks/provider/[providerName])', () => {
    it('SEC-PROV-001: Returns 403 Forbidden when x-timestamp header is missing', async () => {
      const { POST } = await import('@/app/api/webhooks/provider/[providerName]/route');
      const req = new NextRequest('https://smmplan.pro/api/webhooks/provider/vexboost', {
        method: 'POST',
        body: JSON.stringify({ orderId: '123', status: 'COMPLETED' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await POST(req, { params: Promise.resolve({ providerName: 'vexboost' }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Missing x-timestamp header');
    });

    it('SEC-PROV-002: Returns 403 Forbidden when timestamp is older than 5 minutes (replay defense)', async () => {
      const { POST } = await import('@/app/api/webhooks/provider/[providerName]/route');
      const staleTimestamp = String(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const req = new NextRequest('https://smmplan.pro/api/webhooks/provider/vexboost', {
        method: 'POST',
        body: JSON.stringify({ orderId: '123', status: 'COMPLETED' }),
        headers: {
          'Content-Type': 'application/json',
          'x-timestamp': staleTimestamp,
        },
      });

      const res = await POST(req, { params: Promise.resolve({ providerName: 'vexboost' }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Webhook timestamp expired or invalid');
    });

    it('SEC-PROV-003: Returns 403 Forbidden when x-signature header is missing', async () => {
      vi.doMock('@/lib/db', () => ({
        db: {
          provider: {
            findUnique: vi.fn().mockResolvedValue({
              name: 'vexboost',
              isActive: true,
              apiKey: 'test-provider-key',
            }),
          },
        },
      }));

      const { POST } = await import('@/app/api/webhooks/provider/[providerName]/route');
      const freshTimestamp = String(Date.now());
      const req = new NextRequest('https://smmplan.pro/api/webhooks/provider/vexboost', {
        method: 'POST',
        body: JSON.stringify({ orderId: '123', status: 'COMPLETED' }),
        headers: {
          'Content-Type': 'application/json',
          'x-timestamp': freshTimestamp,
        },
      });

      const res = await POST(req, { params: Promise.resolve({ providerName: 'vexboost' }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Missing x-signature header');
    });

    it('SEC-PROV-004: Returns 403 Forbidden when HMAC signature is invalid', async () => {
      vi.doMock('@/lib/db', () => ({
        db: {
          provider: {
            findUnique: vi.fn().mockResolvedValue({
              name: 'vexboost',
              isActive: true,
              apiKey: 'test-provider-key',
            }),
          },
        },
      }));

      const { POST } = await import('@/app/api/webhooks/provider/[providerName]/route');
      const freshTimestamp = String(Date.now());
      const req = new NextRequest('https://smmplan.pro/api/webhooks/provider/vexboost', {
        method: 'POST',
        body: JSON.stringify({ orderId: '123', status: 'COMPLETED' }),
        headers: {
          'Content-Type': 'application/json',
          'x-timestamp': freshTimestamp,
          'x-signature': '0000000000000000000000000000000000000000000000000000000000000000',
        },
      });

      const res = await POST(req, { params: Promise.resolve({ providerName: 'vexboost' }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Invalid HMAC signature');
    });
  });

  describe('Cryptography Invariants (src/lib/crypto/encryption.ts)', () => {
    it('SEC-CRYPTO-001: Encrypts and decrypts with authenticated AES-256-GCM', async () => {
      vi.stubEnv('DATA_ENCRYPTION_KEY', 'master-encryption-key-for-test-32b');
      const { encrypt, decrypt } = await import('@/lib/crypto/encryption');

      const plain = 'secret-api-token-value-2026';
      const cipher = encrypt(plain);
      expect(cipher).not.toBe(plain);
      expect(cipher.split(':').length).toBe(3);

      const decrypted = decrypt(cipher);
      expect(decrypted).toBe(plain);
    });

    it('SEC-CRYPTO-002: Throws on corrupted ciphertext / auth tag failure', async () => {
      vi.stubEnv('DATA_ENCRYPTION_KEY', 'master-encryption-key-for-test-32b');
      const { encrypt, decrypt } = await import('@/lib/crypto/encryption');

      const cipher = encrypt('sensitive-info');
      const parts = cipher.split(':');
      parts[2] = parts[2].slice(0, -2) + '00';
      const corrupted = parts.join(':');

      expect(() => decrypt(corrupted)).toThrow(/Decryption failed/);
    });

    it('SEC-CRYPTO-003: maskEmail safely obfuscates user email for logs and UI', async () => {
      const { maskEmail } = await import('@/lib/crypto/encryption');
      expect(maskEmail('john.doe@example.com')).toBe('j*****e@example.com');
      expect(maskEmail('a@b.com')).toBe('a*@b.com');
      expect(maskEmail('')).toBe('••••••••');
    });
  });
});
