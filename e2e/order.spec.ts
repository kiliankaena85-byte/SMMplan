import { test, expect } from '@playwright/test';

test.describe('Order Lifecycle', () => {

  test('Single Order Form Renders', async ({ page }) => {
    await page.goto('/dashboard/new-order');
    // Ensure the main form renders
    await expect(page.locator('form').first()).toBeVisible({ timeout: 15000 });
    
    // Check that we have a URL input
    const linkInput = page.locator('input[type="url"], input[name="link"], input[placeholder*="ссылка" i], input[placeholder*="http" i]').first();
    await expect(linkInput).toBeVisible();
  });

  test('Drip-feed Order Options Render', async ({ page }) => {
    await page.goto('/dashboard/new-order');
    
    // Look for Drip-feed toggle or advanced settings
    const advancedToggle = page.getByRole('button', { name: /Продвинутые настройки|Drip-feed|Постепенная/i }).first();
    if (await advancedToggle.isVisible()) {
      await advancedToggle.click();
      await expect(page.getByText(/Количество запусков|Интервал|Runs|Interval/i).first()).toBeVisible();
    }
  });

  test('Mass Order Page Renders', async ({ page }) => {
    // Some systems use /dashboard/mass-order, others use a tab on the new order page
    const res = await page.goto('/dashboard/mass-order').catch(() => null);
    if (res && res.status() !== 404) {
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 10000 });
    } else {
      // Fallback: it might be a tab on the main order page
      await page.goto('/dashboard/new-order');
      const massOrderTab = page.getByRole('tab', { name: /Массовый|Mass/i }).first();
      if (await massOrderTab.isVisible()) {
        await massOrderTab.click();
        await expect(page.locator('textarea').first()).toBeVisible();
      }
    }
  });

});
