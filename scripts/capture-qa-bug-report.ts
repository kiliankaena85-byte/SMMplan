import { chromium } from 'playwright';

async function main() {
  console.log('📸 Capturing QA Dock and Bug Report Modal states...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const email = 'admin@smmplan.test';
  await page.goto(`http://127.0.0.1:3000/api/dev/login-direct?email=${encodeURIComponent(email)}&tenant=smmplan&redirect=${encodeURIComponent('/admin/orders')}`);
  await page.waitForTimeout(2000);

  // 1. Click QA Dock button at bottom-left to open QA Control Center
  await page.locator('button:has-text("QA Dock")').click();
  await page.waitForTimeout(400);

  await page.screenshot({ 
    path: 'C:/Users/Артём/.gemini/antigravity/brain/6fe070bd-15c2-4d78-b2e2-88e29f93053c/qa_control_center_with_bug_report.png' 
  });
  console.log('Saved qa_control_center_with_bug_report.png');

  // 2. Click "Сообщить о баге" button
  await page.locator('button:has-text("Сообщить о баге")').click();
  await page.waitForTimeout(400);

  // Type sample bug info into modal
  await page.locator('input[placeholder*="Кнопка «Оплатить»"]').fill('Кнопка «Оплатить» не реагирует при выборе СБП');
  await page.locator('textarea').fill('1. Перешел на страницу оформления заказа\n2. Выбрал Telegram -> Подписчики\n3. Ввел ссылку и нажал кнопку оплаты — форма затряслась, но заказ не сформировался.');

  await page.screenshot({ 
    path: 'C:/Users/Артём/.gemini/antigravity/brain/6fe070bd-15c2-4d78-b2e2-88e29f93053c/bug_report_modal_open.png' 
  });
  console.log('Saved bug_report_modal_open.png');

  await browser.close();
}

main().catch(console.error);
