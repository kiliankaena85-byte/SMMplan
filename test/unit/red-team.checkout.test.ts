import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '../../src/lib/db';
import { checkoutAction } from '../../src/actions/order/checkout';
import { MutexManager } from '../../src/lib/redis-lock';
import { RateLimitService } from '../../src/services/core/rate-limit.service';

vi.mock('../../src/services/core/rate-limit.service', () => ({
  RateLimitService: {
    check: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('@/workers/queues', () => ({
  ordersQueue: {
    add: vi.fn()
  }
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([
    ['x-forwarded-for', '127.0.0.1'],
    ['user-agent', 'vitest'],
    ['host', 'localhost']
  ])),
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    delete: vi.fn()
  })
}));

describe('Red Team: Checkout Fuzzing & Financial Security', () => {
  async function setupTestEnvironment() {
    const userEmail = `red_team_${Date.now()}_${Math.random()}@example.com`.toLowerCase();
    const user = await db.user.create({
      data: { email: userEmail, balance: 100000, role: 'USER' }
    });

    const provider = await db.provider.create({
      data: { name: `RedTeamProvider_${Date.now()}_${Math.random()}`, apiUrl: 'http://localhost/api', apiKey: 'test-key', balanceCurrency: 'USD' }
    });

    const network = await db.network.create({
      data: { name: `RedTeamNet_${Date.now()}_${Math.random()}`, slug: `redteam_${Date.now()}_${Math.random()}`, icon: '/test.svg' }
    });

    const category = await db.category.create({
      data: { name: `RedTeamCat_${Date.now()}_${Math.random()}`, networkId: network.id }
    });

    const service = await db.service.create({
      data: {
        providerId: provider.id,
        categoryId: category.id,
        name: 'RedTeam Service',
        externalId: '100',
        minQty: 10,
        maxQty: 10000,
        rate: 1.0,
        markup: 2.5,
        isActive: true,
      }
    });

    const promo = await db.promoCode.create({
      data: {
        code: `REDTEAM_PROMO_${Date.now()}_${Math.random()}`,
        discountPercent: 99,
        type: 'PERCENTAGE',
        maxUses: 10
      }
    });

    return { user, provider, network, category, service, promo };
  }

  it('should reject negative quantities via Zod validation', async () => {
    const env = await setupTestEnvironment();
    const req = {
      serviceId: env.service.id,
      link: 'https://t.me/test',
      quantity: -500, // Attack!
      email: env.user.email,
      gateway: 'balance'
    };

    const result = await checkoutAction(req);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/validation error|Количество должно быть от|Number must be greater than/i);
  });

  it('should enforce calculateSafetyFloorCents even with 99% promo codes', async () => {
    const env = await setupTestEnvironment();
    
    const req = {
      serviceId: env.service.id,
      link: 'https://t.me/test',
      quantity: 1000,
      email: env.user.email,
      promoCodeStr: env.promo.code,
      gateway: 'balance'
    };

    const result = await checkoutAction(req);
    // Even though promo is 99%, the safety floor will prevent the totalCents from dropping below provider cost + margin/taxes
    if (!result.success) {
      throw new Error(`TEST 2 FAILED: ${result.error}`);
    }
    expect(result.success).toBe(true);

    const order = await db.order.findUnique({ where: { id: result.data!.orderId } });
    const providerCost = Number(order!.providerCost);
    const charge = Number(order!.charge);
    
    // Charge must be mathematically strictly greater than the provider cost
    expect(charge).toBeGreaterThan(providerCost);
  });

  it('should prevent double-spending via concurrent requests (Mutex lock check)', async () => {
    const env = await setupTestEnvironment();

    // Setup specific balance so user can only afford exactly 1 order
    // We update user balance to exactly the cost of 1 order
    // First, let's price it.
    const priceRes = await checkoutAction({
        serviceId: env.service.id,
        link: 'https://t.me/test_price',
        quantity: 100,
        email: env.user.email,
        gateway: 'yookassa' // Don't use balance yet, just to see the cost
    });
    
    if (!priceRes.success) {
      throw new Error(`TEST 3 PRICE FAILED: ${priceRes.error}`);
    }
    
    const order = await db.order.findUnique({ where: { id: priceRes.data!.orderId } });
    const exactCost = Number(order!.charge);

    await db.user.updateMany({
        where: { email: env.user.email },
        data: { balance: exactCost } // Affords exactly 1
    });

    // Fire 5 concurrent requests without idempotency key to test Mutex & Balance check
    const attempts = Array.from({ length: 5 }).map((_, i) => 
      checkoutAction({
        serviceId: env.service.id,
        link: `https://t.me/test_spam_${i}`,
        quantity: 100,
        email: env.user.email,
        gateway: 'balance'
      })
    );

    const results = await Promise.all(attempts);
    
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    // Only 1 should succeed, the rest should fail due to 'Недостаточно средств'
    if (successes.length !== 1) {
      console.log('UNEXPECTED FAILURES:', failures.map(f => f.error));
    }
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(4);
    expect(failures[0].error).toMatch(/Недостаточно средств/i);

    const finalUser = await db.user.findFirst({ where: { email: env.user.email } });
    expect(finalUser!.balance).toBe(0n);
  });

  it('should prevent double-spending via concurrent requests (SQL atomic check bypassed Mutex)', async () => {
    const env = await setupTestEnvironment();

    const priceRes = await checkoutAction({
        serviceId: env.service.id,
        link: 'https://t.me/test_price_2',
        quantity: 100,
        email: env.user.email,
        gateway: 'yookassa'
    });
    
    if (!priceRes.success) throw new Error(`TEST 4 PRICE FAILED: ${priceRes.error}`);
    
    const order = await db.order.findUnique({ where: { id: priceRes.data!.orderId } });
    const exactCost = Number(order!.charge);

    await db.user.updateMany({
        where: { email: env.user.email },
        data: { balance: exactCost } // Affords exactly 1
    });

    // We maliciously bypass the application-level Mutex lock to simulate a cluster issue or Redis failure
    const originalWithLock = MutexManager.withLock;
    vi.spyOn(MutexManager, 'withLock').mockImplementation(async (key, ttl, retry, cb) => {
        return cb(); // Execute immediately without locking, forcing race condition at DB level
    });

    const attempts = Array.from({ length: 5 }).map((_, i) => 
      checkoutAction({
        serviceId: env.service.id,
        link: `https://t.me/test_sql_${i}`,
        quantity: 100,
        email: env.user.email,
        gateway: 'balance'
      })
    );

    const results = await Promise.all(attempts);
    
    // Restore the Mutex mock
    vi.mocked(MutexManager.withLock).mockRestore();

    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    // SQL updateMany with { balance: { gte: cost } } should STILL prevent double-spend!
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(4);
    expect(failures[0].error).toMatch(/Недостаточно средств/i);

    const finalUser = await db.user.findFirst({ where: { email: env.user.email } });
    expect(finalUser!.balance).toBe(0n);
  });

  it('should handle YooKassa duplicate webhook deliveries idempotently (Deposit metadata)', async () => {
    const { paymentService } = await import('../../src/services/financial/payment.service');
    const env = await setupTestEnvironment();
    
    const fakeGatewayId = `yoo_dup_${Date.now()}_${Math.random()}`;
    const amountToAddCents = 50000; // 500 RUB

    console.log("ENV USER:", env.user);
    const startingUser = await db.user.findUnique({ where: { id: env.user.id } });
    if (!startingUser) throw new Error("startingUser is null? id: " + env.user.id);
    const initialBalance = startingUser.balance;

    // Simulate 3 identical webhooks arriving at the exact same millisecond
    const concurrentWebhooks = [
      paymentService.confirmPayment(fakeGatewayId, amountToAddCents, env.user.id, true, 'yookassa', undefined, 'deposit'),
      paymentService.confirmPayment(fakeGatewayId, amountToAddCents, env.user.id, true, 'yookassa', undefined, 'deposit'),
      paymentService.confirmPayment(fakeGatewayId, amountToAddCents, env.user.id, true, 'yookassa', undefined, 'deposit')
    ];

    const results = await Promise.all(concurrentWebhooks);

    // Because gatewayId is @unique on Payment, Prisma will throw P2002 for the duplicates,
    // causing paymentService.confirmPayment to return false and catch the error.
    const successes = results.filter(r => r === true);
    
    expect(successes.length).toBe(1); // Only 1 should succeed

    const finalUser = await db.user.findUnique({ where: { id: env.user.id } });
    
    // Balance should have increased by exactly ONE amount
    expect(finalUser!.balance).toBe(initialBalance + BigInt(amountToAddCents));

    const payments = await db.payment.findMany({ where: { gatewayId: fakeGatewayId } });
    expect(payments.length).toBe(1);
  });
});
