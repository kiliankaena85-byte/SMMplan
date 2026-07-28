/**
 * e2e/fixtures.ts
 * Shared E2E Test Helpers & Data Seeding
 */

import { test as base, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { WalletOps } from '../src/services/financial/wallet-ops.service';
import { SignJWT } from 'jose';

export const db = new PrismaClient();

export const TEST_USER = {
  email: 'e2e-user@test.local',
  password: 'E2ePass123!',
};

export const TEST_ADMIN = {
  email: 'e2e-admin@test.local',
  password: 'E2eAdmin123!',
};

/**
 * Creates or resets a regular test user with specified RUB balance via WalletOps
 */
export async function seedTestUser(balanceRub: number = 10_000): Promise<{ id: string; email: string }> {
  const { hashPassword } = await import('../src/lib/password');
  const hash = await hashPassword(TEST_USER.password);

  const user = await db.user.upsert({
    where: { email_tenantId: { email: TEST_USER.email, tenantId: 'smmplan' } },
    update: { passwordHash: hash, isActive: true, role: 'USER' },
    create: {
      email: TEST_USER.email,
      tenantId: 'smmplan',
      passwordHash: hash,
      role: 'USER',
      isActive: true,
      balance: 0,
    },
  });

  // Ensure balance via WalletOps
  const currentBalanceRub = user.balance / 100;
  const deltaRub = balanceRub - currentBalanceRub;
  if (Math.abs(deltaRub) > 0.01) {
    if (deltaRub > 0) {
      await WalletOps.credit({
        userId: user.id,
        amountRub: deltaRub,
        type: 'DEPOSIT',
        description: 'E2E test seed deposit',
        idempotencyKey: `e2e-seed-${user.id}-${Date.now()}`,
      });
    } else {
      await WalletOps.debit({
        userId: user.id,
        amountRub: Math.abs(deltaRub),
        type: 'ORDER_PAYMENT',
        description: 'E2E test seed balance adjust',
        idempotencyKey: `e2e-seed-debit-${user.id}-${Date.now()}`,
      });
    }
  }

  return { id: user.id, email: user.email };
}

/**
 * Creates or resets an OWNER/ADMIN user with EmployeeResponsibilityConsent
 */
export async function seedTestAdmin(): Promise<{ id: string; email: string }> {
  const { hashPassword } = await import('../src/lib/auth/password');
  const hash = await hashPassword(TEST_ADMIN.password);

  const admin = await db.user.upsert({
    where: { email_tenantId: { email: TEST_ADMIN.email, tenantId: 'smmplan' } },
    update: { passwordHash: hash, isActive: true, role: 'OWNER' },
    create: {
      email: TEST_ADMIN.email,
      tenantId: 'smmplan',
      passwordHash: hash,
      role: 'OWNER',
      isActive: true,
      balance: 0,
    },
  });

  // Ensure EmployeeResponsibilityConsent
  await db.employeeResponsibilityConsent.upsert({
    where: { userId: admin.id },
    update: { isAccepted: true },
    create: {
      userId: admin.id,
      isAccepted: true,
      ipAddress: '127.0.0.1',
      userAgent: 'Playwright E2E',
    },
  });

  return { id: admin.id, email: admin.email };
}

/**
 * Performs real UI login via /login page
 */
export async function login(page: Page, user: { email: string; password?: string }): Promise<void> {
  const pass = user.password || TEST_USER.password;
  await page.goto('/login');
  await page.locator('#login-email').fill(user.email);
  await page.locator('#login-password').fill(pass);
  await page.getByRole('button', { name: /Войти в кабинет/i }).click();
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15_000 });
}

/**
 * Mints JWT session token directly for headless fast auth
 */
export async function createAuthenticatedSession(userId: string, role: string = 'USER'): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET ?? 'fallback-secret';
  const encodedKey = new TextEncoder().encode(jwtSecret);
  const session = await db.session.create({
    data: { userId, expiresAt: new Date(Date.now() + 86_400_000) },
  });
  return new SignJWT({ sessionId: session.id, userId, role, tenantId: 'smmplan' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(encodedKey);
}

/**
 * Removes test users safely via email matching
 */
export async function cleanupTestUsers(): Promise<void> {
  await db.user.deleteMany({
    where: {
      email: {
        in: [TEST_USER.email, TEST_ADMIN.email],
      },
    },
  }).catch(() => {});
}
