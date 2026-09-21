import { chromium } from 'playwright';
import { db } from '../src/lib/db';
import { SignJWT } from 'jose';
import { getEncodedKey } from '../src/lib/session-edge';

async function testAuth() {
  const owner = await db.user.findFirst({ where: { role: 'OWNER' } });
  console.log('Owner found:', owner?.email, owner?.id);
  if (!owner) return;

  const session = await db.session.create({
    data: {
      userId: owner.id,
      expiresAt: new Date(Date.now() + 86400000),
      userAgent: 'unknown',
      ipAddress: '127.0.0.1',
    },
  });

  const token = await new SignJWT({
    sessionId: session.id,
    userId: owner.id,
    canResetPassword: false,
    role: 'OWNER',
    tenantId: 'smmplan',
    contour: 'local',
    sessionVer: 1,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getEncodedKey());

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([
    { name: 'session_token', value: token, url: 'http://127.0.0.1:3005' },
    { name: 'x_admin_tenant', value: 'smmplan', url: 'http://127.0.0.1:3005' },
  ]);

  const page = await context.newPage();
  page.on('response', (res) => {
    if (res.status() >= 300 && res.status() < 400) {
      console.log(`Redirect ${res.status()} from ${res.url()} to ${res.headers()['location']}`);
    }
  });

  const res = await page.goto('http://127.0.0.1:3005/admin/dashboard', { waitUntil: 'networkidle' });
  console.log('Final URL:', page.url());
  console.log('Status code:', res?.status());
  console.log('Page Title:', await page.title());

  const nav = await page.$('nav[aria-label="Мобильная панель быстрого доступа"]');
  console.log('Bottom nav in DOM?:', Boolean(nav));

  await browser.close();
}

testAuth().catch(console.error);
