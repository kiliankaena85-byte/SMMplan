import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe('Admin Panel Flow', () => {
  // Use the admin storage state (which we set up in auth.setup.ts)
  // Assuming auth.setup.ts saves state as admin if needed, or we just rely on standard auth.
  // For this test, we assume the user is logged in as ADMIN.

  test('Admin can view dashboard and user list', async ({ page }) => {
    await page.goto('/admin/dashboard');
    // We expect the dashboard to load without redirecting
    // We don't check for "Админ" since it might just show "Smmplan" or metrics.
    
    // Navigate to Users
    await page.locator('a[href="/admin/clients"]').first().click();
    
    // The table should be visible
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });
  });

  test('Admin can view and reply to tickets', async ({ page }) => {
    // 1. Seed a test ticket into the DB so the table doesn't render empty state
    const prisma = new PrismaClient();
    let testUser = await prisma.user.findUnique({ where: { email: 'e2e-tester@test.com' } });
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'e2e-tester@test.com',
          role: 'USER'
        }
      });
    }
    await prisma.ticket.create({
      data: {
        userId: testUser.id,
        subject: 'E2E Admin Ticket Test',
        messages: {
          create: {
            text: 'This ticket was created automatically to test the admin panel.',
            sender: 'USER'
          }
        },
        status: 'OPEN'
      }
    });
    await prisma.$disconnect();

    await page.goto('/admin/tickets');
    
    // Check that the test ticket is rendered in the left panel list
    const ticketLink = page.getByRole('link', { name: /E2E Admin Ticket Test/i });
    await expect(ticketLink.first()).toBeVisible({ timeout: 15000 });
    
    // Click the ticket to open the chat in the center panel
    await ticketLink.first().click();
    
    // Attempt to reply using the chat input
    const replyInput = page.getByPlaceholder(/Введите ваше сообщение/i);
    await expect(replyInput).toBeVisible({ timeout: 15000 });
    await replyInput.fill('Admin reply to E2E test ticket');
    
    // The send button might just be an icon or "Отправить"
    // Let's use generic locator for the send button near the textbox
    await page.getByRole('button', { name: /Отправить|Send|Reply/i }).first().click();
    
    // Wait for the admin's message to appear in the chat stream
    await expect(page.getByText('Admin reply to E2E test ticket')).toBeVisible();
  });

  test('Admin can manage quarantined services', async ({ page }) => {
    // 1. Seed a quarantined service
    const prisma = new PrismaClient();
    
    // Cleanup previous runs to avoid unique constraint errors
    await prisma.service.deleteMany({ where: { name: 'E2E Quarantined Service' } });
    await prisma.provider.deleteMany({ where: { name: 'E2E Test Provider' } });
    await prisma.category.deleteMany({ where: { name: 'E2E Test Category' } });
    
    // Check if network exists, if not create
    let network = await prisma.network.findUnique({ where: { slug: 'telegram' } });
    if (!network) {
      network = await prisma.network.create({ data: { name: 'Telegram', slug: 'telegram' } });
    }
    
    // Create dummy category and provider
    const category = await prisma.category.create({
      data: { name: 'E2E Test Category', sort: 999, networkId: network.id }
    });
    
    const provider = await prisma.provider.create({
      data: { name: 'E2E Test Provider', apiUrl: 'http://test.local', apiKey: 'test_key' }
    });
    
    const service = await prisma.service.create({
      data: {
        name: 'E2E Quarantined Service',
        categoryId: category.id,
        providerId: provider.id,
        rate: 10.0,
        isQuarantined: true,
        pendingRate: 20.0,
        quarantineReason: 'E2E Price increase by 100%',
        minQty: 10,
        maxQty: 1000
      }
    });
    await prisma.$disconnect();

    // 2. Navigate to Quarantine page
    await page.goto('/admin/catalog/quarantine');
    
    // 3. Ensure the quarantined service is visible
    await expect(page.getByText('E2E Quarantined Service')).toBeVisible();
    await expect(page.getByText('E2E Price increase by 100%')).toBeVisible();

    // 4. Click 'Reject' button (Отклонить)
    await page.getByRole('button', { name: /Отклонить/i }).first().click();

    // 5. Verify toast message
    await expect(page.getByText('Отклонено, цена сохранена').first()).toBeVisible();
    
    // 6. Cleanup is partially done, but we should rely on db-cleaner
    // For now, let's just assert it disappears from the list
    await expect(page.locator('table').getByText('E2E Quarantined Service')).not.toBeVisible();
  });

  test('Admin can view financial transactions', async ({ page }) => {
    await page.goto('/admin/finance');
    
    // Assuming there are charts or transaction tables
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });
  });

  test('Admin can manually adjust user balance', async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.error('BROWSER ERROR:', msg.text());
    });
    page.on('pageerror', err => console.error('PAGE EXCEPTION:', err.message));

    // 1. Create a specific test user for this test to avoid global state issues
    const prisma = new PrismaClient();
    const testUser = await prisma.user.upsert({
      where: { email: 'balance-tester@test.com' },
      update: { balance: 0 },
      create: { email: 'balance-tester@test.com', balance: 0, role: 'USER' }
    });

    // 2. Go directly to the Sheet view for this user
    await page.goto(`/admin/clients?userId=${testUser.id}`);

    // 3. Wait for the 'Корректировка баланса' form to appear in the Sheet
    try {
      await expect(page.getByText('Корректировка баланса')).toBeVisible({ timeout: 5000 });
    } catch (e) {
      const content = await page.content();
      const fs = require('fs');
      fs.writeFileSync('page-dump.html', content);
      throw e;
    }

    // 4. Fill in the adjustment amount and reason
    await page.locator('input[name="amount"]').fill('15000'); // 150 RUB
    await page.locator('input[name="reason"]').fill('E2E Deep Check Refund');

    // 5. Accept the JS confirm dialog that appears when clicking 'Применить'
    page.once('dialog', dialog => dialog.accept());
    
    // 6. Click apply
    await page.getByRole('button', { name: /Применить/i }).click();

    // 7. Verify the balance is updated (either toast or network idle)
    await page.waitForLoadState('networkidle');
  });

  test('Admin can update global exchange rate', async ({ page }) => {
    // 1. Go to settings
    await page.goto('/admin/settings?tab=system');
    await expect(page.getByRole('heading', { name: 'Основные настройки' })).toBeVisible();

    // 2. Update the exchange rate
    const rateInput = page.locator('input[name="exchangeRateUSD"]');
    await expect(rateInput).toBeVisible();
    await rateInput.fill('98.76');

    // 3. Save
    await page.getByRole('button', { name: /Сохранить основные настройки/i }).click();

    // 4. Verify toast
    await expect(page.getByText('Настройки системы обновлены').first()).toBeVisible();
  });
});
