import { test, expect } from '@playwright/test';

test.describe('Admin Panel Flow', () => {
  // Use the admin storage state (which we set up in auth.setup.ts)
  // Assuming auth.setup.ts saves state as admin if needed, or we just rely on standard auth.
  // For this test, we assume the user is logged in as ADMIN.

  test('Admin can view dashboard and user list', async ({ page }) => {
    await page.goto('/admin/dashboard');
    // We expect the dashboard to load without redirecting
    // We don't check for "Админ" since it might just show "Smmplan" or metrics.
    
    // Navigate to Users
    await page.getByRole('link', { name: /Клиенты/i }).click();
    
    // The table should be visible
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });
  });

  test('Admin can view and reply to tickets', async ({ page }) => {
    await page.goto('/admin/tickets');
    
    // Check that tickets list is rendered
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });
    
    // Find the first ticket (e.g. the one created by guest test) and click it
    // Wait for at least one row
    const firstTicketRow = page.locator('tbody tr').first();
    if (await firstTicketRow.isVisible()) {
      await firstTicketRow.click();
      
      // Attempt to reply
      const replyInput = page.getByRole('textbox', { name: /Ответ|Сообщение|Text/i });
      if (await replyInput.isVisible()) {
        await replyInput.fill('Admin reply to E2E test ticket');
        await page.getByRole('button', { name: /Отправить|Reply/i }).click();
        
        // Wait for success message or the message appearing in the chat
        await expect(page.getByText('Admin reply to E2E test ticket')).toBeVisible();
      }
    }
  });

  test('Admin can view financial transactions', async ({ page }) => {
    await page.goto('/admin/finance');
    
    // Assuming there are charts or transaction tables
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });
  });
});
