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
    await expect(page.getByRole('link', { name: '+ Подключить Панель' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Импорт Услуг' })).toBeVisible();
  });

  test('Admin can open provider creation form and validate fields', async ({ page }) => {
    await page.goto('/admin/providers');
    
    // Click "+ Подключить Панель"
    await page.getByRole('link', { name: '+ Подключить Панель' }).click();

    // Check page opens
    await expect(page.getByRole('heading', { name: 'Новое подключение' })).toBeVisible();

    // Try saving empty form
    await page.getByRole('button', { name: 'Создать провайдера' }).click();

    // Expect validation errors
    await expect(page.locator('text=API Ключ обязателен').first()).toBeVisible({ timeout: 5000 });
  });

  test('Admin can test provider connection (fake URL)', async ({ page }) => {
    const prisma = new PrismaClient();
    let provider = await prisma.provider.findFirst({ where: { name: 'E2E Connection Test Provider' } });
    if (!provider) {
      provider = await prisma.provider.create({ 
        data: { name: 'E2E Connection Test Provider', apiUrl: 'http://localhost:9999/api/v2', apiKey: 'fake_key_123', isActive: true } 
      });
    } else {
      await prisma.provider.update({ where: { id: provider.id }, data: { apiUrl: 'http://localhost:9999/api/v2', apiKey: 'fake_key_123', isActive: true } });
    }
    await prisma.$disconnect();

    await page.goto('/admin/providers');
    
    // Find the connection test provider in table and click "Настроить"
    const row = page.locator('tr', { hasText: 'E2E Connection Test Provider' });
    await row.getByRole('link', { name: 'Настроить' }).click();

    // Expect to be on Edit page
    await expect(page.getByRole('heading', { name: 'Новое подключение' })).not.toBeVisible();

    // Click test connection
    await page.getByRole('button', { name: 'Протестировать API соединение' }).click();

    // Should fail because localhost:9999 is not serving the API
    await expect(page.getByText(/Ошибка:|Failed to fetch|Network error|Ошибка соединения/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Import Wizard loads successfully', async ({ page }) => {
    const prisma = new PrismaClient();
    let provider = await prisma.provider.findFirst({ where: { name: 'E2E Fake Provider' } });
    if (!provider) {
      provider = await prisma.provider.create({ 
        data: { name: 'E2E Fake Provider', apiUrl: 'http://test.local', apiKey: 'test_key', isActive: true } 
      });
    } else if (!provider.isActive) {
      await prisma.provider.update({ where: { id: provider.id }, data: { isActive: true } });
    }

    await page.goto('/admin/providers/import');

    // Expect the title
    await expect(page.getByRole('heading', { name: 'Импорт Услуг' })).toBeVisible();

    // Expect the provider to be in the selection list
    await expect(page.locator('select').first()).toContainText('E2E Fake Provider');
    
    await prisma.$disconnect();
  });

});
