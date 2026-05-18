import { describe, it, expect, vi } from 'vitest';
import { db } from '../../src/lib/db';
import { checkoutAction } from '../../src/actions/order/checkout';

vi.mock('../../src/lib/session', () => ({
  verifySession: vi.fn()
}));

vi.mock('../../src/services/core/rate-limit.service', () => ({
  RateLimitService: {
    check: vi.fn().mockResolvedValue(true),
    checkCustomKey: vi.fn().mockResolvedValue(true)
  }
}));

describe('Checkout Voucher Rejection', () => {
  it('should reject VOUCHER type in checkout without mutating balance or creating payment', async () => {
    const { verifySession } = await import('../../src/lib/session');
    
    const userId = 'test_checkout_user_' + Date.now();
    
    // Setup user
    await db.user.create({
      data: {
        id: userId,
        email: `${userId}@example.com`,
        balance: 5000,
        role: 'USER'
      }
    });

    const promoCodeStr = `VOUCHER_${Date.now()}`;
    const promo = await db.promoCode.create({
      data: {
        code: promoCodeStr,
        type: 'VOUCHER',
        amount: 1000,
        maxUses: 1,
        uses: 0,
        isActive: true,
        discountPercent: 0
      }
    });

    // Create dummy provider, category & service
    const provider = await db.provider.create({
      data: { name: 'Test Provider', apiUrl: 'http://test', apiKey: 'test' }
    });
    const category = await db.category.create({
      data: { name: 'Test Category' }
    });
    const service = await db.service.create({
      data: {
        categoryId: category.id,
        name: 'Test Service',
        providerId: provider.id,
        externalId: 'ext-123',
        rate: 1.0,
        pricePer1000Cents: 2000,
        minQty: 10,
        maxQty: 1000,
        isActive: true,
        targetType: 'POST'
      }
    });

    // Mock session
    vi.mocked(verifySession).mockResolvedValue({ userId, role: 'USER' } as any);

    const initialPayments = await db.payment.count({ where: { userId } });

    // Call checkoutAction
    const result = await checkoutAction({
      serviceId: service.id,
      link: 'https://instagram.com/test',
      quantity: 100,
      email: `${userId}@example.com`,
      promoCodeStr: promoCodeStr
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('VOUCHER_USE_BALANCE');

    const finalUser = await db.user.findUnique({ where: { id: userId } });
    const finalPayments = await db.payment.count({ where: { userId } });
    const finalPromo = await db.promoCode.findUnique({ where: { id: promo.id } });

    // Balance remains untouched
    expect(finalUser?.balance).toBe(5000n);
    // No new payment created
    expect(finalPayments).toBe(initialPayments);
    // Promo uses untouched
    expect(finalPromo?.uses).toBe(0);

    // Cleanup
    await db.service.delete({ where: { id: service.id } });
    await db.category.delete({ where: { id: category.id } });
    await db.provider.delete({ where: { id: provider.id } });
    await db.promoCode.delete({ where: { id: promo.id } });
    await db.user.delete({ where: { id: userId } });
  });
});
