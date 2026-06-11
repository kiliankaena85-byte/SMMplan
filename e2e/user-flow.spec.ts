import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

test.describe('Milestone 4: Playwright E2E User Flow Tests', () => {

  const cleanupDb = async () => {
    const testUserEmails = ['e2e-magic-tester@test.com', 'e2e-sufficient@test.com', 'e2e-insufficient@test.com'];
    const testServiceIds = ['e2e-sub-service', 'e2e-like-service', 'e2e-story-service', 'e2e-custom-service'];
    const testCategoryIds = ['e2e-telegram-subs-cat', 'e2e-telegram-likes-cat', 'e2e-instagram-stories-cat', 'e2e-telegram-custom-cat'];

    try {
      const users = await prisma.user.findMany({
        where: { email: { in: testUserEmails } }
      });
      const userIds = users.map(u => u.id);

      // 1. Delete all invoices for these users
      try {
        await prisma.invoice.deleteMany({
          where: { userId: { in: userIds } }
        });
      } catch (e) {
        console.warn('Invoice cleanup skipped:', (e as Error).message);
      }

      // 2. Delete all orders referencing our test services OR test users/emails
      try {
        await prisma.order.deleteMany({
          where: {
            OR: [
              { userId: { in: userIds } },
              { email: { in: testUserEmails } },
              { serviceId: { in: testServiceIds } }
            ]
          }
        });
      } catch (e) {
        console.warn('Order cleanup skipped:', (e as Error).message);
      }

      // 3. Delete payments for these users
      try {
        await prisma.payment.deleteMany({
          where: { userId: { in: userIds } }
        });
      } catch (e) {
        console.warn('Payment cleanup skipped:', (e as Error).message);
      }

      // 4. Delete ledger entries for these users (skip because of database trigger immutability)
      try {
        await prisma.ledgerEntry.deleteMany({
          where: { userId: { in: userIds } }
        });
      } catch (e) {
        console.warn('LedgerEntry cleanup skipped (ledger is immutable):', (e as Error).message);
      }

      // 5. Delete auth tokens
      try {
        await prisma.authToken.deleteMany({
          where: { userId: { in: userIds } }
        });
      } catch (e) {
        console.warn('AuthToken cleanup skipped:', (e as Error).message);
      }

      // 6. Delete sessions
      try {
        await prisma.session.deleteMany({
          where: { userId: { in: userIds } }
        });
      } catch (e) {
        console.warn('Session cleanup skipped:', (e as Error).message);
      }

      // 7. Delete services
      try {
        await prisma.service.deleteMany({
          where: { id: { in: testServiceIds } }
        });
      } catch (e) {
        console.warn('Service cleanup skipped:', (e as Error).message);
      }

      // 8. Delete categories
      try {
        await prisma.category.deleteMany({
          where: { id: { in: testCategoryIds } }
        });
      } catch (e) {
        console.warn('Category cleanup skipped:', (e as Error).message);
      }

      // 9. Delete users
      try {
        await prisma.user.deleteMany({
          where: { id: { in: userIds } }
        });
      } catch (e) {
        console.warn('User cleanup skipped (possibly referenced by immutable ledger):', (e as Error).message);
      }
    } catch (e) {
      console.error('Error during cleanup:', e);
    }
  };

  test.beforeAll(async () => {
    // 1. Clear any leftover test data first
    await cleanupDb();

    // 2. Ensure networks exist
    let network = await prisma.network.findUnique({ where: { slug: 'telegram' } });
    if (!network) {
      network = await prisma.network.create({ data: { name: 'Telegram', slug: 'telegram' } });
    }

    let instagramNetwork = await prisma.network.findUnique({ where: { slug: 'instagram' } });
    if (!instagramNetwork) {
      instagramNetwork = await prisma.network.create({ data: { name: 'Instagram', slug: 'instagram' } });
    }

    // 3. Create Categories
    await prisma.category.upsert({
      where: { id: 'e2e-telegram-subs-cat' },
      update: {
        name: 'E2E Telegram Subscribers',
        sort: 10,
        networkId: network.id
      },
      create: {
        id: 'e2e-telegram-subs-cat',
        name: 'E2E Telegram Subscribers',
        sort: 10,
        networkId: network.id
      }
    });

    await prisma.category.upsert({
      where: { id: 'e2e-telegram-likes-cat' },
      update: {
        name: 'E2E Telegram Likes',
        sort: 11,
        networkId: network.id
      },
      create: {
        id: 'e2e-telegram-likes-cat',
        name: 'E2E Telegram Likes',
        sort: 11,
        networkId: network.id
      }
    });

    await prisma.category.upsert({
      where: { id: 'e2e-instagram-stories-cat' },
      update: {
        name: 'E2E Instagram Stories',
        sort: 12,
        networkId: instagramNetwork.id
      },
      create: {
        id: 'e2e-instagram-stories-cat',
        name: 'E2E Instagram Stories',
        sort: 12,
        networkId: instagramNetwork.id
      }
    });

    await prisma.category.upsert({
      where: { id: 'e2e-telegram-custom-cat' },
      update: {
        name: 'E2E Telegram Custom Subscribers',
        sort: 13,
        networkId: network.id
      },
      create: {
        id: 'e2e-telegram-custom-cat',
        name: 'E2E Telegram Custom Subscribers',
        sort: 13,
        networkId: network.id
      }
    });

    // 4. Create Provider
    let provider = await prisma.provider.findFirst({ where: { name: 'E2E Test Provider' } });
    if (!provider) {
      provider = await prisma.provider.create({
        data: { name: 'E2E Test Provider', apiUrl: 'http://test.local', apiKey: 'test_key' }
      });
    }

    // 5. Create Services
    await prisma.service.upsert({
      where: { id: 'e2e-sub-service' },
      update: {
        name: 'E2E Subscribers Service',
        categoryId: 'e2e-telegram-subs-cat',
        providerId: provider.id,
        rate: 1.0,
        markup: 2.5,
        minQty: 10,
        maxQty: 10000,
        isQuarantined: false,
        isActive: true,
        externalId: 'e2e-sub-101',
        targetType: 'CHANNEL'
      },
      create: {
        id: 'e2e-sub-service',
        name: 'E2E Subscribers Service',
        categoryId: 'e2e-telegram-subs-cat',
        providerId: provider.id,
        rate: 1.0,
        markup: 2.5,
        minQty: 10,
        maxQty: 10000,
        isQuarantined: false,
        isActive: true,
        externalId: 'e2e-sub-101',
        targetType: 'CHANNEL'
      }
    });

    await prisma.service.upsert({
      where: { id: 'e2e-like-service' },
      update: {
        name: 'E2E Likes Service',
        categoryId: 'e2e-telegram-likes-cat',
        providerId: provider.id,
        rate: 1.0,
        markup: 2.5,
        minQty: 10,
        maxQty: 10000,
        isQuarantined: false,
        isActive: true,
        externalId: 'e2e-like-101',
        targetType: 'POST'
      },
      create: {
        id: 'e2e-like-service',
        name: 'E2E Likes Service',
        categoryId: 'e2e-telegram-likes-cat',
        providerId: provider.id,
        rate: 1.0,
        markup: 2.5,
        minQty: 10,
        maxQty: 10000,
        isQuarantined: false,
        isActive: true,
        externalId: 'e2e-like-101',
        targetType: 'POST'
      }
    });

    await prisma.service.upsert({
      where: { id: 'e2e-story-service' },
      update: {
        name: 'E2E Story Service',
        categoryId: 'e2e-instagram-stories-cat',
        providerId: provider.id,
        rate: 1.0,
        markup: 2.5,
        minQty: 10,
        maxQty: 10000,
        isQuarantined: false,
        isActive: true,
        externalId: 'e2e-story-101',
        targetType: 'STORY'
      },
      create: {
        id: 'e2e-story-service',
        name: 'E2E Story Service',
        categoryId: 'e2e-instagram-stories-cat',
        providerId: provider.id,
        rate: 1.0,
        markup: 2.5,
        minQty: 10,
        maxQty: 10000,
        isQuarantined: false,
        isActive: true,
        externalId: 'e2e-story-101',
        targetType: 'STORY'
      }
    });

    await prisma.service.upsert({
      where: { id: 'e2e-custom-service' },
      update: {
        name: 'E2E Custom Service',
        categoryId: 'e2e-telegram-custom-cat',
        providerId: provider.id,
        rate: 1.0,
        markup: 2.5,
        minQty: 10,
        maxQty: 10000,
        isQuarantined: false,
        isActive: true,
        externalId: 'e2e-custom-101',
        targetType: 'CUSTOM'
      },
      create: {
        id: 'e2e-custom-service',
        name: 'E2E Custom Service',
        categoryId: 'e2e-telegram-custom-cat',
        providerId: provider.id,
        rate: 1.0,
        markup: 2.5,
        minQty: 10,
        maxQty: 10000,
        isQuarantined: false,
        isActive: true,
        externalId: 'e2e-custom-101',
        targetType: 'CUSTOM'
      }
    });

    // 6. Update global Settings to keep exchangeRateUSD stable and isTestMode true
    await prisma.systemSettings.upsert({
      where: { id: 'global' },
      update: {
        isTestMode: true,
        exchangeRateUSD: 95.0
      },
      create: {
        id: 'global',
        isTestMode: true,
        exchangeRateUSD: 95.0
      }
    });
  });

  test.afterAll(async () => {
    // Teardown E2E test data
    await cleanupDb();
    await prisma.$disconnect();
  });

  // ==========================================
  // Test Case 1: Magic Link Request & Verify Callback
  // ==========================================
  test.describe('Magic Link authentication', () => {
    // Bypass default logged-in session state to run as a guest
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should request magic link, create AuthToken in DB, and verify successfully via callback', async ({ page }) => {
      const email = 'e2e-magic-tester@test.com';

      // 1. Visit /login
      await page.goto('/login');
      await expect(page).toHaveURL(/login/);
      
      // Allow React hydration to complete to prevent no-op clicks
      await page.waitForTimeout(2000);

      // 2. Switch to Magic Link tab
      const magicTab = page.locator('button', { hasText: 'Войти по ссылке' }).first();
      await expect(magicTab).toBeVisible();
      await magicTab.click();

      // 3. Fill email in the magic link email field
      const magicEmailInput = page.locator('input#login-email-magic');
      await expect(magicEmailInput).toBeVisible();
      await magicEmailInput.fill(email);

      // 4. Click the send button (submit)
      const sendBtn = page.locator('button[type="submit"]', { hasText: 'Получить ссылку' }).first();
      await expect(sendBtn).toBeVisible();
      await sendBtn.click();

      // 5. Assert success message is displayed
      const successMsg = page.locator('div, p', { hasText: /Проверьте почту|Ссылка отправлена/i }).first();
      await expect(successMsg).toBeVisible({ timeout: 10000 });

      // 6. Assert that an AuthToken is created in the database for the user
      // Retrieve the user from the database
      const dbUser = await prisma.user.findUnique({
        where: { email },
        include: { authTokens: true }
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.authTokens.length).toBeGreaterThan(0);

      // 7. Verify Callback: Generate a known raw token, hash it using SHA-256
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      // Use 24h expiration to tolerate any timezone difference between server/DB/runner
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create an AuthToken record in the DB for the test user
      const dbToken = await prisma.authToken.create({
        data: {
          userId: dbUser!.id,
          token: hashedToken,
          expiresAt,
          used: false
        }
      });

      // 8. Navigate browser directly to the callback endpoint /api/auth/verify?token=rawToken
      await page.goto(`/api/auth/verify?token=${rawToken}`);

      // 9. Assert redirection to dashboard
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });

      // 10. Assert that the database token is consumed (used: true)
      const finalToken = await prisma.authToken.findUnique({
        where: { id: dbToken.id }
      });
      expect(finalToken).not.toBeNull();
      expect(finalToken!.used).toBe(true);
    });
  });

  // ==========================================
  // Helper for Authenticated Scenarios
  // ==========================================
  const setupAuthenticatedUser = async (email: string, balanceCents: number, page: any) => {
    // Create/upsert user with specified balance
    const user = await prisma.user.upsert({
      where: { email },
      update: { balance: balanceCents, isActive: true, isDeleted: false },
      create: { email, balance: balanceCents, role: 'USER' }
    });

    // Create a new AuthToken for callback authentication
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    // Use 24h expiration to tolerate timezone differences
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.authToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
        used: false
      }
    });

    // Authenticate by visiting the verification callback
    await page.goto(`/api/auth/verify?token=${rawToken}`);
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
    return user;
  };

  // Helper to handle responsive selectors for service selection
  const selectService = async (page: any, serviceId: string, serviceName: string) => {
    const selectElement = page.locator('select#service-select').first();
    if (await selectElement.isVisible()) {
      await selectElement.selectOption(serviceId);
    } else {
      const optionBtn = page.locator('button[role="option"]', { hasText: serviceName }).first();
      await expect(optionBtn).toBeVisible({ timeout: 15000 });
      await optionBtn.click();
    }
  };

  // Helper to wait for URL analysis debounce and loading indicator to settle
  const fillUrlAndWait = async (page: any, url: string) => {
    const urlInput = page.locator('input#order-url').first();
    await urlInput.fill(url);
    await urlInput.blur();
    // Wait a brief moment for state transitions/loading to trigger
    await page.waitForTimeout(100);
    const loader = page.locator('.animate-spin').first();
    try {
      if (await loader.isVisible()) {
        await expect(loader).toBeHidden({ timeout: 15000 });
      }
    } catch (e) {
      console.log('Loader was not visible or did not disappear in time:', e);
    }
    // Final settling timeout to allow React components to re-render
    await page.waitForTimeout(300);
  };

  // ==========================================
  // Test Case 2: Unit Pricing Display (₽ / шт)
  // ==========================================
  test('should display unit prices (₽ / шт) instead of per 1000 units and exclude bulk package labels', async ({ page }) => {
    // 1. Log in e2e-sufficient@test.com
    await setupAuthenticatedUser('e2e-sufficient@test.com', 10000_00, page);

    // 2. Revalidate the catalog cache
    await page.request.get('/api/debug?revalidate=catalog');

    // 3. Visit new order page
    await page.goto('/dashboard/new-order');
    await expect(page.locator('h1', { hasText: 'Новый заказ' })).toBeVisible();

    // 4. Input Telegram link to activate platform
    await fillUrlAndWait(page, 'https://t.me/durov');

    // 5. Select category "E2E Telegram Subscribers"
    const categoryTab = page.getByRole('tab', { name: /E2E Telegram Subscribers/i }).first();
    await expect(categoryTab).toBeVisible({ timeout: 10000 });
    await categoryTab.click();

    // 6. Select Service and verify price unit formatting
    const selectElement = page.locator('select#service-select').first();
    if (await selectElement.isVisible()) {
      await selectElement.selectOption('e2e-sub-service');
      // 7. Verify price contains "₽ / шт" and not "/ 1000 шт"
      const optionText = await selectElement.locator('option', { hasText: /E2E Subscribers Service/i }).first().textContent();
      expect(optionText).toContain('₽ / шт');
      expect(optionText).not.toContain('/ 1000 шт');
    } else {
      const optionBtn = page.locator('button[role="option"]', { hasText: 'E2E Subscribers Service' }).first();
      await expect(optionBtn).toBeVisible({ timeout: 15000 });
      await optionBtn.click();

      // 7. Verify price contains "₽ / шт" (or is split in tokens) and not "/ 1000 шт"
      const optionText = await optionBtn.textContent();
      expect(optionText).toContain('₽');
      expect(optionText).toContain('/ шт');
      expect(optionText).not.toContain('/ 1000 шт');
    }

    // 8. Assert that no bulk package labels (e.g. "/ 1000 шт") exist in the form layout
    const pageContent = await page.content();
    expect(pageContent).not.toContain('/ 1000 шт');
  });

  // ==========================================
  // Test Case 3: Link Category targetType Validation
  // ==========================================
  test('should enforce link targetType validations (CHANNEL vs POST) and show validation errors', async ({ page }) => {
    // 1. Log in e2e-sufficient@test.com
    await setupAuthenticatedUser('e2e-sufficient@test.com', 10000_00, page);

    // 2. Revalidate catalog
    await page.request.get('/api/debug?revalidate=catalog');

    // 3. Visit page
    await page.goto('/dashboard/new-order');

    // --- CASE A: Likes service expects POST link, but we input CHANNEL link ---
    // Start with a valid POST link to ensure the likes category tab is not filtered out
    await fillUrlAndWait(page, 'https://t.me/durov/123');

    // Select category "E2E Telegram Likes" (expects POST)
    const likesCategoryTab = page.getByRole('tab', { name: /E2E Telegram Likes/i }).first();
    await expect(likesCategoryTab).toBeVisible({ timeout: 10000 });
    await likesCategoryTab.click();

    await selectService(page, 'e2e-like-service', 'E2E Likes Service');

    // Now fill the invalid CHANNEL link
    await fillUrlAndWait(page, 'https://t.me/durov');

    // Assert that validation error is shown in the UI
    const errorText = page.locator('p.text-destructive, p[role="alert"]').first();
    await expect(errorText).toBeVisible({ timeout: 5000 });

    // Let's check what standard error is in Russian: 'Укажите ссылку на конкретный пост' - yes, 'конкретный пост' or 'конкретный post' (actually 'конкретный пост')
    // Let's make it robust by checking /конкретный пост|пост/i
    await expect(errorText).toContainText(/конкретный пост|пост/i);

    // --- CASE B: Subscribers service expects CHANNEL link, but we input POST link ---
    // First select the category and service while the link in input is CHANNEL (which is valid/visible for subscribers)
    const subsCategoryTab = page.getByRole('tab', { name: /E2E Telegram Subscribers/i }).first();
    await expect(subsCategoryTab).toBeVisible({ timeout: 10000 });
    await subsCategoryTab.click();

    await selectService(page, 'e2e-sub-service', 'E2E Subscribers Service');

    // Now fill in the invalid POST link manually without blur to prevent auto-correction
    const urlInput = page.locator('input#order-url').first();
    await urlInput.fill('https://t.me/durov/123');
    await page.waitForTimeout(500);

    // Assert that validation error for channel is shown
    await expect(errorText).toBeVisible({ timeout: 5000 });
    await expect(errorText).toContainText(/публичную ссылку на канал|канал/i);

    // --- CASE C: Valid link passes validation and enables submit ---
    await fillUrlAndWait(page, 'https://t.me/durov'); // CHANNEL link for CHANNEL expected service

    // The error should disappear
    await expect(errorText).toBeHidden({ timeout: 5000 });

    // Submit button should be enabled (once quantity and email are filled)
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isEditable()) {
      await emailInput.fill('e2e-sufficient@test.com');
    }

    const submitBtn = page.locator('button', { hasText: /Оплатить заказ/i }).first();
    await expect(submitBtn).toBeEnabled();
  });

  // ==========================================
  // Test Case 3b: Link Category targetType Validation (STORY vs CUSTOM)
  // ==========================================
  test('should enforce link targetType validations (STORY vs CUSTOM) and show validation errors', async ({ page }) => {
    // 1. Log in e2e-sufficient@test.com
    await setupAuthenticatedUser('e2e-sufficient@test.com', 10000_00, page);

    // 2. Revalidate catalog
    await page.request.get('/api/debug?revalidate=catalog');

    // 3. Visit page
    await page.goto('/dashboard/new-order');

    // --- CASE A: STORY expects a profile URL ---
    // Start with a valid Instagram URL so the Instagram network is detected and E2E Instagram Stories tab is shown
    await fillUrlAndWait(page, 'https://instagram.com/cristiano');

    // Select category "E2E Instagram Stories" (expects STORY)
    const storyCategoryTab = page.getByRole('tab', { name: /E2E Instagram Stories/i }).first();
    await expect(storyCategoryTab).toBeVisible({ timeout: 10000 });
    await storyCategoryTab.click();

    await selectService(page, 'e2e-story-service', 'E2E Story Service');

    // Now fill with an invalid URL (Instagram post link like https://www.instagram.com/p/C0f9g4xN8a9/)
    await fillUrlAndWait(page, 'https://www.instagram.com/p/C0f9g4xN8a9/');

    // Assert that validation error is shown in the UI
    const errorText = page.locator('p.text-destructive, p[role="alert"]').first();
    await expect(errorText).toBeVisible({ timeout: 5000 });
    await expect(errorText).toContainText(/профиль Instagram|профиль/i);

    // Now fill back with a valid profile URL
    await fillUrlAndWait(page, 'https://instagram.com/cristiano');
    await expect(errorText).toBeHidden({ timeout: 5000 });

    // --- CASE B: CUSTOM expects a valid URL ---
    // Start with a Telegram URL so the Telegram network is detected and E2E Telegram Custom tab is shown
    await fillUrlAndWait(page, 'https://t.me/durov');

    // Select category "E2E Telegram Custom" (expects CUSTOM)
    const customCategoryTab = page.getByRole('tab', { name: /E2E Telegram Custom/i }).first();
    await expect(customCategoryTab).toBeVisible({ timeout: 10000 });
    await customCategoryTab.click();

    await selectService(page, 'e2e-custom-service', 'E2E Custom Service');

    // Now fill with an invalid URL (not a valid URL format)
    await fillUrlAndWait(page, 'not-a-valid-url-format');

    // Assert that validation error is shown
    await expect(errorText).toBeVisible({ timeout: 5000 });
    await expect(errorText).toContainText(/корректную ссылку|ссылка|ссылку/i);

    // Fill with a valid URL
    await fillUrlAndWait(page, 'https://my-custom-link.com/any-path');
    await expect(errorText).toBeHidden({ timeout: 5000 });
  });

  // ==========================================
  // Test Case 4: Checkout, Balance Deduction, & Order Creation
  // ==========================================
  test.describe('Checkout flows', () => {

    test('should deduct balance and create order when balance is sufficient', async ({ page }) => {
      const email = 'e2e-sufficient@test.com';
      // Set user balance to 100 RUB = 10,000 cents
      const user = await setupAuthenticatedUser(email, 10000_00, page);

      // Revalidate catalog
      await page.request.get('/api/debug?revalidate=catalog');

      // Go to new order page
      await page.goto('/dashboard/new-order');

      // Fill form
      await fillUrlAndWait(page, 'https://t.me/durov');

      const categoryTab = page.getByRole('tab', { name: /E2E Telegram Subscribers/i }).first();
      await expect(categoryTab).toBeVisible();
      await categoryTab.click();

      await selectService(page, 'e2e-sub-service', 'E2E Subscribers Service');

      const qtyInput = page.locator('input[type="number"], input[placeholder*="Количество"]').first();
      await qtyInput.fill('10'); // Min qty is 10

      // Select 'Баланс' gateway
      const balanceTab = page.locator('button', { hasText: /Баланс/i }).first();
      await expect(balanceTab).toBeVisible();
      await balanceTab.click();

      // Fill email if editable
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isEditable()) {
        await emailInput.fill(email);
      }

      // Agree to terms (default true, no checkbox rendered)

      // Click checkout
      const submitBtn = page.locator('button', { hasText: /Оплатить заказ/i }).first();
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      // Should redirect to success page
      await expect(page).toHaveURL(/success/, { timeout: 30000 });

      // Confirm order is created in database
      const dbOrder = await prisma.order.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });
      expect(dbOrder).not.toBeNull();
      expect(dbOrder!.status).toBe('PENDING'); // Balance payment activates order immediately

      // Confirm balance was deducted by order charge.
      // 10 units at unit price 0.24 is 2.40 RUB = 240 cents.
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(Number(updatedUser!.balance)).toBe(10000_00 - 240); // 9760 cents
    });

    test('should refuse checkout and redirect to payment error page when balance is insufficient', async ({ page }) => {
      const email = 'e2e-insufficient@test.com';
      // Set user balance to 0
      const user = await setupAuthenticatedUser(email, 0, page);

      // Revalidate catalog
      await page.request.get('/api/debug?revalidate=catalog');

      // Go to new order page
      await page.goto('/dashboard/new-order');

      // Fill form
      await fillUrlAndWait(page, 'https://t.me/durov');

      const categoryTab = page.getByRole('tab', { name: /E2E Telegram Subscribers/i }).first();
      await expect(categoryTab).toBeVisible();
      await categoryTab.click();

      await selectService(page, 'e2e-sub-service', 'E2E Subscribers Service');

      const qtyInput = page.locator('input[type="number"], input[placeholder*="Количество"]').first();
      await qtyInput.fill('10');

      // Select 'Баланс' gateway
      const balanceTab = page.locator('button', { hasText: /Баланс/i }).first();
      await expect(balanceTab).toBeVisible();
      await balanceTab.click();

      // Fill email if editable
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isEditable()) {
        await emailInput.fill(email);
      }

      // Agree to terms (default true, no checkbox rendered)

      // Click checkout
      const submitBtn = page.locator('button', { hasText: /Оплатить заказ/i }).first();
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      // Should redirect to payment error page
      await expect(page).toHaveURL(/payment-error/, { timeout: 30000 });
      expect(page.url()).toContain('error=');
      expect(decodeURIComponent(page.url())).toContain('Недостаточно средств');

      // Confirm order is NOT created in database
      const dbOrder = await prisma.order.findFirst({
        where: { userId: user.id }
      });
      expect(dbOrder).toBeNull();
    });

    test('should generate PENDING payment in DB and redirect with paymentId when checking out via YooKassa', async ({ page }) => {
      const email = 'e2e-sufficient@test.com';
      await setupAuthenticatedUser(email, 10000_00, page);
      await page.request.get('/api/debug?revalidate=catalog');
      await page.goto('/dashboard/new-order');

      // Fill form
      await fillUrlAndWait(page, 'https://t.me/durov');

      const categoryTab = page.getByRole('tab', { name: /E2E Telegram Subscribers/i }).first();
      await expect(categoryTab).toBeVisible();
      await categoryTab.click();

      await selectService(page, 'e2e-sub-service', 'E2E Subscribers Service');

      const qtyInput = page.locator('input[type="number"], input[placeholder*="Количество"]').first();
      await qtyInput.fill('10');

      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isEditable()) {
        await emailInput.fill(email);
      }

      // Agree to terms (default true, no checkbox rendered)

      // Intercept mock-payment redirect
      let redirectUrl: string | null = null;
      await page.route('**/api/dev/mock-payment*', async (route) => {
        redirectUrl = route.request().url();
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<html><body>Mock Gateway</body></html>'
        });
      });

      // Select YooKassa gateway first (button with text "СБП / Карта")
      const yookassaBtn = page.locator('button', { hasText: /СБП \/ Карта/i }).first();
      await expect(yookassaBtn).toBeVisible();
      await yookassaBtn.click();

      // Click checkout
      const submitBtn = page.locator('button', { hasText: /Оплатить заказ/i }).first();
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      // Wait for the redirect route to trigger
      await page.waitForTimeout(2000);

      // Verify redirection occurred and parameters are correct
      expect(redirectUrl).not.toBeNull();
      const parsedUrl = new URL(redirectUrl!);
      const paymentId = parsedUrl.searchParams.get('paymentId');
      const orderId = parsedUrl.searchParams.get('orderId');
      expect(paymentId).not.toBeNull();
      expect(orderId).not.toBeNull();

      // Verify database state for this paymentId: status must be PENDING
      const dbPayment = await prisma.payment.findUnique({
        where: { id: paymentId! }
      });
      expect(dbPayment).not.toBeNull();
      expect(dbPayment!.status).toBe('PENDING');
      expect(dbPayment!.gateway).toBe('yookassa');
    });

    test('should generate PENDING payment in DB and redirect with paymentId when checking out via CryptoBot', async ({ page }) => {
      const email = 'e2e-sufficient@test.com';
      await setupAuthenticatedUser(email, 10000_00, page);
      await page.request.get('/api/debug?revalidate=catalog');
      await page.goto('/dashboard/new-order');

      // Fill form
      await fillUrlAndWait(page, 'https://t.me/durov');

      const categoryTab = page.getByRole('tab', { name: /E2E Telegram Subscribers/i }).first();
      await expect(categoryTab).toBeVisible();
      await categoryTab.click();

      await selectService(page, 'e2e-sub-service', 'E2E Subscribers Service');

      const qtyInput = page.locator('input[type="number"], input[placeholder*="Количество"]').first();
      await qtyInput.fill('10');

      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isEditable()) {
        await emailInput.fill(email);
      }

      // Agree to terms (default true, no checkbox rendered)

      // Intercept mock-payment redirect
      let redirectUrl: string | null = null;
      await page.route('**/api/dev/mock-payment*', async (route) => {
        redirectUrl = route.request().url();
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<html><body>Mock Gateway</body></html>'
        });
      });

      // Select CryptoBot gateway first (button with text "Крипто")
      const cryptoBtn = page.locator('button', { hasText: /Крипто/i }).first();
      await expect(cryptoBtn).toBeVisible();
      await cryptoBtn.click();

      // Click checkout
      const submitBtn = page.locator('button', { hasText: /Оплатить заказ/i }).first();
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      // Wait for the redirect route to trigger
      await page.waitForTimeout(2000);

      // Verify redirection occurred and parameters are correct
      expect(redirectUrl).not.toBeNull();
      const parsedUrl = new URL(redirectUrl!);
      const paymentId = parsedUrl.searchParams.get('paymentId');
      const orderId = parsedUrl.searchParams.get('orderId');
      expect(paymentId).not.toBeNull();
      expect(orderId).not.toBeNull();

      // Verify database state for this paymentId: status must be PENDING
      const dbPayment = await prisma.payment.findUnique({
        where: { id: paymentId! }
      });
      expect(dbPayment).not.toBeNull();
      expect(dbPayment!.status).toBe('PENDING');
      expect(dbPayment!.gateway).toBe('cryptobot');
    });

  });

});
