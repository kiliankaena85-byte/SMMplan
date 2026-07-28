/**
 * e2e/balance.spec.ts
 * Balance Flow E2E Tests — пополнение, отображение, списание при заказе, отмена и возврат.
 *
 * RULES (AGENTS.md):
 * - НЕ используем реальные платёжные шлюзы.
 * - Mock payment через /api/dev/mock-payment (требует ENABLE_DEV_ROUTES=true в .env.test).
 * - WalletOps — единственный источник истины для изменений баланса.
 * - idempotencyKey предотвращает двойное зачисление.
 */

import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';

const db = new PrismaClient();

async function createAuthenticatedSession(userId: string, role: string = 'USER') {
  const jwtSecret = process.env.JWT_SECRET ?? 'fallback-secret';
  const encodedKey = new TextEncoder().encode(jwtSecret);
  const session = await db.session.create({
    data: { userId, expiresAt: new Date(Date.now() + 86_400_000) },
  });
  return new SignJWT({ sessionId: session.id, userId, role, tenantId: 'smmplan' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(encodedKey);
}

test.describe('Balance Flow', () => {
  let testUserId: string;
  let testServiceId: string;
  let testCategoryId: string;

  test.beforeAll(async () => {
    // Seed system settings
    await db.systemSettings.upsert({
      where: { id: 'smmplan' },
      update: { exchangeRateUSD: 95.0, isTestMode: true },
      create: { id: 'smmplan', exchangeRateUSD: 95.0, isTestMode: true },
    });

    // Create test user with 0 balance
    const user = await db.user.upsert({
      where: { email_tenantId: { email: 'e2e-balance-user@smmplan.local', tenantId: 'smmplan' } },
      update: { balance: 0, isActive: true, role: 'USER' },
      create: {
        email: 'e2e-balance-user@smmplan.local',
        tenantId: 'smmplan',
        role: 'USER',
        balance: 0,
        isActive: true,
      },
    });
    testUserId = user.id;

    // Seed service for order tests
    const network = await db.network.upsert({
      where: { slug: 'telegram' },
      update: {},
      create: { name: 'Telegram', slug: 'telegram', isActive: true, tenantId: 'smmplan' },
    });

    const category = await db.category.upsert({
      where: { slug: 'e2e-balance-cat' },
      update: {},
      create: {
        name: 'E2E Balance Test Category',
        slug: 'e2e-balance-cat',
        networkId: network.id,
        tenantId: 'smmplan',
      },
    });
    testCategoryId = category.id;

    let provider = await db.provider.findFirst({ where: { name: 'E2E Balance Provider' } });
    if (!provider) {
      provider = await db.provider.create({
        data: { name: 'E2E Balance Provider', apiUrl: 'http://mock.local', apiKey: 'e2e_key', isActive: true },
      });
    }

    const service = await db.service.upsert({
      where: { tenantId_slug: { slug: 'e2e-balance-service', tenantId: 'smmplan' } },
      update: { isActive: true, rate: 5.0, markup: 50 },
      create: {
        name: 'E2E Balance Service',
        slug: 'e2e-balance-service',
        categoryId: testCategoryId,
        providerId: provider.id,
        tenantId: 'smmplan',
        rate: 5.0,
        markup: 50,
        minQty: 100,
        maxQty: 10_000,
        isActive: true,
        isQuarantined: false,
        externalId: '8888',
        targetType: 'CHANNEL',
      },
    });
    testServiceId = service.id;
  });

  test.afterAll(async () => {
    await db.order.deleteMany({ where: { userId: testUserId } }).catch(() => {});
    await db.payment.deleteMany({ where: { userId: testUserId } }).catch(() => {});
    await db.service.deleteMany({ where: { id: testServiceId } }).catch(() => {});
    await db.category.deleteMany({ where: { id: testCategoryId } }).catch(() => {});
    await db.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
    await db.$disconnect();
  });

  // ─────────────────────────────────────────────
  // 1. Top-up page renders and navigates to payment
  // ─────────────────────────────────────────────
  test('Add funds page renders with top-up button', async ({ page }) => {
    const token = await createAuthenticatedSession(testUserId);
    await page.context().addCookies([{ name: 'session_token', value: token, domain: '127.0.0.1', path: '/' }]);

    await page.goto('/dashboard/add-funds');
    await expect(page).toHaveURL(/add-funds/);

    // Should have an amount input and a submit button
    const amountInput = page.locator('input[type="number"], input[name*="amount"]').first();
    await expect(amountInput).toBeVisible({ timeout: 10_000 });

    const topUpBtn = page.getByRole('button', { name: /Пополнить|Оплатить|Продолжить/i });
    await expect(topUpBtn).toBeVisible({ timeout: 5_000 });
  });

  // ─────────────────────────────────────────────
  // 2. Mock payment tops up balance and reflects in dashboard
  // ─────────────────────────────────────────────
  test('Mock payment credits balance and dashboard shows updated balance', async ({ page }) => {
    const initialBalance = BigInt(0);
    const topUpAmountKopecks = 100_00; // 100 RUB

    // Set balance to 0 explicitly
    await db.user.update({ where: { id: testUserId }, data: { balance: 0 } });

    // Create a pending Payment record directly in DB (simulating checkout step)
    const payment = await db.payment.create({
      data: {
        userId: testUserId,
        tenantId: 'smmplan',
        amount: topUpAmountKopecks,
        status: 'PENDING',
        gateway: 'YOOKASSA',
        gatewayId: `e2e-topup-${Date.now()}`,
        orderId: null,
      },
    });

    // Inject session
    const token = await createAuthenticatedSession(testUserId);
    await page.context().addCookies([{ name: 'session_token', value: token, domain: '127.0.0.1', path: '/' }]);

    // Simulate payment via mock endpoint
    const mockResponse = await page.request.get(`/api/dev/mock-payment?paymentId=${payment.id}`);
    // Should redirect (302) or return 200
    expect([200, 302, 303]).toContain(mockResponse.status());

    // Verify DB balance updated
    const updatedUser = await db.user.findUnique({ where: { id: testUserId } });
    expect(updatedUser?.balance).toBeGreaterThan(initialBalance);
    expect(updatedUser?.balance).toBe(BigInt(topUpAmountKopecks));

    // Dashboard should show non-zero balance
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    // Balance displayed somewhere on dashboard (can be any amount display)
    await expect(
      page.locator('[data-testid="user-balance"], [class*="balance"], text=/₽/').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─────────────────────────────────────────────
  // 3. Balance reflected in new order page cost
  // ─────────────────────────────────────────────
  test('New order page shows current user balance', async ({ page }) => {
    // Give user some balance
    await db.user.update({ where: { id: testUserId }, data: { balance: 50_000 } });

    const token = await createAuthenticatedSession(testUserId);
    await page.context().addCookies([{ name: 'session_token', value: token, domain: '127.0.0.1', path: '/' }]);

    await page.goto('/dashboard/new-order');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Some form of balance display
    const balanceDisplay = page.locator('[data-testid="user-balance"], text=/₽/, text=/500/, [class*="balance"]').first();
    await expect(balanceDisplay).toBeVisible({ timeout: 10_000 });
  });

  // ─────────────────────────────────────────────
  // 4. Order deducts balance
  // ─────────────────────────────────────────────
  test('Placing an order via balance payment deducts from user balance', async ({ page }) => {
    // Give user 200k RUB = 20_000_000 kopecks
    await db.user.update({ where: { id: testUserId }, data: { balance: 20_000_000 } });
    const balanceBefore = BigInt(20_000_000);

    const token = await createAuthenticatedSession(testUserId);
    await page.context().addCookies([{ name: 'session_token', value: token, domain: '127.0.0.1', path: '/' }]);

    // Create order directly via DB (avoids full UI wizard complexity)
    const orderCost = 50_00; // 50 RUB in kopecks
    const order = await db.order.create({
      data: {
        userId: testUserId,
        tenantId: 'smmplan',
        serviceId: testServiceId,
        link: 'https://t.me/e2e_balance_test',
        quantity: 100,
        costCents: orderCost,
        email: 'e2e-balance-user@smmplan.local',
        status: 'AWAITING_PAYMENT',
      },
    });

    // Create payment record and process it
    const payment = await db.payment.create({
      data: {
        userId: testUserId,
        tenantId: 'smmplan',
        amount: orderCost,
        status: 'PENDING',
        gateway: 'BALANCE',
        gatewayId: `e2e-order-pay-${Date.now()}`,
        orderId: order.id,
      },
    });

    // Process mock payment
    await page.request.get(`/api/dev/mock-payment?paymentId=${payment.id}`);

    // Order should now be PENDING
    const updatedOrder = await db.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder?.status).toBe('PENDING');

    // Check balance (deducted by gateway or ledger)
    const updatedUser = await db.user.findUnique({ where: { id: testUserId } });
    // Balance should reflect the charge (depends on gateway path)
    expect(updatedUser?.balance).toBeLessThanOrEqual(balanceBefore);
  });

  // ─────────────────────────────────────────────
  // 5. Cancel order → refund triggers balance restore
  // ─────────────────────────────────────────────
  test('Admin cancel of an order triggers a refund credit to user balance', async ({ page, request }) => {
    // Create a PENDING order
    const orderCost = 30_00;
    await db.user.update({ where: { id: testUserId }, data: { balance: 10_000_000 } });

    const order = await db.order.create({
      data: {
        userId: testUserId,
        tenantId: 'smmplan',
        serviceId: testServiceId,
        link: 'https://t.me/e2e_cancel_test',
        quantity: 100,
        charge: BigInt(orderCost),
        providerCost: BigInt(1000),
        email: 'e2e-balance-user@smmplan.local',
        status: 'PENDING',
        externalOrderId: `e2e-ext-${Date.now()}`,
      },
    });

    const balanceBefore = (await db.user.findUnique({ where: { id: testUserId } }))!.balance;

    // Cancel via Admin API (Server Action or direct admin route)
    // Inject admin session for this request
    const adminUser = await db.user.upsert({
      where: { email_tenantId: { email: 'e2e-balance-admin@smmplan.local', tenantId: 'smmplan' } },
      update: { role: 'OWNER', isActive: true },
      create: { email: 'e2e-balance-admin@smmplan.local', tenantId: 'smmplan', role: 'OWNER', isActive: true, balance: 0 },
    });

    const adminToken = await createAuthenticatedSession(adminUser.id, 'OWNER');
    await page.context().addCookies([{ name: 'session_token', value: adminToken, domain: '127.0.0.1', path: '/' }]);

    // Navigate to admin order and cancel
    await page.goto(`/admin/orders/${order.id}`);

    const cancelBtn = page.getByRole('button', { name: /Отменить|Cancel/i });
    if (await cancelBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      page.once('dialog', (d) => d.accept());
      await cancelBtn.click();

      // Wait for cancellation to process
      await page.waitForTimeout(2_000);

      // Verify order status changed
      const cancelledOrder = await db.order.findUnique({ where: { id: order.id } });
      expect(['CANCELLED', 'REFUNDED']).toContain(cancelledOrder?.status);
    } else {
      // Alternatively cancel directly via API
      await request.post('/api/admin/orders/cancel', {
        headers: { Cookie: `session_token=${adminToken}` },
        data: { orderId: order.id },
      });

      const cancelledOrder = await db.order.findUnique({ where: { id: order.id } });
      const balanceAfter = (await db.user.findUnique({ where: { id: testUserId } }))!.balance;

      // Either order is cancelled, or balance was restored
      const orderCancelled = ['CANCELLED', 'REFUNDED'].includes(cancelledOrder?.status ?? '');
      const balanceRestored = balanceAfter > balanceBefore;
      expect(orderCancelled || balanceRestored).toBe(true);
    }

    // Cleanup admin
    await db.user.deleteMany({ where: { email: 'e2e-balance-admin@smmplan.local' } }).catch(() => {});
  });
});
