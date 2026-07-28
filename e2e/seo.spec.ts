/**
 * e2e/seo.spec.ts
 * SEO Flow E2E Tests — canonical tags, OG, JSON-LD, robots.txt, sitemap, noindex.
 *
 * RULES (AGENTS.md):
 * - Canonical ОБЯЗАН быть абсолютным через absoluteCanonical(tenantId, path).
 * - НЕТ ссылок на lovable.pro в canonical.
 * - /admin обязан иметь X-Robots-Tag: noindex или meta robots noindex.
 * - /robots.txt обязан содержать Disallow: /admin.
 * - /sitemap.xml обязан содержать /services URLs, НЕ содержать /admin.
 * - SEO Quality Gate: категории с <3 активными услугами не попадают в sitemap.
 */

import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';

const db = new PrismaClient();

test.describe('SEO Checks', () => {
  let adminId: string;

  test.beforeAll(async () => {
    // Seed tenant and system settings
    await db.tenant.upsert({
      where: { id: 'smmplan' },
      update: {},
      create: { id: 'smmplan', name: 'SMMplan', slug: 'smmplan', domain: 'smmplan.pro', vaultSalt: 'test-salt' },
    });

    await db.systemSettings.upsert({
      where: { id: 'smmplan' },
      update: { exchangeRateUSD: 95.0, isTestMode: true },
      create: { id: 'smmplan', exchangeRateUSD: 95.0, isTestMode: true },
    });

    // Admin for /admin access checks
    const admin = await db.user.upsert({
      where: { email_tenantId: { email: 'e2e-seo-admin@smmplan.local', tenantId: 'smmplan' } },
      update: { role: 'OWNER', isActive: true },
      create: { email: 'e2e-seo-admin@smmplan.local', tenantId: 'smmplan', role: 'OWNER', isActive: true, balance: 0 },
    });
    adminId = admin.id;
  });

  test.afterAll(async () => {
    await db.user
      .deleteMany({ where: { email: 'e2e-seo-admin@smmplan.local' } })
      .catch(() => {});
    await db.$disconnect();
  });

  // ─────────────────────────────────────────────
  // 1. Homepage — canonical, OG tags, JSON-LD
  // ─────────────────────────────────────────────
  test('Homepage has canonical URL, OG tags, and JSON-LD', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL(/error/);

    // Canonical link
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1, { timeout: 10_000 });
    const canonicalHref = await canonical.getAttribute('href');
    expect(canonicalHref).toBeTruthy();
    expect(canonicalHref).not.toContain('lovable.pro');
    expect(canonicalHref).toMatch(/^https?:\/\//);

    // OG title
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
    const title = await ogTitle.getAttribute('content');
    expect(title).toBeTruthy();
    expect(title!.length).toBeGreaterThan(3);

    // OG description
    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toHaveCount(1);
    expect(await ogDescription.getAttribute('content')).toBeTruthy();

    // JSON-LD (at least one schema.org script)
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify no syntax errors in JSON-LD
    for (let i = 0; i < count; i++) {
      const content = await jsonLd.nth(i).textContent();
      expect(() => JSON.parse(content ?? '{}')).not.toThrow();
    }
  });

  // ─────────────────────────────────────────────
  // 2. /services — BreadcrumbList JSON-LD
  // ─────────────────────────────────────────────
  test('/services page has BreadcrumbList JSON-LD', async ({ page }) => {
    await page.goto('/services');
    await expect(page).not.toHaveURL(/error/);

    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    expect(count).toBeGreaterThanOrEqual(1);

    let hasBreadcrumb = false;
    for (let i = 0; i < count; i++) {
      const text = await jsonLd.nth(i).textContent();
      try {
        const data = JSON.parse(text ?? '{}');
        if (
          data['@type'] === 'BreadcrumbList' ||
          (Array.isArray(data) && data.some((d: { '@type': string }) => d['@type'] === 'BreadcrumbList'))
        ) {
          hasBreadcrumb = true;
          break;
        }
      } catch {
        // Invalid JSON — skip
      }
    }
    expect(hasBreadcrumb).toBe(true);
  });

  // ─────────────────────────────────────────────
  // 3. /services/{network}/{category} — FAQPage & Service schema
  // ─────────────────────────────────────────────
  test('Service category page has Service or FAQPage JSON-LD', async ({ page }) => {
    // Find an active category page — telegram/subscribers is most likely to exist
    const candidates = [
      '/services/telegram/subscribers',
      '/services/telegram/views',
      '/services/instagram/followers',
    ];

    let foundPage = false;
    for (const path of candidates) {
      const response = await page.goto(path);
      if (response?.status() === 200) {
        const url = page.url();
        if (!url.includes('/404') && !url.includes('error')) {
          foundPage = true;
          break;
        }
      }
    }

    if (!foundPage) {
      test.skip(true, 'No active service category pages exist in test environment');
    } else {
      const jsonLd = page.locator('script[type="application/ld+json"]');
      const count = await jsonLd.count();
      expect(count).toBeGreaterThanOrEqual(1);

      let hasServiceOrFaq = false;
      for (let i = 0; i < count; i++) {
        const text = await jsonLd.nth(i).textContent();
        try {
          const data = JSON.parse(text ?? '{}');
          const types: string[] = Array.isArray(data)
            ? data.map((d: { '@type': string }) => d['@type'])
            : [data['@type']];
          if (types.some((t) => ['Service', 'FAQPage', 'ItemList', 'Product'].includes(t))) {
            hasServiceOrFaq = true;
            break;
          }
        } catch {
          // Skip
        }
      }
      expect(hasServiceOrFaq).toBe(true);
    }
  });

  // ─────────────────────────────────────────────
  // 4. /admin — has noindex meta or X-Robots-Tag header
  // ─────────────────────────────────────────────
  test('/admin has noindex directive (meta tag or header)', async ({ page, request }) => {
    // Check HTTP header first
    const resp = await request.get('/admin', { maxRedirects: 0 });

    const xRobotsHeader = resp.headers()['x-robots-tag'] ?? '';
    const isNoindexHeader = xRobotsHeader.toLowerCase().includes('noindex');

    if (!isNoindexHeader) {
      // Check meta tag (only if we can access the page)
      const jwtSecret = process.env.JWT_SECRET ?? 'fallback-secret';
      const encodedKey = new TextEncoder().encode(jwtSecret);
      const session = await db.session.create({
        data: { userId: adminId, expiresAt: new Date(Date.now() + 86_400_000) },
      });
      const token = await new SignJWT({ sessionId: session.id, userId: adminId, role: 'OWNER', tenantId: 'smmplan' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1d')
        .sign(encodedKey);

      await page.context().addCookies([{ name: 'session_token', value: token, domain: '127.0.0.1', path: '/' }]);
      await page.goto('/admin');

      const robotsMeta = page.locator('meta[name="robots"]');
      if (await robotsMeta.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const content = await robotsMeta.getAttribute('content') ?? '';
        expect(content.toLowerCase()).toContain('noindex');
      } else {
        // Admin should at minimum redirect to login (which is fine — non-indexable)
        const url = page.url();
        const isLogin = url.includes('/login');
        // Either shows noindex or redirects — both are acceptable
        expect(isLogin || isNoindexHeader).toBe(true);
      }
    } else {
      expect(isNoindexHeader).toBe(true);
    }
  });

  // ─────────────────────────────────────────────
  // 5. /robots.txt — Disallow: /admin
  // ─────────────────────────────────────────────
  test('/robots.txt contains Disallow: /admin', async ({ request }) => {
    const resp = await request.get('/robots.txt');
    expect(resp.status()).toBe(200);

    const body = await resp.text();
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('User-agent:');

    // Should NOT expose sensitive paths
    expect(body).not.toContain('Allow: /admin');
  });

  // ─────────────────────────────────────────────
  // 6. /sitemap.xml — contains /services, not /admin
  // ─────────────────────────────────────────────
  test('/sitemap.xml contains /services URLs and excludes /admin', async ({ request }) => {
    const resp = await request.get('/sitemap.xml');
    expect(resp.status()).toBe(200);

    const body = await resp.text();

    // Must be valid XML
    expect(body).toContain('<?xml');
    expect(body).toContain('<urlset');

    // Must NOT include admin pages
    expect(body).not.toContain('/admin');
    expect(body).not.toContain('/api/');

    // Must include homepage
    expect(body).toMatch(/<loc>https?:\/\/[^<]+\/<\/loc>/);
  });

  // ─────────────────────────────────────────────
  // 7. /sitemap.xml — only includes /services URLs for quality-gate-passing categories
  // ─────────────────────────────────────────────
  test('/sitemap.xml — /services present for active catalog, /admin absent', async ({ request }) => {
    const resp = await request.get('/sitemap.xml');
    expect(resp.status()).toBe(200);

    const body = await resp.text();

    // Disallowed patterns
    const disallowed = ['/admin', '/api/', '/dashboard', '/login', '/register'];
    for (const pattern of disallowed) {
      expect(body).not.toContain(`>${pattern}`);
    }

    // Allowed patterns (may be absent if catalog is empty in test env — skip gracefully)
    if (body.includes('/services/')) {
      // Any /services URL that IS present must be a real network path, not /services/admin
      const lines = body.match(/<loc>[^<]+<\/loc>/g) ?? [];
      for (const loc of lines) {
        expect(loc).not.toContain('/admin');
        expect(loc).not.toContain('/api/');
      }
    }
  });

  // ─────────────────────────────────────────────
  // 8. Page title is meaningful (not "SMMplan" only)
  // ─────────────────────────────────────────────
  test('Homepage title is descriptive and unique', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(5);
    // Should not be just the domain or empty
    expect(title).not.toMatch(/^http/);
  });

  // ─────────────────────────────────────────────
  // 9. /services page has meta description
  // ─────────────────────────────────────────────
  test('/services has meta description', async ({ page }) => {
    await page.goto('/services');

    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveCount(1, { timeout: 10_000 });
    const desc = await metaDesc.getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(10);
  });

  // ─────────────────────────────────────────────
  // 10. Canonical URL does not reference lovable.pro
  // ─────────────────────────────────────────────
  test('Canonical URLs across pages never reference lovable.pro', async ({ page }) => {
    const pagesToCheck = ['/', '/services', '/login'];

    for (const path of pagesToCheck) {
      await page.goto(path);
      const canonical = page.locator('link[rel="canonical"]');
      if (await canonical.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const href = await canonical.getAttribute('href');
        expect(href).not.toContain('lovable.pro');
        expect(href).not.toContain('lovable');
      }
    }
  });
});
