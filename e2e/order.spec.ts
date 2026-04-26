import { test, expect } from '@playwright/test';

// Use the authenticated state we created in auth.setup.ts
test.use({ storageState: 'e2e/playwright/.auth/user.json' });

test.describe('Order Lifecycle', () => {
  test('should successfully analyze link, calculate price and create an order with balance', async ({ page }) => {
    // 1. Visit dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveTitle(/Дашборд | Smmplan/i);

    // 2. Wait for SmartOrderForm to load
    const linkInput = page.locator('input[placeholder="🔗 Вставьте ссылку на пост, канал или аккаунт..."]');
    await expect(linkInput).toBeVisible();

    // 3. Paste a test URL
    await linkInput.fill('https://t.me/durov/1');
    
    // We expect the analyzer to detect TELEGRAM post and populate categories
    // Depending on the exact UI, a list of categories should appear
    const categorySelector = page.locator('text="Просмотры"');
    await expect(categorySelector).toBeVisible({ timeout: 10000 });
    await categorySelector.click();

    // 4. Select the first available service from the table
    // Assuming we have table rows or cards with "Выбрать" buttons
    const serviceSelectBtn = page.getByRole('button', { name: /Выбрать/i }).first();
    await expect(serviceSelectBtn).toBeVisible();
    await serviceSelectBtn.click();

    // 5. Fill Quantity
    const qtyInput = page.locator('input[type="number"], input[placeholder*="Количество"]');
    await expect(qtyInput).toBeVisible();
    await qtyInput.fill('100');

    // 6. Submit Order (Click 'Оплатить')
    const payBtnHtml = page.getByRole('button', { name: /💳 Оплатить/i });
    // Or it might be "Оплатить X RUB" - so we use regex
    const payBtn = page.locator('button', { hasText: /💳|Оплатить/ });
    await expect(payBtn).toBeVisible();
    
    // Check if there is an agreement checkbox (152-FZ) and click it
    const agreementCheckbox = page.locator('input[type="checkbox"]');
    if (await agreementCheckbox.count() > 0) {
       await agreementCheckbox.check({ force: true });
    }

    await payBtn.click();

    // 7. Verify Success Toast or Redirect to /dashboard/orders (we mock successful checkout)
    // The Next.js logic in checkoutAction should succeed and show a toast
    await expect(page.locator('text=Успешно')).toBeVisible({ timeout: 15000 });
  });
});
