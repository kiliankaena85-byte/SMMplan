import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('🚀 Launching Chromium Browser for Visual QA & E2E Verification...');
  const browser = await chromium.launch({ headless: true });

  const artifactDir = 'C:/Users/Артём/.gemini/antigravity/brain/94b4db79-7a02-4bc2-a8e3-43afbae751e5';
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

  const QA_SECRET = 'secret_qdocker_qa2026';
  const testEmail = 'client_1787806229510@smmplan.local';

  // --------------------------------------------------------------------------
  // 1. DESKTOP VIEWPORT: User Finance & Transactions (/dashboard/finance?tab=history)
  // --------------------------------------------------------------------------
  console.log('1. Authenticating & Capturing Desktop User Finance Dashboard (1440x900)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const desktopPage = await desktopContext.newPage();

  // Login via direct QA dev endpoint
  const loginUrl = `http://localhost:3000/api/dev/login-direct?email=${encodeURIComponent(testEmail)}&secret=${QA_SECRET}&redirect=/dashboard/finance?tab=history`;
  await desktopPage.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await desktopPage.waitForTimeout(2000);

  const desktopFinanceShot = path.join(artifactDir, 'user_finance_transactions_desktop.png');
  await desktopPage.screenshot({ path: desktopFinanceShot, fullPage: false });
  console.log('✔ User Finance Transactions (Desktop) captured:', desktopFinanceShot);

  // --------------------------------------------------------------------------
  // 2. MOBILE VIEWPORT: User Finance & Transactions (390x844 - iPhone 14 Pro)
  // --------------------------------------------------------------------------
  console.log('2. Authenticating & Capturing Mobile User Finance Dashboard (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();

  const mobileLoginUrl = `http://localhost:3000/api/dev/login-direct?email=${encodeURIComponent(testEmail)}&secret=${QA_SECRET}&redirect=/dashboard/finance?tab=history`;
  await mobilePage.goto(mobileLoginUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(2000);

  const mobileFinanceShot = path.join(artifactDir, 'user_finance_transactions_mobile.png');
  await mobilePage.screenshot({ path: mobileFinanceShot, fullPage: false });
  console.log('✔ User Finance Transactions (Mobile) captured:', mobileFinanceShot);

  // --------------------------------------------------------------------------
  // 3. ADMIN PANEL: Finance & Payments Registry (/admin/finance)
  // --------------------------------------------------------------------------
  console.log('3. Authenticating & Capturing Admin Panel Finance & Payments Registry (1440x900)...');
  const adminPage = await desktopContext.newPage();
  const adminLoginUrl = `http://localhost:3000/api/dev/login-direct?email=admin@smmplan.ru&secret=${QA_SECRET}&redirect=/admin/finance`;
  await adminPage.goto(adminLoginUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await adminPage.waitForTimeout(2000);

  const adminFinanceShot = path.join(artifactDir, 'admin_finance_payments_registry.png');
  await adminPage.screenshot({ path: adminFinanceShot, fullPage: false });
  console.log('✔ Admin Finance Payments Registry captured:', adminFinanceShot);

  await browser.close();
  console.log('🎉 Visual E2E Screenshot Capture Completed Successfully!');
}

main().catch(err => {
  console.error('❌ Browser Visual E2E QA Failed:', err);
  process.exit(1);
});
