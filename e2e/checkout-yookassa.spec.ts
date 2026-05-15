import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe('External Payment (YooKassa) Lifecycle', () => {

  test.beforeAll(async () => {
    const prisma = new PrismaClient();
    let network = await prisma.network.findUnique({ where: { slug: 'telegram' } });
    if (!network) {
      network = await prisma.network.create({ data: { name: 'Telegram', slug: 'telegram' } });
    }
    let category = await prisma.category.findFirst({ where: { networkId: network.id, name: 'E2E Telegram Category' } });
    if (!category) {
      category = await prisma.category.create({ data: { name: 'E2E Telegram Category', sort: 1, networkId: network.id } });
    }
    let provider = await prisma.provider.findFirst({ where: { name: 'E2E Test Provider' } });
    if (!provider) {
      provider = await prisma.provider.create({ data: { name: 'E2E Test Provider', apiUrl: 'http://test.local', apiKey: 'test_key' } });
    }
    const service = await prisma.service.findFirst({ where: { name: 'E2E Telegram Service' } });
    if (!service) {
      await prisma.service.create({
        data: {
          name: 'E2E Telegram Service', categoryId: category.id, providerId: provider.id,
          rate: 10.0, markup: 50.0, minQty: 10, maxQty: 10000,
          isQuarantined: false, isActive: true, externalId: '101'
        }
      });
    }

    // Seed YooKassa settings
    await prisma.systemSettings.upsert({
      where: { id: 'global' },
      update: {
        yookassaShopId: 'test_shop_id',
        yookassaSecretKey: 'test_secret_key',
        isTestMode: true // Make sure we are in test mode if the code branches on it
      },
      create: {
        id: 'global',
        yookassaShopId: 'test_shop_id',
        yookassaSecretKey: 'test_secret_key',
        isTestMode: true
      }
    });

    await prisma.$disconnect();
  });

  test('should create AWAITING_PAYMENT order and successfully credit via Webhook simulation', async ({ page, request }) => {
    // 1. Visit Dashboard (logged out user gets auto-login via auth.setup)
    await page.goto('/dashboard/new-order');
    
    await expect(page).toHaveTitle(/Новый заказ | Smmplan/i);

    // 2. Wait for SmartOrderForm to load
    const linkInput = page.locator('input#order-url');
    await expect(linkInput).toBeVisible();

    // 3. Paste a test URL
    await linkInput.fill('https://t.me/durov');
    
    // Wait for the option to be auto-selected by the hook logic
    const serviceOption = page.getByRole('option', { name: /E2E Telegram Service/i });
    await expect(serviceOption).toBeVisible({ timeout: 15000 });
    await expect(serviceOption).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });

    const qtyInput = page.locator('input[type="number"], input[placeholder*="Количество"]');
    await expect(qtyInput).toBeVisible();
    const minQty = await qtyInput.getAttribute('min');
    await qtyInput.fill(minQty ? (parseInt(minQty) + 50).toString() : '100');

    // 6. Change Gateway to YooKassa
    const yookassaTab = page.locator('button', { hasText: /ЮKassa|Банковская карта/i });
    if (await yookassaTab.count() > 0) {
      await yookassaTab.click();
    }

    // 7. Submit Order
    const payBtn = page.locator('button', { hasText: /💳|Оплатить/ });
    await expect(payBtn).toBeVisible();
    
    const agreementCheckbox = page.locator('input[type="checkbox"]');
    await expect(agreementCheckbox).toBeVisible({ timeout: 5000 });
    await agreementCheckbox.check({ force: true });
    await expect(agreementCheckbox).toBeChecked();

    // Intercept mock-payment redirect so it doesn't auto-confirm the payment
    // We want the Webhook to do the confirmation!
    await page.route('**/api/dev/mock-payment*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>Mock YooKassa Gateway</body></html>'
    }));

    // Wait for React to re-render and enable the button
    await expect(payBtn).toBeEnabled({ timeout: 5000 });

    // 6.5 Fill Email (Required by schema)
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('e2e-tester@test.com');

    await payBtn.click();
    await page.waitForTimeout(1000); // Wait for React state or Server Action
    
    // 8. Fetch userId from DB via Prisma by polling for the new Payment
    const prisma = new PrismaClient();
    let payment = null;
    const order = null;
    
    // Poll the database for up to 10 seconds (20 * 500ms)
    for (let i = 0; i < 20; i++) {
      payment = await prisma.payment.findFirst({
        where: { gateway: 'yookassa', status: 'PENDING' },
        orderBy: { createdAt: 'desc' }
      });
      if (payment) break;
      await page.waitForTimeout(500);
    }
    
    expect(payment).not.toBeNull();
    const internalPaymentId = payment!.id;
    
    expect(payment).not.toBeNull();
    const userId = payment!.userId;
    
    // Find linked order using paymentId (basket architecture)
    const linkedOrder = await prisma.order.findFirst({ where: { paymentId: internalPaymentId } });
    expect(linkedOrder).not.toBeNull();
    const orderId = linkedOrder!.id;
    
    const amountRub = Number(payment!.amount) / 100;

    // 10. Simulate the YooKassa Webhook Action
    console.log(`[E2E YooKassa] Simulating Webhook for DB Payment: ${internalPaymentId}`);
    const mockGatewayId = 'mock_yookassa_' + Date.now();
    
    const webhookPayload = {
      type: 'notification',
      event: 'payment.succeeded',
      object: {
        id: mockGatewayId,
        amount: {
          value: amountRub.toFixed(2),
          currency: 'RUB'
        },
        metadata: {
          userId: userId,
          paymentId: internalPaymentId,
          type: 'yookassa'
        }
      }
    };

    const webhookResp = await request.post('/api/webhooks/yookassa', {
      data: webhookPayload
    });
    
    expect(webhookResp.status()).toBe(200);

    // 11. Assert Database State Transitions
    const finalPayment = await prisma.payment.findUnique({ where: { id: internalPaymentId } });
    expect(finalPayment!.status).toBe('SUCCEEDED');
    
    const finalOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(finalOrder!.status).toBe('PENDING'); // Should activate
    
    console.log('[E2E YooKassa] Financial Flow (Order -> Webhook -> Activation) verified successfully.');
    
    await prisma.$disconnect();
    
  });
});
