import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe('External Payment (YooKassa) Lifecycle', () => {

  test('should create AWAITING_PAYMENT order and successfully credit via Webhook simulation', async ({ page, request }) => {
    // 1. Visit Dashboard (logged out user gets auto-login via auth.setup)
    await page.goto('/dashboard/new-order');
    
    await expect(page).toHaveTitle(/Новый заказ | Smmplan/i);

    // 2. Wait for SmartOrderForm to load
    const linkInput = page.locator('input[placeholder="Ссылка на пост, канал или профиль"]');
    await expect(linkInput).toBeVisible();

    // 3. Paste a test URL
    await linkInput.fill('https://instagram.com/p/test');
    
    const categorySelector = page.locator('button[role="tab"]', { hasText: /(Instagram Likes|Лайки)/i });
    await expect(categorySelector).toBeVisible({ timeout: 10000 });
    await categorySelector.click();

    // 4. Select the first available service
    const serviceSelectBtn = page.getByRole('option').first();
    await expect(serviceSelectBtn).toBeVisible();
    await serviceSelectBtn.click();

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
    let order = null;
    
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
    expect(payment!.orderId).not.toBeNull();
    const orderId = payment!.orderId as string;
    const amountRub = payment!.amount / 100;

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
