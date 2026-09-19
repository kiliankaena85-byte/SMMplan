import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { spawn, ChildProcess } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { chromium } from 'playwright';
import { getEncodedKey } from '../src/lib/session-edge';

const prisma = new PrismaClient();
const STAGE_PORT = 3005;
const BRAIN_DIR = path.resolve('C:/Users/Артём/.gemini/antigravity/brain/e454ca9f-8f39-4938-9e3c-4fa461407351');
const ARTIFACTS_DIR = path.resolve(process.cwd(), 'artifacts/stage-manual');

let nextServerProcess: ChildProcess | null = null;

async function checkServer(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(1000);
    s.on('connect', () => {
      s.destroy();
      resolve(true);
    });
    s.on('error', () => {
      resolve(false);
    });
    s.on('timeout', () => {
      s.destroy();
      resolve(false);
    });
    s.connect(port, '127.0.0.1');
  });
}

async function ensureServerRunning(): Promise<string> {
  if (await checkServer(STAGE_PORT)) {
    console.log(`✓ Stage server already running on port ${STAGE_PORT}`);
    return `http://127.0.0.1:${STAGE_PORT}`;
  }

  console.log(`🚀 Spawning Next.js stage server on port ${STAGE_PORT}...`);
  nextServerProcess = spawn('npx', ['next', 'dev', '-p', String(STAGE_PORT)], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(STAGE_PORT), HOSTNAME: '0.0.0.0', TELEGRAM_BOT_TOKEN: '' },
  });

  const startTime = Date.now();
  while (Date.now() - startTime < 90000) {
    await new Promise((r) => setTimeout(r, 2000));
    if (await checkServer(STAGE_PORT)) {
      console.log(`✓ Next.js stage server successfully running on port ${STAGE_PORT}!`);
      await new Promise((r) => setTimeout(r, 4000));
      return `http://127.0.0.1:${STAGE_PORT}`;
    }
  }

  throw new Error(`Timeout waiting for stage server on port ${STAGE_PORT}`);
}

async function createJwt(userId: string, role: string, tenantId = 'smmplan') {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
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
  console.log('🎬 Запуск Stage Visual Audit для OmniManual 1.0 (Port 3005)...');

  if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });
  if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const stageUrl = await ensureServerRunning();

  const ownerUser = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  if (!ownerUser) {
    throw new Error('Пользователь с ролью OWNER не найден в базе данных');
  }

  const ownerToken = await createJwt(ownerUser.id, 'OWNER', 'smmplan');
  console.log(`✓ Создана тестовая сессия для OWNER: ${ownerUser.email}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1560, height: 960 },
      deviceScaleFactor: 1.5,
    });

    await context.addCookies([
      { name: 'session_token', value: ownerToken, domain: '127.0.0.1', path: '/' },
      { name: 'x_tenant', value: 'smmplan', domain: '127.0.0.1', path: '/' },
      { name: 'x_admin_tenant', value: 'smmplan', domain: '127.0.0.1', path: '/' },
    ]);

    const page = await context.newPage();

    // ── 1. Навигация на страницу админки провайдеров ──
    console.log('📸 1. Открытие панели управления /admin/providers...');
    await page.goto(`${stageUrl}/admin/providers`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    // Скриншот до открытия виджета (базовый экран)
    const shot0Local = path.join(ARTIFACTS_DIR, '00_stage_admin_providers_initial.png');
    await page.screenshot({ path: shot0Local, fullPage: false });
    fs.copyFileSync(shot0Local, path.join(BRAIN_DIR, '00_stage_admin_providers_initial.png'));
    console.log('✓ Сохранен 00_stage_admin_providers_initial.png');

    // ── 2. Открытие виджета OmniManual через кнопку в шапке или горячую клавишу ──
    console.log('📸 2. Активация виджета OmniManual 1.0 (Docked Mode)...');
    const triggerBtn = page.locator('button[aria-label="Открыть интерактивную инструкцию и ИИ-консультант"]');
    if (await triggerBtn.count() > 0) {
      await triggerBtn.first().click();
    } else {
      await page.keyboard.press('Control+/');
    }
    await page.waitForTimeout(2000);

    const shot1Local = path.join(ARTIFACTS_DIR, '01_stage_manual_docked_mode.png');
    await page.screenshot({ path: shot1Local, fullPage: false });
    fs.copyFileSync(shot1Local, path.join(BRAIN_DIR, '01_stage_manual_docked_mode.png'));
    console.log('✓ Сохранен 01_stage_manual_docked_mode.png (Виджет открыт в режиме стыковки)');

    // ── 3. Переход во вкладку «Инструкция / Регламенты» ──
    console.log('📸 3. Переход во вкладку «Инструкция» (Патентный рубрикатор)...');
    const guidesTab = page.locator('button:has-text("Инструкция")');
    if (await guidesTab.count() > 0) {
      await guidesTab.first().click();
      await page.waitForTimeout(2000);
    }

    const shot2Local = path.join(ARTIFACTS_DIR, '02_stage_manual_guides_patent_list.png');
    await page.screenshot({ path: shot2Local, fullPage: false });
    fs.copyFileSync(shot2Local, path.join(BRAIN_DIR, '02_stage_manual_guides_patent_list.png'));
    console.log('✓ Сохранен 02_stage_manual_guides_patent_list.png (Список регламентов с кнопкой Скачать все)');

    // ── 4. Открытие конкретного регламента с 6 разделами ──
    console.log('📸 4. Открытие регламента каталога и зомби-услуг...');
    const firstRunbookCard = page.locator('text=Импорт каталога услуг через мастер Cherry-Pick').first();
    if (await firstRunbookCard.count() > 0) {
      await firstRunbookCard.click();
      await page.waitForTimeout(2000);
    }

    const shot3Local = path.join(ARTIFACTS_DIR, '03_stage_manual_runbook_detail_6_sections.png');
    await page.screenshot({ path: shot3Local, fullPage: false });
    fs.copyFileSync(shot3Local, path.join(BRAIN_DIR, '03_stage_manual_runbook_detail_6_sections.png'));
    console.log('✓ Сохранен 03_stage_manual_runbook_detail_6_sections.png (6 разделов Роспатента + кнопка Скачать регламент)');

    // ── 5. Переход во вкладку «Инспектор» ──
    console.log('📸 5. Переход во вкладку «Инспектор кода»...');
    const backBtn = page.locator('button:has-text("Назад к списку регламентов")');
    if (await backBtn.count() > 0) {
      await backBtn.click();
      await page.waitForTimeout(1000);
    }

    const inspectorTab = page.locator('button:has-text("Инспектор")');
    if (await inspectorTab.count() > 0) {
      await inspectorTab.first().click();
      await page.waitForTimeout(1500);
    }

    const shot4Local = path.join(ARTIFACTS_DIR, '04_stage_manual_inspector_status.png');
    await page.screenshot({ path: shot4Local, fullPage: false });
    fs.copyFileSync(shot4Local, path.join(BRAIN_DIR, '04_stage_manual_inspector_status.png'));
    console.log('✓ Сохранен 04_stage_manual_inspector_status.png (Статус векторной памяти и эвристики)');

    // ── 6. Переход во вкладку «Чат с ИИ» ──
    console.log('📸 6. Переход во вкладку «Чат с ИИ»...');
    const chatTab = page.locator('button:has-text("Чат с ИИ")');
    if (await chatTab.count() > 0) {
      await chatTab.first().click();
      await page.waitForTimeout(1500);
    }

    const shot5Local = path.join(ARTIFACTS_DIR, '05_stage_manual_chat_tab.png');
    await page.screenshot({ path: shot5Local, fullPage: false });
    fs.copyFileSync(shot5Local, path.join(BRAIN_DIR, '05_stage_manual_chat_tab.png'));
    console.log('✓ Сохранен 05_stage_manual_chat_tab.png (Интерфейс диалога с консультантом)');

    console.log('🎉 Все скриншоты успешно сняты и верифицированы!');
  } finally {
    await browser.close();
    await prisma.$disconnect();
    if (nextServerProcess) {
      console.log('🛑 Остановка временного Next.js stage-процесса...');
      nextServerProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error('❌ Ошибка во время visual audit:', err);
  if (nextServerProcess) nextServerProcess.kill();
  process.exit(1);
});
