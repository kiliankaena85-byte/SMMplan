import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Visual Regression QA for Admin Panel', () => {
  test.beforeAll(async () => {
    // Ждем 5 секунд, чтобы дать серверу Next.js завершить начальные запросы готовности (ping от Playwright)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Сеем необходимые тестовые данные перед визуальными тестами
    const email = 'e2e-tester@test.com';
    
    let retries = 5;
    while (retries > 0) {
      const localPrisma = new PrismaClient();
      try {
        const user = await localPrisma.user.upsert({
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
        await localPrisma.order.deleteMany({
          where: {
            user: { email }
          }
        });
        await localPrisma.ticket.deleteMany({
          where: {
            user: { email }
          }
        });

        // Идемпотентный поиск или создание Сети
        let network = await localPrisma.network.findFirst({
          where: { slug: 'telegram' }
        });
        if (!network) {
          network = await localPrisma.network.create({
            data: { name: 'Telegram', slug: 'telegram', isActive: true }
          });
        }

        // Идемпотентный поиск или создание Категории
        let category = await localPrisma.category.findFirst({
          where: { name: 'Подписчики Telegram', networkId: network.id }
        });
        if (!category) {
          category = await localPrisma.category.create({
            data: { name: 'Подписчики Telegram', sort: 1, networkId: network.id }
          });
        }

        // Идемпотентный поиск или создание Провайдера
        let provider = await localPrisma.provider.findFirst({
          where: { name: 'E2E Test Provider' }
        });
        if (!provider) {
          provider = await localPrisma.provider.create({
            data: { name: 'E2E Test Provider', apiUrl: 'http://localhost:3001/api/dev/mock-provider', apiKey: 'test_key' }
          });
        }

        // Идемпотентный поиск или создание Услуги
        let service = await localPrisma.service.findFirst({
          where: { name: 'Telegram Подписчики (Эконом)', categoryId: category.id }
        });
        if (!service) {
          service = await localPrisma.service.create({
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
          await localPrisma.service.update({
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
        const quarantinedService = await localPrisma.service.findFirst({
          where: { name: 'E2E Quarantined Service', categoryId: category.id }
        });
        if (!quarantinedService) {
          await localPrisma.service.create({
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
          await localPrisma.service.update({
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

        const order = await localPrisma.order.findFirst({ where: { userId: user.id } });
        if (!order) {
          await localPrisma.order.create({
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

        const ticket = await localPrisma.ticket.findFirst({ where: { userId: user.id } });
        if (!ticket) {
          await localPrisma.ticket.create({
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
        
        await localPrisma.$disconnect();
        break; // Success, break retry loop!
      } catch (err) {
        retries--;
        console.warn(`⚠️ [Playwright Seed Retry] seeding failed, retrying... (${retries} retries remaining). Error:`, (err as any).message);
        try {
          await localPrisma.$disconnect();
        // eslint-disable-next-line no-empty
        } catch (_) {}
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2s before retry
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
    await page.goto(path, { waitUntil: 'load' });
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

  test('8. Guest Link-First Checkout & Auto-Login Visual E2E Flow', async ({ browser }) => {
    // 1. Create a clean guest context with zero storage state (cookies/auth)
    const guestContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const guestPage = await guestContext.newPage();

    // 2. Navigate to guest checkout page (Landing page)
    await guestPage.goto('/');
    await guestPage.waitForTimeout(2000);

    // Inject stable stylesheet to disable animations and cursors
    await guestPage.addInitScript(() => {
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

    await guestPage.addStyleTag({
      content: `
        [data-testid="balance"], .user-balance, .timestamp, .date-display, .createdAt-cell, .id-cell, .uuid-display {
          visibility: hidden !important;
        }
        .recharts-responsive-container, svg.recharts-surface {
          visibility: hidden !important;
          opacity: 0 !important;
        }
      `
    });

    // 3. Paste test link to trigger Smart Link Analyzer auto-select
    const linkInput = guestPage.locator('input#landing-url').first();
    await expect(linkInput).toBeVisible();
    await linkInput.fill('https://t.me/durov');

    // Click "Показать тарифы" to trigger analyzer mapping & scroll to catalog
    const showTariffsBtn = guestPage.locator('button:has-text("Показать тарифы")').first();
    await showTariffsBtn.click();
    await guestPage.waitForTimeout(2000);

    // 4. Click the first Telegram service card in the desktop grid
    const firstServiceCard = guestPage.locator('div.group.w-full.flex.flex-col.p-6').first();
    await expect(firstServiceCard).toBeVisible({ timeout: 15000 });
    await firstServiceCard.click();
    await guestPage.waitForTimeout(1000);

    // 5. Fill quantity in StickyCheckoutBar
    const qtyInput = guestPage.locator('input[type="number"]').first();
    await expect(qtyInput).toBeVisible();
    await qtyInput.fill('100');

    // 6. Fill Guest email in StickyCheckoutBar
    const emailInput = guestPage.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    await emailInput.fill('e2e-guest-checkout@test.com');
    await guestPage.waitForTimeout(1000);

    // Screenshot 1: Guest order form configured correctly
    await expect(guestPage).toHaveScreenshot('guest_checkout_form.png', {
      maxDiffPixelRatio: 0.15,
      mask: [
        guestPage.locator('[data-testid="price-calc"]'),
        guestPage.locator('button:has-text("Оплатить")')
      ]
    });

    // 7. Submit order and intercept simulator redirect
    const payBtn = guestPage.locator('div.fixed.bottom-6 button:has-text("Оплатить")').first();
    await expect(payBtn).toBeEnabled();

    // Mock the external payment gateway landing screen
    await guestPage.route('**/api/dev/mock-payment*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body><div data-testid="mock-gateway">Mock YooKassa Payment Gateway</div></body></html>'
    }));

    await payBtn.dispatchEvent('click');
    await guestPage.waitForTimeout(1500);

    // 8. Confirm gateway inside PaymentGatewaySelectionModal
    const modalPayBtn = guestPage.locator('button:has-text("Оплатить")').last();
    await expect(modalPayBtn).toBeVisible({ timeout: 5000 });
    await modalPayBtn.dispatchEvent('click');
    await guestPage.waitForTimeout(1500);

    // Screenshot 2: Mock Payment Gateway Redirect Screen
    await expect(guestPage).toHaveScreenshot('guest_payment_redirect.png', {
      maxDiffPixelRatio: 0.15
    });

    await guestContext.close();
  });

  test('9. Mobile UX Warning Block and Validation Checkbox', async ({ browser }) => {
    // 1. Создаем контекст для мобильного устройства (iPhone 12 / 375x812)
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
      isMobile: true,
      storageState: { cookies: [], origins: [] }
    });
    const mobilePage = await mobileContext.newPage();

    // 2. Переходим на главную страницу
    await mobilePage.goto('/');
    await mobilePage.waitForTimeout(2000);

    // Внедряем CSS для стабильного тестирования
    await mobilePage.addInitScript(() => {
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

    await mobilePage.addStyleTag({
      content: `
        [data-testid="balance"], .user-balance, .timestamp, .date-display, .createdAt-cell, .id-cell, .uuid-display {
          visibility: hidden !important;
        }
      `
    });

    // 3. Вводим ссылку на Telegram пост для активации предупреждения Telegram просмотров
    const urlInput = mobilePage.locator('input#standard-url-input').first();
    await expect(urlInput).toBeVisible();
    await urlInput.fill('https://t.me/durov/12');
    await mobilePage.waitForTimeout(1000);

    // 4. Выбираем первый тариф в MobileWizard (так как категория "Просмотры" должна быть выбрана автоматически анализатором ссылок)
    const tariffButton = mobilePage.locator('div.grid-cols-1 button').first();
    await expect(tariffButton).toBeVisible();
    await tariffButton.click();
    await mobilePage.waitForTimeout(1000);

    // 5. Переходим к шагу 2
    const nextBtn = mobilePage.locator('button:has-text("Далее")').first();
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    await mobilePage.waitForTimeout(1000);

    // 6. Заполняем email и количество
    const emailInput = mobilePage.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    await emailInput.fill('e2e-mobile-warnings@test.com');

    // Убеждаемся, что предупреждение о медиагруппах и чекбокс отображаются на Шаге 2
    const warningConfirmContainer = mobilePage.locator('div.bg-warning\\/5').first();
    await expect(warningConfirmContainer).toBeVisible();

    // 7. Нажимаем кнопку оплаты без активации согласия
    const payBtn = mobilePage.locator('button:has-text("Оплатить")').first();
    await expect(payBtn).toBeVisible();
    await payBtn.click();
    await mobilePage.waitForTimeout(1000);

    // 8. Убеждаемся, что чекбокс согласия подсветился ошибкой (получил класс border-destructive)
    await expect(warningConfirmContainer).toHaveClass(/border-destructive/);

    // 9. Кликаем по чекбоксу согласия
    const checkbox = mobilePage.locator('input#warning-confirm-checkbox').first();
    await expect(checkbox).toBeVisible();
    await checkbox.click();
    await mobilePage.waitForTimeout(1000);

    // 10. Убеждаемся, что класс ошибки ушел
    await expect(warningConfirmContainer).not.toHaveClass(/border-destructive/);

    await mobileContext.close();
  });
});
