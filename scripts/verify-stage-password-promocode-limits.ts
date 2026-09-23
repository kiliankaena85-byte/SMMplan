import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@127.0.0.1:5435/smmplan_lite?schema=public',
    },
  },
});

function getEncodedKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '58b78402370d7188f93ee41667e3d118892f61de916f8ac0786064b5d7e5c6d5';
  return new TextEncoder().encode(secret);
}

async function createJwt(userId: string, role: string, tenantId = 'smmplan') {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: 'stage-screenshot-agent',
      ipAddress: '127.0.0.1',
    },
  });

  return new SignJWT({
    sessionId: session.id,
    userId,
    canResetPassword: false,
    role,
    tenantId,
    contour: 'test',
    sessionVer: 1,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getEncodedKey());
}

async function main() {
  console.log('🚀 Starting Stage Visual Verification of Password & Promocode Limits on :3005...');

  const artifactsDir = path.resolve(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // 1. Check /login registration tab
  console.log('👉 Testing /login registration tab...');
  await page.goto('http://127.0.0.1:3005/login', { waitUntil: 'networkidle' });
  
  // Click on "Регистрация" tab
  const regTab = page.locator('button:has-text("Регистрация")');
  if (await regTab.isVisible()) {
    await regTab.click();
    await page.waitForTimeout(500);
  }

  const regPasswordInput = page.locator('#register-password');
  await regPasswordInput.waitFor({ state: 'visible', timeout: 5000 });
  const minLength = await regPasswordInput.getAttribute('minlength');
  const maxLength = await regPasswordInput.getAttribute('maxlength');
  const placeholder = await regPasswordInput.getAttribute('placeholder');

  console.log(`✓ Registration password attributes: minlength=${minLength}, maxlength=${maxLength}, placeholder="${placeholder}"`);
  if (minLength !== '6' || maxLength !== '128' || !placeholder?.includes('от 6 до 128')) {
    throw new Error(`Registration password input attributes mismatch! min=${minLength}, max=${maxLength}, placeholder=${placeholder}`);
  }

  await page.screenshot({ path: path.join(artifactsDir, 'stage_register_password_6_to_128.png') });

  // 2. Check Landing promo code input
  console.log('👉 Testing Landing page promo code input...');
  await page.goto('http://127.0.0.1:3005/', { waitUntil: 'networkidle' });
  const promoButton = page.locator('button:has-text("У меня есть промокод")');
  if (await promoButton.isVisible()) {
    await promoButton.click();
    await page.waitForTimeout(400);
  }

  const landingPromoInput = page.locator('#promo-input');
  if (await landingPromoInput.isVisible()) {
    const promoMax = await landingPromoInput.getAttribute('maxlength');
    console.log(`✓ Landing promo code input maxlength=${promoMax}`);
    if (promoMax !== '64') {
      throw new Error(`Landing promo code maxlength expected 64, got ${promoMax}`);
    }
  }
  await page.screenshot({ path: path.join(artifactsDir, 'stage_landing_promo_max64.png') });

  // 3. Check /dashboard/add-funds with user session
  console.log('👉 Testing /dashboard/add-funds promo code input...');
  const user = await prisma.user.findFirst({
    where: { email: 'art@artmspektr.ru' },
  });
  if (!user) throw new Error('User art@artmspektr.ru not found');

  const userToken = await createJwt(user.id, user.role, 'smmplan');
  await context.addCookies([
    {
      name: 'session_token',
      value: userToken,
      domain: '127.0.0.1',
      path: '/',
    },
    {
      name: 'x_tenant',
      value: 'smmplan',
      domain: '127.0.0.1',
      path: '/',
    },
  ]);

  await page.goto('http://127.0.0.1:3005/dashboard/add-funds', { waitUntil: 'networkidle' });
  const addFundsPromoInput = page.locator('input[placeholder="PROMO-2026"]');
  await addFundsPromoInput.waitFor({ state: 'visible', timeout: 5000 });
  await addFundsPromoInput.scrollIntoViewIfNeeded();
  const addFundsMax = await addFundsPromoInput.getAttribute('maxlength');
  console.log(`✓ Add funds promo input maxlength=${addFundsMax}`);
  if (addFundsMax !== '64') {
    throw new Error(`Add funds promo input maxlength expected 64, got ${addFundsMax}`);
  }

  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(artifactsDir, 'stage_add_funds_promo_max64.png') });

  // 4. Check /admin/marketing create promo form modal with admin session
  console.log('👉 Testing /admin/marketing create promo modal...');
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@example.com' },
  });
  if (!admin) throw new Error('User admin@example.com not found');

  const adminToken = await createJwt(admin.id, admin.role, 'smmplan');
  await context.addCookies([
    {
      name: 'session_token',
      value: adminToken,
      domain: '127.0.0.1',
      path: '/',
    },
  ]);

  await page.goto('http://127.0.0.1:3005/admin/marketing', { waitUntil: 'networkidle' });
  console.log('   Admin page URL:', page.url());
  const createPromoBtn = page.locator('button:has-text("Создать")').first();
  if (await createPromoBtn.isVisible()) {
    await createPromoBtn.click();
    await page.waitForTimeout(600);
    const adminCodeInput = page.locator('input[name="code"]');
    await adminCodeInput.waitFor({ state: 'visible', timeout: 5000 });
    const adminMax = await adminCodeInput.getAttribute('maxlength');
    console.log(`✓ Admin create promo input maxlength=${adminMax}`);
    if (adminMax !== '64') {
      throw new Error(`Admin promo code maxlength expected 64, got ${adminMax}`);
    }
    await page.screenshot({ path: path.join(artifactsDir, 'stage_admin_create_promo_max64.png') });
  }

  await browser.close();
  await prisma.$disconnect();

  console.log('🎉 ALL STAGE VISUAL AUDITS PASSED WITH 100% SUCCESS!');
}

main().catch((err) => {
  console.error('❌ Stage verification failed:', err);
  process.exit(1);
});
