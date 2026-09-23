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

async function verifyDualViewport() {
  console.log('🧪 [DUAL VIEWPORT AUDIT] Verifying Desktop (1440x900) & Mobile (390x844)...');
  const outDir = path.resolve(process.cwd(), 'artifacts/dual-viewport-stage');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const owner = await db.user.findFirst({ where: { role: 'OWNER' } });
  if (!owner) throw new Error('Owner not found');

  const token = await createOwnerJwt(owner.id);
  const browser = await chromium.launch({ headless: true });

  const routes = [
    { name: 'dashboard', path: '/admin/dashboard' },
    { name: 'orders', path: '/admin/orders' },
    { name: 'catalog', path: '/admin/catalog' },
    { name: 'catalog_networks', path: '/admin/catalog/networks' },
    { name: 'catalog_categories', path: '/admin/catalog/categories' },
    { name: 'catalog_quarantine', path: '/admin/catalog/quarantine' },
    { name: 'tickets', path: '/admin/tickets' },
    { name: 'providers', path: '/admin/providers' },
  ];

  // 1. DESKTOP VIEWPORT (1440x900)
  console.log('🖥️ 1. Auditing Desktop Viewport (1440x900)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await desktopContext.addCookies([
    { name: 'session_token', value: token, domain: '127.0.0.1', path: '/' },
    { name: 'x_admin_tenant', value: 'smmplan', domain: '127.0.0.1', path: '/' },
  ]);
  const desktopPage = await desktopContext.newPage();

  for (const r of routes) {
    await desktopPage.goto(`http://127.0.0.1:3005${r.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await desktopPage.waitForTimeout(1000);
    const bottomNavExists = await desktopPage.evaluate(() => {
      const el = document.querySelector('nav[aria-label="Мобильная панель быстрого доступа"]');
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    console.log(`  Desktop ${r.name}: BottomNav visible? ${bottomNavExists ? 'FAIL (should be hidden on desktop)' : 'PASSED (hidden)'}`);
    await desktopPage.screenshot({ path: path.join(outDir, `desktop_${r.name}.png`) });
  }

  // 2. MOBILE VIEWPORT (390x844)
  console.log('📱 2. Auditing Mobile Viewport (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await mobileContext.addCookies([
    { name: 'session_token', value: token, domain: '127.0.0.1', path: '/' },
    { name: 'x_admin_tenant', value: 'smmplan', domain: '127.0.0.1', path: '/' },
  ]);
  const mobilePage = await mobileContext.newPage();

  for (const r of routes) {
    await mobilePage.goto(`http://127.0.0.1:3005${r.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await mobilePage.waitForTimeout(1000);
    const mobileMetrics = await mobilePage.evaluate(() => {
      const bottomNav = document.querySelector('nav[aria-label="Мобильная панель быстрого доступа"]');
      const bottomNavVisible = bottomNav ? window.getComputedStyle(bottomNav).display !== 'none' : false;
      return {
        bottomNavVisible,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });
    console.log(`  Mobile ${r.name}: BottomNav visible? ${mobileMetrics.bottomNavVisible ? 'PASSED (visible)' : 'FAIL'}, Global overflow: ${mobileMetrics.scrollWidth <= mobileMetrics.innerWidth ? 'PASSED (0px)' : `FAIL (+${mobileMetrics.scrollWidth - mobileMetrics.innerWidth}px)`}`);
    await mobilePage.screenshot({ path: path.join(outDir, `mobile_${r.name}.png`) });
  }

  await browser.close();
  console.log('✅ Dual-viewport audit completed! Artifacts saved to:', outDir);
}

verifyDualViewport().catch(console.error);
