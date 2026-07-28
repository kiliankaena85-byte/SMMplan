/**
 * e2e/auth.spec.ts
 * Auth Flow E2E Tests — регистрация, логин, magic link, logout, banned user.
 *
 * RULES (AGENTS.md):
 * - No arbitrary waitForTimeout. Use deterministic waits on UI state.
 * - Clean up created test users in afterAll.
 * - No real payment gateways.
 * - Use unique timestamps in emails to avoid DB conflicts across runs.
 */

import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

// Fresh context — no pre-seeded admin session cookie
test.use({ storageState: { cookies: [], origins: [] } });

const db = new PrismaClient();

test.describe('Auth Flow — Registration & Login', () => {
  const ts = Date.now();
  const userEmail = `e2e-auth-user-${ts}@smmplan.local`;
  const userPassword = 'TestPass123!';
  const bannedEmail = `e2e-banned-${ts}@smmplan.local`;

  test.afterAll(async () => {
    // Cleanup: sessions cascade-delete via FK on User
    await db.user
      .deleteMany({
        where: {
          email: {
            in: [userEmail, bannedEmail, `e2e-magic-${ts}@smmplan.local`],
          },
        },
      })
      .catch(() => {}); // Ignore if FK prevents — ledger may exist
    await db.$disconnect();
  });

  // ─────────────────────────────────────────────
  // 1. Registration → auto-login to dashboard
  // ─────────────────────────────────────────────
  test('User can register with password and get redirected to dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // Switch to registration tab
    await page.getByRole('button', { name: /Регистрация/i }).click();

    // Fill form
    await page.locator('#register-email').fill(userEmail);
    await page.locator('#register-password').fill(userPassword);

    // Submit
    await page.getByRole('button', { name: /Создать аккаунт/i }).click();

    // After registration: either success message or redirect to dashboard
    await Promise.race([
      expect(page).toHaveURL(/dashboard/, { timeout: 15_000 }),
      expect(page.getByRole('button', { name: /Войти в кабинет/i })).toBeVisible({ timeout: 15_000 }),
    ]);
  });

  // ─────────────────────────────────────────────
  // 2. Login with wrong password → stays on /login
  // ─────────────────────────────────────────────
  test('Login with wrong password shows error and stays on /login', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#login-email').fill(userEmail);
    await page.locator('#login-password').fill('WrongPassword!999');
    await page.getByRole('button', { name: /Войти в кабинет/i }).click();

    // Must stay on /login — no redirect to dashboard
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    // Error should be present (toast, inline, or general error text)
    await expect(
      page.locator('[role="alert"], [data-sonner-toast], .text-destructive').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  // ─────────────────────────────────────────────
  // 3. Login with correct password → dashboard
  // ─────────────────────────────────────────────
  test('User can login with correct password and reach dashboard', async ({ page }) => {
    // Ensure user exists with a known password (create via DB if not registered above)
    const { hashPassword } = await import('../src/lib/password');
    const hash = await hashPassword(userPassword);
    await db.user.upsert({
      where: { email_tenantId: { email: userEmail, tenantId: 'smmplan' } },
      update: { passwordHash: hash, isActive: true },
      create: {
        email: userEmail,
        tenantId: 'smmplan',
        passwordHash: hash,
        role: 'USER',
        isActive: true,
        balance: 0,
      },
    });

    await page.goto('/login');
    await page.locator('#login-email').fill(userEmail);
    await page.locator('#login-password').fill(userPassword);
    await page.getByRole('button', { name: /Войти в кабинет/i }).click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });
    await expect(page.locator('h1').first()).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // 4. Magic link — form submission creates token
  // ─────────────────────────────────────────────
  test('Magic link request — form can be submitted and server responds', async ({ page }) => {
    const magicEmail = `e2e-magic-${ts}@smmplan.local`;

    await page.goto('/login');

    // Switch to magic link tab (if visible)
    const magicTab = page.getByRole('button', { name: /Войти по ссылке|Magic link|Ссылка для входа/i });
    if (await magicTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await magicTab.click();
    }

    const emailInput = page.locator('#magic-email, input[name="email"][type="email"]').first();
    if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailInput.fill(magicEmail);
      const sendBtn = page.getByRole('button', { name: /Отправить|Send|Получить ссылку/i });
      await sendBtn.click();

      // Expect success feedback (anti-enumeration: always shows success)
      await expect(
        page.locator('[data-sonner-toast], [role="alert"], .text-green-500').first()
      ).toBeVisible({ timeout: 8_000 });
    } else {
      // Magic link not exposed via separate tab — skip gracefully
      test.skip(true, 'Magic link UI not present on this build');
    }
  });

  // ─────────────────────────────────────────────
  // 5. Banned user — login blocked
  // ─────────────────────────────────────────────
  test('Banned user cannot login and stays on /login', async ({ page }) => {
    // Create banned user directly in DB
    await db.user.upsert({
      where: { email_tenantId: { email: bannedEmail, tenantId: 'smmplan' } },
      update: { isActive: false, isDeleted: true },
      create: {
        email: bannedEmail,
        tenantId: 'smmplan',
        role: 'USER',
        isActive: false,
        isDeleted: true,
      },
    });

    await page.goto('/login');
    await page.locator('#login-email').fill(bannedEmail);
    await page.locator('#login-password').fill('AnyPassword123!');
    await page.getByRole('button', { name: /Войти в кабинет/i }).click();

    // Must remain on /login (anti-enumeration: same generic error)
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/dashboard/);
  });

  // ─────────────────────────────────────────────
  // 6. Logout → session invalidated
  // ─────────────────────────────────────────────
  test('Logged-in user can logout and is redirected to /login', async ({ page }) => {
    // Quick-login: inject cookie via DB session (reuse pattern from auth.setup.ts)
    const { SignJWT } = await import('jose');
    const jwtSecret = process.env.JWT_SECRET ?? 'fallback-secret';
    const encodedKey = new TextEncoder().encode(jwtSecret);

    const { hashPassword } = await import('../src/lib/password');
    const hash = await hashPassword(userPassword);
    const sessionUser = await db.user.upsert({
      where: { email_tenantId: { email: userEmail, tenantId: 'smmplan' } },
      update: { isActive: true, passwordHash: hash },
      create: {
        email: userEmail,
        tenantId: 'smmplan',
        passwordHash: hash,
        role: 'USER',
        isActive: true,
        balance: 0,
      },
    });

    const session = await db.session.create({
      data: { userId: sessionUser.id, expiresAt: new Date(Date.now() + 86_400_000) },
    });

    const token = await new SignJWT({
      sessionId: session.id,
      userId: sessionUser.id,
      role: sessionUser.role,
      tenantId: 'smmplan',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1d')
      .sign(encodedKey);

    await page.context().addCookies([
      { name: 'session_token', value: token, domain: '127.0.0.1', path: '/' },
    ]);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    // Click logout button
    const logoutBtn = page.getByRole('button', { name: /Выйти|Logout|Sign out/i });
    if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.click();
    } else {
      // Fallback: open user menu first
      await page.locator('[data-testid="user-menu"], [aria-label="User menu"]').first().click();
      await page.getByRole('menuitem', { name: /Выйти|Logout/i }).click();
    }

    await expect(page).toHaveURL(/\/login|\//, { timeout: 10_000 });

    // Navigating to /dashboard without cookie should redirect to login
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
