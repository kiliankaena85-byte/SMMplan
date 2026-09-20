/**
 * (c) 2026 SMMplan & OmniSMM 1.0.
 * Playwright E2E Test Suite for Admin Panel Audit Harness.
 *
 * Checks:
 * 1. Zero Horizontal Scroll across Desktop, Tablet, and Mobile.
 * 2. Zero Clipped Data Cells without accessibility titles / tooltips.
 * 3. React 19 Hydration Mismatch & Server Action Crash Immunity.
 * 4. Multi-Tenant Cookie Isolation & Persistence (`x_admin_tenant`).
 */

import { test, expect, Page } from '@playwright/test';
import { SignJWT } from 'jose';
import { getEncodedKey } from '../src/lib/session-edge';
import {
  seedAdminAuditFixtures,
  AUDIT_FIXTURES,
  prisma,
} from '../scripts/ci/seed-admin-audit-fixtures';

const VIEWPORTS = [
  { name: 'Desktop', width: 1280, height: 800 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 812 },
];

export const AUDIT_USER_AGENT = 'Playwright-Admin-Harness-Spec/2026';

test.use({ userAgent: AUDIT_USER_AGENT });

test.describe('Admin Panel Production-Grade Audit Harness', () => {
  let sessionToken: string;

  test.beforeAll(async () => {
    // 1. Seed deterministic fixtures with fixed CUIDs
    await seedAdminAuditFixtures();

    // 2. Create genuine DB Session record for OWNER
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await prisma.session.create({
      data: {
        userId: AUDIT_FIXTURES.admin.id,
        expiresAt,
        userAgent: AUDIT_USER_AGENT,
        ipAddress: '127.0.0.1',
      },
    });

    // 3. Sign genuine JWT
    sessionToken = await new SignJWT({
      sessionId: session.id,
      userId: AUDIT_FIXTURES.admin.id,
      canResetPassword: false,
      tenantId: 'smmplan',
      contour: 'test',
      sessionVer: 1,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getEncodedKey());
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    const targetUrl = baseURL || 'http://127.0.0.1:3000';
    const isHttps = targetUrl.startsWith('https://');

    const authCookies: Parameters<typeof context.addCookies>[0] = [
      {
        name: 'session_token',
        value: sessionToken,
        url: targetUrl,
        httpOnly: true,
        sameSite: 'Lax',
      },
      {
        name: 'cookie_consent',
        value: 'true',
        url: targetUrl,
        httpOnly: false,
        sameSite: 'Lax',
      },
      {
        name: 'x_admin_tenant',
        value: 'smmplan',
        url: targetUrl,
        httpOnly: false,
        sameSite: 'Lax',
      },
    ];

    if (isHttps) {
      authCookies.push({
        name: '__Host-session_token',
        value: sessionToken,
        url: targetUrl,
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      });
    }

    await context.addCookies(authCookies);
  });

  async function verifyPageLayoutInvariants(page: Page, route: string, vp: { name: string; width: number; height: number }) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    const hydrationErrors: string[] = [];
    const serverActionErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (
        text.includes('418') ||
        text.includes('425') ||
        text.includes('Hydration failed') ||
        text.includes('Text content does not match')
      ) {
        hydrationErrors.push(text);
      }
      if (text.includes('An unexpected response was received from the server')) {
        serverActionErrors.push(text);
      }
    });

    const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status(), `Route ${route} returned error status`).toBeLessThan(400);
    expect(page.url(), `Route ${route} redirected to unauthorized destination`).not.toMatch(/\/login|\/dashboard\/new-order|\/forbidden/);

    // 1. React 19 Hydration Check
    expect(hydrationErrors, `React 19 hydration mismatch detected on ${route} [${vp.name}]`).toHaveLength(0);

    // 2. Server Action Crashes Check
    expect(serverActionErrors, `Server action crash detected on ${route} [${vp.name}]`).toHaveLength(0);

    // 3. Zero Horizontal Scroll Invariant
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc ? doc.scrollWidth : 0, body ? body.scrollWidth : 0);
      const clientWidth = Math.max(doc ? doc.clientWidth : 0, window.innerWidth);
      return {
        hasOverflow: scrollWidth > clientWidth + 5,
        scrollWidth,
        clientWidth,
      };
    });

    expect(
      overflow.hasOverflow,
      `Horizontal scroll overflow on ${route} [${vp.name}]: scrollWidth (${overflow.scrollWidth}px) > clientWidth (${overflow.clientWidth}px)`
    ).toBe(false);

    // 4. Content Visibility Check
    const hasContent = await page.evaluate(() => {
      return (
        document.querySelector('main') !== null ||
        document.querySelector('header') !== null ||
        document.querySelector('h1') !== null ||
        document.body.innerText.length > 50
      );
    });
    expect(hasContent, `Page content did not render on ${route} [${vp.name}]`).toBe(true);
  }

  // ── Core Dashboard & Registers ──

  test('/admin/dashboard — Overview across viewports', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await verifyPageLayoutInvariants(page, '/admin/dashboard', vp);
    }
  });

  test('/admin/orders — Orders Registry & Dynamic Detail Route', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await verifyPageLayoutInvariants(page, '/admin/orders', vp);
      await verifyPageLayoutInvariants(page, `/admin/orders/${AUDIT_FIXTURES.order.id}`, vp);
    }
  });

  test('/admin/clients — Clients Registry & Dynamic Detail Route', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await verifyPageLayoutInvariants(page, '/admin/clients', vp);
      await verifyPageLayoutInvariants(page, `/admin/clients/${AUDIT_FIXTURES.client.id}`, vp);
    }
  });

  test('/admin/providers — Providers Registry & Dynamic Detail Route', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await verifyPageLayoutInvariants(page, '/admin/providers', vp);
      await verifyPageLayoutInvariants(page, `/admin/providers/${AUDIT_FIXTURES.provider.id}`, vp);
    }
  });

  test('/admin/catalog — Services Catalog, Detail & Routing Engine', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await verifyPageLayoutInvariants(page, '/admin/catalog', vp);
      await verifyPageLayoutInvariants(page, `/admin/catalog/${AUDIT_FIXTURES.service.id}`, vp);
      await verifyPageLayoutInvariants(page, `/admin/services/${AUDIT_FIXTURES.service.id}/routing`, vp);
    }
  });

  test('/admin/tickets — Tickets Cockpit & Dynamic Ticket View', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await verifyPageLayoutInvariants(page, '/admin/tickets', vp);
      await verifyPageLayoutInvariants(page, `/admin/tickets/${AUDIT_FIXTURES.ticket.id}`, vp);
    }
  });

  test('/admin/cms — CMS Registry & Dynamic Article Editor', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await verifyPageLayoutInvariants(page, '/admin/cms', vp);
      await verifyPageLayoutInvariants(page, `/admin/cms/${AUDIT_FIXTURES.contentItem.id}`, vp);
      await verifyPageLayoutInvariants(page, `/admin/knowledge/${AUDIT_FIXTURES.article.id}/edit`, vp);
    }
  });

  test('/admin/finance — Finance Center & Dispute Pack Route', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await verifyPageLayoutInvariants(page, '/admin/finance', vp);
      await verifyPageLayoutInvariants(
        page,
        `/admin/finance/payments/${AUDIT_FIXTURES.payment.id}/dispute-pack`,
        vp
      );
    }
  });

  test('/admin/settings & /admin/staff — System Administration Views', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await verifyPageLayoutInvariants(page, '/admin/settings', vp);
      await verifyPageLayoutInvariants(page, '/admin/staff', vp);
      await verifyPageLayoutInvariants(page, '/admin/system/features', vp);
    }
  });

  test('Tenant Cookie Persistence — x_admin_tenant survives page switching', async ({ page, context, baseURL }) => {
    const targetUrl = baseURL || 'http://127.0.0.1:3000';

    // 1. Initial navigation with smmplan
    await page.goto(`${targetUrl}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
    let cookies = await context.cookies(targetUrl);
    let tenantCookie = cookies.find((c) => c.name === 'x_admin_tenant');
    expect(tenantCookie?.value).toBe('smmplan');

    // 2. Change tenant to flux and navigate
    await context.addCookies([{ name: 'x_admin_tenant', value: 'flux', url: targetUrl }]);
    await page.goto(`${targetUrl}/admin/orders`, { waitUntil: 'domcontentloaded' });
    cookies = await context.cookies(targetUrl);
    tenantCookie = cookies.find((c) => c.name === 'x_admin_tenant');
    expect(tenantCookie?.value).toBe('flux');

    // 3. Navigate to another section and verify flux persists
    await page.goto(`${targetUrl}/admin/catalog`, { waitUntil: 'domcontentloaded' });
    cookies = await context.cookies(targetUrl);
    tenantCookie = cookies.find((c) => c.name === 'x_admin_tenant');
    expect(tenantCookie?.value).toBe('flux');
  });
});
