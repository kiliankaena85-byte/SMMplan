import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

// Use the authenticated state we created in auth.setup.ts
test.use({ storageState: 'e2e/playwright/.auth/user.json' });

test.describe('External Payment (YooKassa) Lifecycle', () => {
  test('should create AWAITING_PAYMENT order and successfully credit via Webhook simulation', async ({ page, request }) => {
    // 1. Visit dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveTitle(/Дашборд | Smmplan/i);

    // 2. Wait for SmartOrderForm to load
    const linkInput = page.locator('input[placeholder="🔗 Вставьте ссылку на пост, канал или аккаунт..."]');
    await expect(linkInput).toBeVisible();

    // 3. Paste a test URL
    await linkInput.fill('https://t.me/durov/1');
    
    const categorySelector = page.locator('text="Просмотры"');
    await expect(categorySelector).toBeVisible({ timeout: 10000 });
    await categorySelector.click();

    // 4. Select the first available service
    const serviceSelectBtn = page.getByRole('button', { name: /Выбрать/i }).first();
    await expect(serviceSelectBtn).toBeVisible();
    await serviceSelectBtn.click();

    // 5. Fill Quantity
    const qtyInput = page.locator('input[type="number"], input[placeholder*="Количество"]');
    await expect(qtyInput).toBeVisible();
    await qtyInput.fill('100');

    // 6. Change Gateway to YooKassa
    // Assuming there's a gateway selector (e.g. tabs or radio group)
    const yookassaTab = page.locator('button', { hasText: /ЮKassa|Банковская карта/i });
    if (await yookassaTab.count() > 0) {
      await yookassaTab.click();
    }

    // Capture response to get paymentId/orderId
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('checkoutAction') && response.status() === 200
    );

    // 7. Submit Order
    const payBtn = page.locator('button', { hasText: /💳|Оплатить/ });
    await expect(payBtn).toBeVisible();
    
    const agreementCheckbox = page.locator('input[type="checkbox"]');
    if (await agreementCheckbox.count() > 0) {
       await agreementCheckbox.check({ force: true });
    }

    await payBtn.click();

    // 8. Capture checkout response
    const checkoutResponse = await responsePromise;
    // We expect the checkoutAction to return something like [{ success: true, data: { paymentId: '...', orderId: '...' } }] 
    // due to Next.js Server Action format. We need to parse it.
    const textResp = await checkoutResponse.text();
    
    // Using Regex to extract OrderId and PaymentId from Server Action payload
    const orderIdMatch = textResp.match(/"orderId"\s*:\s*"([^"]+)"/);
    const paymentIdMatch = textResp.match(/"paymentId"\s*:\s*"([^"]+)"/);
    
    // If not found, log out the response for debugging
    if (!paymentIdMatch || !orderIdMatch) {
       console.log("Could not find paymentId/orderId in Server Action response payload:", textResp);
    }
    
    expect(orderIdMatch).toBeTruthy();
    expect(paymentIdMatch).toBeTruthy();
    
    const orderId = orderIdMatch![1];
    const internalPaymentId = paymentIdMatch![1];

    // 9. Fetch userId from DB via Prisma
    const prisma = new PrismaClient();
    
    // We need to poll briefly if the payment isn't there yet, though Server Action completes synchronously.
    const payment = await prisma.payment.findUnique({
      where: { id: internalPaymentId }
    });
    
    expect(payment).not.toBeNull();
    const userId = payment!.userId;
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
    
    const ledgerEntry = await prisma.ledgerEntry.findFirst({
      where: {
        userId: userId,
        reason: { contains: 'Пополнение баланса через yookassa' }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    expect(ledgerEntry).not.toBeNull();
    expect(ledgerEntry!.amount).toBe(payment!.amount); // Should match

    console.log('[E2E YooKassa] Financial Flow (Order -> Webhook -> Ledger -> Activation) verified successfully.');
    
    await prisma.$disconnect();
    
  });
});
