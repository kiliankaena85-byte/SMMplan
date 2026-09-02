import 'dotenv/config';
import { chromium } from 'playwright';
import { db } from '../src/lib/db';
import { SignJWT } from 'jose';
import { getEncodedKey } from '../src/lib/session-edge';
import fs from 'fs';
import path from 'path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function createJwt(userId: string, role: string, tenantId = 'smmplan') {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await db.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: UA,
      ipAddress: '127.0.0.1',
    },
  });

  const isStaff = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT', 'OPERATOR'].includes(role);
  const jwtRole = isStaff ? undefined : role;

  return new SignJWT({
    sessionId: session.id,
    userId,
    canResetPassword: false,
    ...(jwtRole ? { role: jwtRole } : {}),
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
  console.log('📸 Starting Playwright Private Catalog Deep Capture...');

  const brainDir = path.resolve('C:/Users/Артём/.gemini/antigravity/brain/825b8dde-0bec-45fa-8205-d3b2d05f1962');
  const localArtifactsDir = path.resolve(process.cwd(), 'artifacts');

  if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });
  if (!fs.existsSync(localArtifactsDir)) fs.mkdirSync(localArtifactsDir, { recursive: true });

  // 1. Ensure VIP Customer Group exists
  let vipGroup = await db.customerGroup.findFirst({ where: { slug: 'vip-exclusive' } });
  if (!vipGroup) {
    vipGroup = await db.customerGroup.create({
      data: {
        name: 'VIP Club (Эксклюзив)',
        slug: 'vip-exclusive',
        discountPercent: 15.0,
        tenantId: 'smmplan',
      },
    });
  }

  // 2. Ensure Telegram Network & Category exist
  let tgNetwork = await db.network.findFirst({ where: { slug: 'telegram' } });
  let category = await db.category.findFirst({ where: { networkId: tgNetwork?.id } });
  if (!category) {
    category = await db.category.findFirst();
  }

  let pubService = await db.service.findFirst({
    where: { categoryId: category!.id, customerAccess: { none: {} } }
  });
  if (!pubService) {
    pubService = await db.service.create({
      data: {
        name: 'Telegram Стандарт Подписчики',
        description: 'Стандартные подписчики для всех клиентов.',
        categoryId: category!.id,
        rate: 0.50,
        providerCurrency: 'RUB',
        markup: 2.0,
        minQty: 50,
        maxQty: 10000,
        tenantId: 'smmplan',
        isActive: true,
      }
    });
  }

  let vipService = await db.service.findFirst({
    where: { name: { contains: 'VIP Подписчики' }, categoryId: category!.id },
  });

  if (!vipService && category) {
    vipService = await db.service.create({
      data: {
        name: 'Telegram VIP Подписчики [Закрытый доступ]',
        description: 'Эксклюзивная услуга высокой скорости без списаний с гарантией 60 дней. Доступна только участникам VIP Club.',
        categoryId: category.id,
        rate: 1.20,
        providerCurrency: 'RUB',
        markup: 2.0,
        minQty: 100,
        maxQty: 25000,
        tenantId: 'smmplan',
        isActive: true,
        isRefillEnabled: true,
      },
    });
  }

  if (vipService && vipGroup) {
    await db.serviceCustomerAccess.upsert({
      where: {
        serviceId_customerGroupId: {
          serviceId: vipService.id,
          customerGroupId: vipGroup.id,
        },
      },
      update: {
        isCustomPrice: true,
        customPriceRub: 2.50,
      },
      create: {
        serviceId: vipService.id,
        customerGroupId: vipGroup.id,
        isCustomPrice: true,
        customPriceRub: 2.50,
      },
    });
  }

  // 3. Setup Users
  const ownerUser = await db.user.findFirst({ where: { role: 'OWNER' } });
  
  let vipUser = await db.user.upsert({
    where: { email_tenantId: { email: 'vip_stage_client@smmplan.pro', tenantId: 'smmplan' } },
    update: { customerGroupId: vipGroup.id, isActive: true, isDeleted: false },
    create: {
      email: 'vip_stage_client@smmplan.pro',
      customerGroupId: vipGroup.id,
      tenantId: 'smmplan',
      role: 'USER',
      isActive: true,
      isDeleted: false,
    },
  });

  let regularUser = await db.user.upsert({
    where: { email_tenantId: { email: 'regular_stage_client@smmplan.pro', tenantId: 'smmplan' } },
    update: { customerGroupId: null, isActive: true, isDeleted: false },
    create: {
      email: 'regular_stage_client@smmplan.pro',
      customerGroupId: null,
      tenantId: 'smmplan',
      role: 'USER',
      isActive: true,
      isDeleted: false,
    },
  });

  const ownerToken = await createJwt(ownerUser!.id, 'OWNER');
  const vipToken = await createJwt(vipUser.id, 'USER');
  const regularToken = await createJwt(regularUser.id, 'USER');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();

  // 📸 Shot 1: Admin Catalog Service Edit with Customer Group Access
  console.log('Capturing 1. Admin Service Edit Access Card...');
  await context.clearCookies();
  await context.addCookies([
    { name: 'session_token', value: ownerToken, url: 'http://127.0.0.1:3005' },
    { name: 'x_tenant', value: 'smmplan', url: 'http://127.0.0.1:3005' },
    { name: 'session_token', value: ownerToken, domain: '127.0.0.1', path: '/' },
    { name: 'x_tenant', value: 'smmplan', domain: '127.0.0.1', path: '/' },
  ]);
  await page.goto(`http://127.0.0.1:3005/admin/catalog/${vipService!.id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const accessCard = page.locator('text=Доступность услуги');
  if (await accessCard.isVisible()) {
    await accessCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  const shot1Local = path.join(localArtifactsDir, '58_stage_admin_service_access_groups.png');
  const shot1Brain = path.join(brainDir, '58_stage_admin_service_access_groups.png');
  await page.screenshot({ path: shot1Local, fullPage: false });
  fs.copyFileSync(shot1Local, shot1Brain);
  console.log('✅ Shot 1 captured.');

  // 📸 Shot 2: Admin Client CRM with Customer Group Selection
  console.log('Capturing 2. Admin Client CRM Customer Group...');
  await page.goto(`http://127.0.0.1:3005/admin/clients/${vipUser.id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const notesTabBtn = page.locator('button:has-text("Скидки & Заметки")');
  if (await notesTabBtn.isVisible()) {
    await notesTabBtn.click();
    await page.waitForTimeout(1500);
  }

  const shot2Local = path.join(localArtifactsDir, '59_stage_admin_client_crm_group.png');
  const shot2Brain = path.join(brainDir, '59_stage_admin_client_crm_group.png');
  await page.screenshot({ path: shot2Local, fullPage: false });
  fs.copyFileSync(shot2Local, shot2Brain);
  console.log('✅ Shot 2 captured.');

  const step3Url = `http://127.0.0.1:3005/dashboard/new-order?step=3&networkId=${tgNetwork?.id || ''}&categoryId=${category?.id || ''}`;

  // 📸 Shot 3: Storefront Order Wizard Step 3 for VIP User (Exclusive Service Visible)
  console.log('Capturing 3. VIP User Storefront Step 3 (Exclusive Service Visible)...');
  await context.clearCookies();
  await context.addCookies([
    { name: 'session_token', value: vipToken, url: 'http://127.0.0.1:3005' },
    { name: 'x_tenant', value: 'smmplan', url: 'http://127.0.0.1:3005' },
    { name: 'session_token', value: vipToken, domain: '127.0.0.1', path: '/' },
    { name: 'x_tenant', value: 'smmplan', domain: '127.0.0.1', path: '/' },
  ]);
  await page.goto(step3Url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const shot3Local = path.join(localArtifactsDir, '60_stage_storefront_vip_exclusive_service.png');
  const shot3Brain = path.join(brainDir, '60_stage_storefront_vip_exclusive_service.png');
  await page.screenshot({ path: shot3Local, fullPage: false });
  fs.copyFileSync(shot3Local, shot3Brain);
  console.log('✅ Shot 3 captured.');

  // 📸 Shot 4: Storefront Order Wizard Step 3 for Regular User (Exclusive Hidden)
  console.log('Capturing 4. Regular User Storefront Step 3 (Exclusive Hidden)...');
  await context.clearCookies();
  await context.addCookies([
    { name: 'session_token', value: regularToken, url: 'http://127.0.0.1:3005' },
    { name: 'x_tenant', value: 'smmplan', url: 'http://127.0.0.1:3005' },
    { name: 'session_token', value: regularToken, domain: '127.0.0.1', path: '/' },
    { name: 'x_tenant', value: 'smmplan', domain: '127.0.0.1', path: '/' },
  ]);
  await page.goto(step3Url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const shot4Local = path.join(localArtifactsDir, '61_stage_storefront_regular_user_hidden.png');
  const shot4Brain = path.join(brainDir, '61_stage_storefront_regular_user_hidden.png');
  await page.screenshot({ path: shot4Local, fullPage: false });
  fs.copyFileSync(shot4Local, shot4Brain);
  console.log('✅ Shot 4 captured.');

  await browser.close();
  console.log('🎉 All deep stage screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});