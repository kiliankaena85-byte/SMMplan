import { test, expect } from '@playwright/test';

test.describe('Order Lifecycle', () => {
  test('should successfully analyze link, calculate price and create an order with balance', async ({ page }) => {
    // 1. Visit new order page
    await page.goto('/dashboard/new-order');
    await expect(page).toHaveTitle(/Новый заказ | Smmplan/i);

    // 2. Wait for SmartOrderForm to load
    const linkInput = page.locator('input[placeholder="Ссылка на пост, канал или профиль"]');
    await expect(linkInput).toBeVisible();

    // 3. Paste a test URL (Instagram to match seed data)
    await linkInput.fill('https://instagram.com/p/test');
    
    // We expect the analyzer to detect INSTAGRAM post and populate categories
    // Depending on the exact UI, a list of categories should appear
    const categorySelector = page.locator('button[role="tab"]', { hasText: /(Instagram Likes|Лайки)/i });
    await expect(categorySelector).toBeVisible({ timeout: 10000 });
    await categorySelector.click();

    // 4. Select the first available service from the table
    // Assuming we have table rows or cards with "Выбрать" buttons
    const serviceSelectBtn = page.getByRole('option').first();
    await expect(serviceSelectBtn).toBeVisible();
    await serviceSelectBtn.click();

    // 5. Fill Quantity
    const qtyInput = page.locator('input[type="number"], input[placeholder*="Количество"]');
    await expect(qtyInput).toBeVisible();
    const minQty = await qtyInput.getAttribute('min');
    await qtyInput.fill(minQty ? (parseInt(minQty) + 50).toString() : '100');

    // 6. Submit Order (Click 'Оплатить')
    const payBtnHtml = page.getByRole('button', { name: /💳 Оплатить/i });
    // Or it might be "Оплатить X RUB" - so we use regex
    const payBtn = page.locator('button', { hasText: /💳|Оплатить/ });
    await expect(payBtn).toBeVisible();
    // Select Balance gateway
    const balanceTab = page.locator('button', { hasText: /Баланс/i });
    await expect(balanceTab).toBeVisible();
    await balanceTab.click();

    const agreementCheckbox = page.locator('input[type="checkbox"]');
    await expect(agreementCheckbox).toBeVisible({ timeout: 5000 });
    await agreementCheckbox.check({ force: true });
    await expect(payBtn).toBeEnabled({ timeout: 5000 });

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('e2e-tester@test.com');

    await payBtn.click();

    // 7. Verify Success Page redirection
    try {
      await expect(page.locator('text=Оплата прошла!')).toBeVisible({ timeout: 15000 });
    } catch (e) {
      const redTexts = await page.locator('.text-red-500').allTextContents();
      const currentUrl = page.url();
      console.log('Test Failed. Current URL:', currentUrl);
      console.log('Error texts on page:', redTexts);
      throw e;
    }
  });
});
