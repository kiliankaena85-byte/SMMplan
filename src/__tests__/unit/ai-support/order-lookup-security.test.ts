import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderLookupTool } from '@/services/support/ai/tools/order-lookup.tool';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

vi.mock('@/lib/db', () => ({
  db: {
    order: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
  },
}));

describe('OrderLookupTool Security & BOLA/IDOR Invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Zod format rejection (SQL Injection, Prompt Escape)
  it('rejects malicious or invalid orderId formats at schema level', async () => {
    const maliciousInputs = [
      '1234 OR 1=1',
      'cly12345; DROP TABLE "Order";',
      '<script>alert(1)</script>',
      'clyVeryLongStringOverTwentyFiveChars1234567890',
    ];

    for (const badId of maliciousInputs) {
      const res = await OrderLookupTool.execute({ orderId: badId }, { userId: 'user-1', tenantId: 'smmplan' });
      expect(res.found).toBe(false);
      expect(res.error).toContain('Неверный формат');
    }
  });

  // 2. IDOR Prevention (User A trying to fetch User B's order)
  it('strictly binds search to session.userId, preventing cross-user access', async () => {
    // Mock: Database finds nothing for session user
    (db.order.findFirst as any).mockResolvedValue(null);

    const res = await OrderLookupTool.execute(
      { orderId: 'cly123456789012345678901' },
      { userId: 'victim-user-1', tenantId: 'smmplan' }
    );

    expect(db.order.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'cly123456789012345678901',
        userId: 'victim-user-1', // Confirmed session binding
        tenantId: 'smmplan',
      },
      select: expect.any(Object),
    });

    expect(res.found).toBe(false);
    expect(res.message).toBe('Заказ с таким номером не найден в вашем личном кабинете.');
  });

  // 3. Sensitive Target Link Isolation
  it('never leaks target channel link in safe order snapshot', async () => {
    (db.order.findFirst as any).mockResolvedValue({
      id: '1643',
      status: 'IN_PROGRESS',
      quantity: 1000,
      remains: 250,
      charge: BigInt(18900),
      createdAt: new Date('2026-09-21T10:00:00Z'),
      service: { name: 'Telegram Подписчики', network: 'telegram' },
      link: 'https://t.me/super_secret_channel', // Even if mock had link
    });

    const res = await OrderLookupTool.execute(
      { orderId: '1643' },
      { userId: 'user-1', tenantId: 'smmplan' }
    );

    expect(res.found).toBe(true);
    expect(res.order).toBeDefined();
    expect(res.order?.id).toBe('1643');
    expect(res.order?.chargeRub).toBe('189.00');
    // Crucial: link property must not be present on safe order snapshot!
    expect((res.order as any).link).toBeUndefined();
  });

  // 4. Guest requires email and OTP challenge
  it('demands email for unauthenticated guest lookup', async () => {
    const res = await OrderLookupTool.execute(
      { orderId: '1643' },
      { tenantId: 'smmplan', ip: '1.2.3.4' }
    );

    expect(res.found).toBe(false);
    expect(res.requiresAuth).toBe(true);
    expect(res.message).toContain('указать email');
  });

  // 5. Guest with email triggers OTP generation
  it('triggers OTP generation when email is provided without OTP', async () => {
    (db.order.findFirst as any).mockResolvedValue({
      id: '1643',
      status: 'COMPLETED',
      quantity: 500,
      remains: 0,
      charge: BigInt(9900),
      createdAt: new Date(),
      service: { name: 'VK Лайки', network: 'vk' },
    });

    const res = await OrderLookupTool.execute(
      { orderId: '1643', guestEmail: 'client@example.com' },
      { tenantId: 'smmplan', ip: '1.2.3.4' }
    );

    expect(res.found).toBe(false);
    expect(res.requiresOtp).toBe(true);
    expect(res.maskedEmail).toBe('cl***@example.com');
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('otp:guest_order:client@example.com:1643'),
      expect.stringMatching(/^\d{6}$/),
      'EX',
      600
    );
  });

  // 6. Guest with correct OTP gets order data
  it('returns safe order snapshot when valid OTP is provided', async () => {
    (db.order.findFirst as any).mockResolvedValue({
      id: '1643',
      status: 'COMPLETED',
      quantity: 500,
      remains: 0,
      charge: BigInt(9900),
      createdAt: new Date('2026-09-21'),
      service: { name: 'VK Лайки', network: 'vk' },
    });

    (redis.get as any).mockResolvedValue('549120');

    const res = await OrderLookupTool.execute(
      { orderId: '1643', guestEmail: 'client@example.com', guestOtp: '549120' },
      { tenantId: 'smmplan', ip: '1.2.3.4' }
    );

    expect(res.found).toBe(true);
    expect(res.order?.id).toBe('1643');
    expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('otp:guest_order:client@example.com:1643'));
  });
});
