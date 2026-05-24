import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Visual Regression QA for Admin Panel', () => {
  test.beforeAll(async () => {
    // Ждем 3 секунды, чтобы дать серверу Next.js завершить начальные запросы готовности (ping от Playwright)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Сеем необходимые тестовые данные перед визуальными тестами
    const email = 'e2e-tester@test.com';
    
    let retries = 5;
    while (retries > 0) {
      try {
        const user = await prisma.user.upsert({
          where: { email },
          update: {
            role: 'OWNER',
            isActive: true,
            isDeleted: false,
          },
          create: {
            email,
            role: 'OWNER',
            isActive: true,
            isDeleted: false,
            balance: BigInt(20000000), // 200K RUB
          },
        });

        // Clean up only the specific user's orders and tickets to ensure clean state
        await prisma.order.deleteMany({
          where: {
            user: { email }
          }
        });
        await prisma.ticket.deleteMany({
          where: {
            user: { email }
          }
        });

        // Идемпотентный поиск или создание Сети
        let network = await prisma.network.findFirst({
          where: { slug: 'telegram' }
        });
        if (!network) {
          network = await prisma.network.create({
            data: { name: 'Telegram', slug: 'telegram', isActive: true }
          });
        }

        // Идемпотентный поиск или создание Категории
        let category = await prisma.category.findFirst({
          where: { name: 'Подписчики Telegram', networkId: network.id }
        });
        if (!category) {
          category = await prisma.category.create({
            data: { name: 'Подписчики Telegram', sort: 1, networkId: network.id }
          });
        }

        // Идемпотентный поиск или создание Провайдера
        let provider = await prisma.provider.findFirst({
          where: { name: 'E2E Test Provider' }
        });
        if (!provider) {
          provider = await prisma.provider.create({
            data: { name: 'E2E Test Provider', apiUrl: 'http://test.local', apiKey: 'test_key' }
          });
        }

        // Идемпотентный поиск или создание Услуги
        let service = await prisma.service.findFirst({
          where: { name: 'Telegram Подписчики (Эконом)', categoryId: category.id }
        });
        if (!service) {
          service = await prisma.service.create({
            data: {
              name: 'Telegram Подписчики (Эконом)',
              categoryId: category.id,
              providerId: provider.id,
              rate: 1.5,
              minQty: 10,
              maxQty: 10000,
              isActive: true,
              targetType: 'CHANNEL'
            }
          });
        } else {
          await prisma.service.update({
            where: { id: service.id },
            data: {
              rate: 1.5,
              minQty: 10,
              maxQty: 10000,
              isActive: true,
              targetType: 'CHANNEL'
            }
          });
        }

        // Идемпотентный поиск или создание Карантинной Услуги
        let quarantinedService = await prisma.service.findFirst({
          where: { name: 'E2E Quarantined Service', categoryId: category.id }
        });
        if (!quarantinedService) {
          await prisma.service.create({
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
        } else {
          await prisma.service.update({
            where: { id: quarantinedService.id },
            data: {
              rate: 10.0,
              isQuarantined: true,
              pendingRate: 20.0,
              quarantineReason: 'E2E Price increase by 100%',
              minQty: 10,
              maxQty: 1000
            }
          });
        }

        let order = await prisma.order.findFirst({ where: { userId: user.id } });
        if (!order) {
          await prisma.order.create({
            data: {
              userId: user.id,
              serviceId: service.id,
              providerId: provider.id,
              quantity: 100,
              status: 'PENDING',
              charge: BigInt(1500),
              providerCost: BigInt(500),
              link: 'https://t.me/testchannel'
            }
          });
        }

        let ticket = await prisma.ticket.findFirst({ where: { userId: user.id } });
        if (!ticket) {
          await prisma.ticket.create({
            data: {
              userId: user.id,
              subject: 'Visual QA Test Ticket',
              status: 'OPEN',
              messages: {
                create: [
                  { text: 'Привет, это тестовый тикет для проверки интерфейса.', sender: 'USER' },
                  { text: 'Здравствуйте! Мы проверяем ваш запрос.', sender: 'STAFF' }
                ]
              }
            }
          });
        }
        
        break; // Success, break retry loop!
      } catch (err) {
        retries--;
        console.warn(`⚠️ [Playwright Seed Retry] seeding failed, retrying... (${retries} retries remaining). Error:`, err.message);
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 1500)); // wait 1.5s before retry
      }
    }
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test.beforeEach(async ({ page }) => {
    // Внедряем CSS стили для стабильного рендеринга макетов и отсутствия курсоров/анимаций
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.innerHTML = `
        *, *::before, *::after {
          transition: none !important;
          animation: none !important;
          caret-color: transparent !important;
        }
      `;
      document.head.appendChild(style);
    });
  });

  const setupPageAndCapture = async (page: any, path: string) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Даем время для гидратации и отрисовки диаграмм
    
    // Дополнительная инъекция CSS для скрытия динамического числового или SVG контента
    await page.addStyleTag({
      content: `
        .recharts-responsive-container, svg.recharts-surface, .dynamic-chart, .financial-chart, .orders-chart {
          visibility: hidden !important;
          opacity: 0 !important;
        }
        [data-testid="balance"], .user-balance, .timestamp, .date-display, .createdAt-cell, .id-cell, .uuid-display {
          visibility: hidden !important;
        }
      `
    });
  };

  test('1. Dashboard page visual integrity', async ({ page }) => {
    await setupPageAndCapture(page, '/admin/dashboard');
    await expect(page).toHaveScreenshot('dashboard_desktop.png', {
      maxDiffPixelRatio: 0.01,
      mask: [
        page.locator('.recharts-responsive-container'),
        page.locator('.dynamic-chart'),
        page.locator('[data-testid="balance"]')
      ]
    });
  });

  test('2. Orders page visual integrity', async ({ page }) => {
    await setupPageAndCapture(page, '/admin/orders');
    await expect(page).toHaveScreenshot('orders_desktop.png', {
      maxDiffPixelRatio: 0.01,
      mask: [
        page.locator('table tbody tr .id-cell'),
        page.locator('table tbody tr .createdAt-cell')
      ]
    });
  });

  test('3. Services page visual integrity', async ({ page }) => {
    await setupPageAndCapture(page, '/admin/catalog');
    await expect(page).toHaveScreenshot('catalog_desktop.png', {
      maxDiffPixelRatio: 0.01,
      mask: [
        page.locator('table tbody tr .createdAt-cell')
      ]
    });
  });

  test('4. Providers page visual integrity', async ({ page }) => {
    await setupPageAndCapture(page, '/admin/providers');
    await expect(page).toHaveScreenshot('providers_desktop.png', {
      maxDiffPixelRatio: 0.01,
      mask: [
        page.locator('table tbody tr .createdAt-cell')
      ]
    });
  });

  test('5. Clients page visual integrity', async ({ page }) => {
    await setupPageAndCapture(page, '/admin/clients');
    await expect(page).toHaveScreenshot('clients_desktop.png', {
      maxDiffPixelRatio: 0.01,
      mask: [
        page.locator('table tbody tr .createdAt-cell'),
        page.locator('[data-testid="balance"]')
      ]
    });
  });

  test('6. Support Chat page visual integrity', async ({ page }) => {
    await setupPageAndCapture(page, '/admin/tickets');
    await expect(page).toHaveScreenshot('tickets_desktop.png', {
      maxDiffPixelRatio: 0.01,
      mask: [
        page.locator('.timestamp'),
        page.locator('.createdAt-cell')
      ]
    });
  });

  test('7. Settings page visual integrity', async ({ page }) => {
    await setupPageAndCapture(page, '/admin/settings');
    await expect(page).toHaveScreenshot('settings_desktop.png', {
      maxDiffPixelRatio: 0.01
    });
  });
});
