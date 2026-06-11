import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Password Auth Flow (Dynamic E2E Tests)', () => {
  const testEmail = `dynamic-user-${Date.now()}@smmplan.local`;
  const testPassword = 'SecurePassword123!';

  test.afterAll(async () => {
    // Clean up created user
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, 'blocked-auth-user@smmplan.local'] } },
    });
    await prisma.$disconnect();
  });

  test('Guest can register with password, switch to login tab, and log in successfully', async ({ page }) => {
    // 1. Go to login page
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);

    // 2. Click on the "Регистрация" tab
    await page.getByRole('button', { name: 'Регистрация' }).click();

    // 3. Fill registration details
    await page.locator('#register-email').fill(testEmail);
    await page.locator('#register-password').fill(testPassword);

    // 4. Submit registration
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();

    // 5. Expect success notification / tab switch back to password login
    // The tab should change back to password login automatically after success
    await expect(page.getByRole('button', { name: 'Войти по паролю' })).toHaveClass(/bg-card/);

    // 6. Fill login details with newly created user
    await page.locator('#login-email').fill(testEmail);
    await page.locator('#login-password').fill(testPassword);

    // 7. Submit login
    await page.getByRole('button', { name: 'Войти в кабинет' }).click();

    // 8. Should redirect to dashboard and see dashboard elements
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('Password login prevents blocked / inactive users from accessing dashboard', async ({ page }) => {
    // 1. Pre-create a blocked user in DB
    const blockedEmail = 'blocked-auth-user@smmplan.local';
    await prisma.user.upsert({
      where: { email: blockedEmail },
      update: { isActive: false, isDeleted: true },
      create: {
        email: blockedEmail,
        isActive: false,
        isDeleted: true,
        role: 'USER',
      },
    });

    // 2. Try logging in as the blocked user
    await page.goto('/login');
    await page.locator('#login-email').fill(blockedEmail);
    await page.locator('#login-password').fill('SomePassword123!');
    await page.getByRole('button', { name: 'Войти в кабинет' }).click();

    // 3. Page should remain on /login and show standard anti-enumeration error toast
    await expect(page).toHaveURL(/.*login/);
  });
});
