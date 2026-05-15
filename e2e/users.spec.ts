import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe('Users Management Flow', () => {

  test('Admin can manually adjust user balance', async ({ page }) => {
    // 1. Prepare test user
    const prisma = new PrismaClient();
    const testEmail = 'balance-tester-e2e@test.com';
    let testUser = await prisma.user.findUnique({ where: { email: testEmail } });
    if (!testUser) {
      testUser = await prisma.user.create({
        data: { email: testEmail, balance: 0, role: 'USER' }
      });
    } else {
      testUser = await prisma.user.update({
        where: { email: testEmail },
        data: { balance: 0 }
      });
    }

    // 2. Go to Clients page and select the user
    await page.goto(`/admin/clients?userId=${testUser.id}`);

    // Wait for the UI to load
    await expect(page.getByText('Корректировка баланса')).toBeVisible({ timeout: 15000 });

    // 3. Fill amount and reason
    await page.locator('input[name="amount"]').fill('50000'); // 500 RUB (50000 kopecks)
    await page.locator('input[name="reason"]').fill('TEST_REWARD');

    // 4. Intercept the JS confirmation dialog automatically
    page.once('dialog', dialog => dialog.accept());

    // 5. Submit
    await page.getByRole('button', { name: /Применить/i }).click();

    // 6. Verify balance in UI reflects 500.00
    // Because the UI formats 50000 kopecks as '500.00 ₽'
    await expect(page.getByText('500.00 ₽').first()).toBeVisible({ timeout: 15000 });
    
    await prisma.$disconnect();
  });

});
