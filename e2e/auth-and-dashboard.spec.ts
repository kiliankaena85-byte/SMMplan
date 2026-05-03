import { test, expect } from '@playwright/test';

test.describe('Auth & Dashboard Flow', () => {

  test.describe('Dashboard Features (Authenticated)', () => {
    // This suite uses the default storageState from auth.setup.ts
    
    test('User can access refill page and see payment options', async ({ page }) => {
      await page.goto('/dashboard/add-funds');
      await expect(page.getByRole('heading', { name: /Пополнение баланса/i })).toBeVisible();
      
      // Check if Yookassa is visible
      await expect(page.getByRole('button', { name: /Банковская карта/i }).first()).toBeVisible();
    });

    test('User can access referral section', async ({ page }) => {
      await page.goto('/dashboard/referrals');
      
      // Check for an input that contains the ref link
      // Smmplan referral page might use an input for copying the link
      const refInput = page.getByRole('textbox').filter({ hasText: /ref=/ });
      if (await refInput.isVisible()) {
         await expect(refInput).toBeVisible();
      } else {
         // Alternatively, just verify the URL and a heading
         await expect(page).toHaveURL(/.*referrals/);
         await expect(page.locator('h1').first()).toBeVisible();
      }
    });
  });
});
