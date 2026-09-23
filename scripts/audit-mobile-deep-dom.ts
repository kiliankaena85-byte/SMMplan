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

async function runDeepMobileAudit() {
  console.log('🔍 [DEEP MOBILE AUDIT] Scanning touch targets, inputs, tables, and internal overflow...');
  const outDir = path.resolve(process.cwd(), 'artifacts/mobile-deep-audit');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const owner = await db.user.findFirst({ where: { role: 'OWNER' } });
  if (!owner) throw new Error('Owner not found');

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
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Orders', path: '/admin/orders' },
    { name: 'Catalog', path: '/admin/catalog' },
    { name: 'Categories', path: '/admin/catalog/categories' },
    { name: 'Networks', path: '/admin/catalog/networks' },
    { name: 'Import', path: '/admin/catalog/import' },
    { name: 'Quarantine', path: '/admin/catalog/quarantine' },
    { name: 'Tickets', path: '/admin/tickets' },
    { name: 'Providers', path: '/admin/providers' },
    { name: 'Finance', path: '/admin/finance' },
    { name: 'Settings', path: '/admin/settings' },
  ];

  const results: Record<string, any> = {};

  for (const r of routes) {
    const url = `http://127.0.0.1:3000${r.path}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1000);

      const pageAudit = await page.evaluate(() => {
        // 1. Elements with internal horizontal scroll (overflow-x)
        const scrollableElements: Array<{ tag: string; className: string; scrollWidth: number; clientWidth: number }> = [];
        document.querySelectorAll('*').forEach((el) => {
          if (el.scrollWidth > el.clientWidth + 5 && el.clientWidth > 50) {
            const style = window.getComputedStyle(el);
            if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflowX === 'hidden') {
              scrollableElements.push({
                tag: el.tagName.toLowerCase(),
                className: (el.className || '').toString().slice(0, 100),
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
              });
            }
          }
        });

        // 2. Touch targets < 44x44
        const tinyTouchTargets: Array<{ tag: string; text: string; width: number; height: number; class: string }> = [];
        const interactives = document.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"], [role="button"]');
        interactives.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < 40 || rect.height < 40) {
              tinyTouchTargets.push({
                tag: el.tagName.toLowerCase(),
                text: (el.textContent || '').trim().slice(0, 30),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                class: (el.className || '').toString().slice(0, 60),
              });
            }
          }
        });

        // 3. Inputs causing iOS Auto-Zoom (fontSize < 16px)
        const autoZoomInputs: Array<{ name: string; placeholder: string; fontSize: string }> = [];
        const inputs = document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), select, textarea');
        inputs.forEach((el) => {
          const style = window.getComputedStyle(el);
          const fs = parseFloat(style.fontSize);
          if (fs < 16) {
            autoZoomInputs.push({
              name: (el.getAttribute('name') || el.getAttribute('id') || 'unnamed'),
              placeholder: el.getAttribute('placeholder') || '',
              fontSize: style.fontSize,
            });
          }
        });

        // 4. Tables with classic table layout (how many tables exist)
        const tables = document.querySelectorAll('table').length;

        // 5. Header status
        const header = document.querySelector('header');
        const headerRect = header ? header.getBoundingClientRect() : null;

        return {
          scrollableElementsCount: scrollableElements.length,
          scrollableSample: scrollableElements.slice(0, 5),
          tinyTouchTargetsCount: tinyTouchTargets.length,
          tinyTouchTargetsSample: tinyTouchTargets.slice(0, 10),
          autoZoomInputsCount: autoZoomInputs.length,
          autoZoomInputsSample: autoZoomInputs.slice(0, 8),
          tablesCount: tables,
          headerHeight: headerRect ? Math.round(headerRect.height) : 0,
        };
      });

      results[r.name] = pageAudit;
    } catch (e) {
      results[r.name] = { error: String(e) };
    }
  }

  await browser.close();

  fs.writeFileSync(
    path.join(outDir, 'deep-audit-summary.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );

  console.log('📊 [DEEP AUDIT COMPLETED]');
  console.log(JSON.stringify(results, null, 2));
}

runDeepMobileAudit().catch(console.error);
