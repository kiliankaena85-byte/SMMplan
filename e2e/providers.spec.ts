import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe('Providers Integration Flow', () => {

  test.beforeEach(async () => {
    // We could seed db here if needed, but we will mostly test UI interactions
  });

  test('Admin can navigate to Providers list and see elements', async ({ page }) => {
    await page.goto('/admin/providers');
    
    // Check page title
    await expect(page.getByRole('heading', { name: 'Провайдеры API' })).toBeVisible();
    
    // Check for standard buttons
    await expect(page.getByRole('button', { name: 'Подключить Панель' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Импорт Услуг' })).toBeVisible();
  });

  test('Admin can open provider creation form and validate fields', async ({ page }) => {
    await page.goto('/admin/providers');
    
    // Click "Подключить Панель"
    await page.getByRole('button', { name: 'Подключить Панель' }).click();

    // Check modal opens
    await expect(page.getByText('Добавить провайдера')).toBeVisible();

    // Try saving empty form
    await page.getByRole('button', { name: 'Сохранить провайдера' }).click();

    // Expect HTML5 validation or Zod errors
    // Currently, since name is required, the browser might block it, 
    // or sonner toast will show error. Let's look for error toast.
    await expect(page.locator('text=API Ключ обязателен')).toBeVisible({ timeout: 5000 });
  });

  test('Admin can test provider connection (fake URL)', async ({ page }) => {
    await page.goto('/admin/providers');
    
    await page.getByRole('button', { name: 'Подключить Панель' }).click();

    await page.getByLabel('Название панели').fill('E2E Test Panel');
    await page.getByLabel('API URL').fill('http://localhost:9999/api/v2');
    await page.getByLabel('API Ключ').fill('fake_key_123');

    // Click test connection
    await page.getByRole('button', { name: 'Тест соединения' }).click();

    // Should fail because localhost:9999 is not serving the API
    await expect(page.getByText(/Ошибка:|Failed to fetch|Network error/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Import Wizard loads successfully', async ({ page }) => {
    const prisma = new PrismaClient();
    let provider = await prisma.provider.findFirst({ where: { name: 'E2E Fake Provider' } });
    if (!provider) {
      provider = await prisma.provider.create({ 
        data: { name: 'E2E Fake Provider', apiUrl: 'http://test.local', apiKey: 'test_key' } 
      });
    }

    await page.goto('/admin/providers/import');

    // Expect the title
    await expect(page.getByText('Мастер импорта услуг')).toBeVisible();

    // Expect the provider to be in the selection list
    await expect(page.getByText('E2E Fake Provider')).toBeVisible();
    
    await prisma.$disconnect();
  });

});
