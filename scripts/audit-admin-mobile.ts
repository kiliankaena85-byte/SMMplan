import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { db } from '../src/lib/db';
import { SignJWT } from 'jose';
import { getEncodedKey } from '../src/lib/session-edge';

async function createOwnerJwt(userId: string, tenantId = 'smmplan') {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await db.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: 'unknown',
      ipAddress: '127.0.0.1',
    },
  });

  return new SignJWT({
    sessionId: session.id,
    userId,
    canResetPassword: false,
    role: 'OWNER',
    tenantId,
    contour: 'local',
    sessionVer: 1,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getEncodedKey());
}

async function auditMobileAdmin() {
  console.log('📱 [MOBILE AUDIT] Auditing Admin Panel on Mobile (390x844)...');
  const outDir = path.resolve(process.cwd(), 'artifacts/mobile-admin-audit');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let owner = await db.user.findFirst({ where: { role: 'OWNER' } });
  if (!owner) {
    owner = await db.user.findFirst({ where: { role: 'ADMIN' } });
  }
  if (!owner) {
    throw new Error('No owner or admin found in DB');
  }

  const token = await createOwnerJwt(owner.id);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  });

  await context.addCookies([
    {
      name: 'session_token',
      value: token,
      url: 'http://127.0.0.1:3000/',
    },
    {
      name: 'x_admin_tenant',
      value: 'smmplan',
      url: 'http://127.0.0.1:3000/',
    },
  ]);

  const page = await context.newPage();

  const routes = [
    { name: '01_dashboard', path: '/admin/dashboard' },
    { name: '02_orders', path: '/admin/orders' },
    { name: '03_catalog', path: '/admin/catalog' },
    { name: '04_catalog_categories', path: '/admin/catalog/categories' },
    { name: '05_catalog_networks', path: '/admin/catalog/networks' },
    { name: '06_catalog_import', path: '/admin/catalog/import' },
    { name: '07_catalog_quarantine', path: '/admin/catalog/quarantine' },
    { name: '08_tickets', path: '/admin/tickets' },
    { name: '09_providers', path: '/admin/providers' },
    { name: '10_finance', path: '/admin/finance' },
  ];

  const report: Array<{
    name: string;
    path: string;
    scrollWidth: number;
    innerWidth: number;
    hasOverflow: boolean;
    overflowPx: number;
  }> = [];

  for (const r of routes) {
    const url = `http://127.0.0.1:3000${r.path}`;
    console.log(`Inspecting ${r.name}: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);

      const metrics = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
        const innerWidth = window.innerWidth;
        return {
          scrollWidth,
          innerWidth,
          hasOverflow: scrollWidth > innerWidth,
          overflowPx: Math.max(0, scrollWidth - innerWidth),
        };
      });

      report.push({
        name: r.name,
        path: r.path,
        ...metrics,
      });

      await page.screenshot({
        path: path.join(outDir, `${r.name}.png`),
        fullPage: false,
      });
      console.log(`  -> Overflow: ${metrics.hasOverflow ? `YES (+${metrics.overflowPx}px)` : 'NONE (0px)'}`);
    } catch (e) {
      console.error(`  -> Failed on ${r.path}:`, e);
    }
  }

  await browser.close();

  fs.writeFileSync(
    path.join(outDir, 'mobile-audit-report.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );

  console.log('✅ Mobile audit run complete. Results saved to:', outDir);
}

auditMobileAdmin().catch(console.error);
