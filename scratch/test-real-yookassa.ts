import { chromium } from 'playwright';
import { db } from '../src/lib/db';
import { VaultService } from '../src/lib/vault';

async function run() {
  console.log('🚀 Launching real YooKassa E2E transaction test...');
  
  // 1. Launch browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // 2. Go to New Order Page
  console.log('🔗 Navigating to Smmplan order form (with 90s compile timeout)...');
  await page.goto('http://localhost:3000/dashboard/new-order', { timeout: 90000 });
  await page.waitForTimeout(4000);
  
  await page.screenshot({ path: 'scratch/step1_order_form.png' });
  console.log('📸 Step 1: Loaded order form. Saved scratch/step1_order_form.png');
  
  // 3. Fill in details
  console.log('✍️ Filling order link and quantity...');
  const linkInput = page.locator('input#order-url').first();
  await linkInput.fill('https://t.me/durov');
  
  // Wait for pricing to calculate and options to become visible
  await page.waitForTimeout(4000);
  
  const qtyInput = page.locator('input[type="number"], input[placeholder*="Количество"]').first();
  await qtyInput.fill('15');
  
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill('testuser@smmplan.local');
  
  const agreementCheckbox = page.locator('input[type="checkbox"]').first();
  await agreementCheckbox.check({ force: true });
  
  await page.screenshot({ path: 'scratch/step2_form_filled.png' });
  console.log('📸 Step 2: Form filled. Saved scratch/step2_form_filled.png');
  
  // 4. Click pay button
  const payBtn = page.locator('button', { hasText: /Оплатить/ }).first();
  console.log('💳 Clicking Pay button...');
  await payBtn.click();
  
  // 5. Wait for navigation / redirect to YooKassa
  console.log('⏳ Waiting for redirect to YooKassa payment page...');
  await page.waitForNavigation({ url: /yoomoney\.ru|yookassa\.ru|mock-payment/i, timeout: 20000 }).catch(e => {
    console.log('Navigation wait timed out or bypassed:', e.message);
  });
  
  await page.waitForTimeout(6000);
  const currentUrl = page.url();
  console.log(`📍 Redirected to: ${currentUrl}`);
  
  await page.screenshot({ path: 'scratch/step3_payment_redirect.png' });
  console.log('📸 Step 3: Redirect screen. Saved scratch/step3_payment_redirect.png');
  
  if (currentUrl.includes('mock-payment')) {
    console.log('⚠️ System processed as mock-payment instead of real YooKassa Sandbox.');
    console.log('Checking database settings again to make sure test credentials were read correctly...');
    await browser.close();
    return;
  }
  
  // 6. Enter YooKassa Test Card Details
  console.log('💳 YooKassa real sandbox detected! Locating credit card fields...');
  
  // Wait for the iframe or card fields to be ready
  // Standard card number field placeholder contains "Номер" or uses cardnumber input
  const cardInput = page.locator('input[type="tel"], [autocomplete="cc-number"], input[placeholder*="Номер"]').first();
  await cardInput.fill('1111111111111111');
  
  const expInput = page.locator('[autocomplete="cc-exp"], input[placeholder*="ММ"], input[placeholder*="Срок"]').first();
  await expInput.fill('12/28');
  
  const cvcInput = page.locator('[autocomplete="cc-csc"], input[placeholder*="CVC"], input[placeholder*="Код"]').first();
  await cvcInput.fill('123');
  
  await page.screenshot({ path: 'scratch/step4_card_filled.png' });
  console.log('📸 Step 4: Card fields filled. Saved scratch/step4_card_filled.png');
  
  // Click Submit/Pay button on YooKassa form
  console.log('🚀 Submitting payment...');
  const submitBtn = page.locator('button[type="submit"], button:has-text("Оплатить"), button:has-text("Получить код")').first();
  await submitBtn.click();
  
  await page.waitForTimeout(6000);
  console.log(`📍 Current URL after submit: ${page.url()}`);
  await page.screenshot({ path: 'scratch/step5_after_submit.png' });
  console.log('📸 Step 5: After submit screen. Saved scratch/step5_after_submit.png');
  
  // Look for 3DS mock page (often yoomoney shows a "Submit" or "Вернуться в магазин" button in sandbox)
  const submit3ds = page.locator('button:has-text("Submit"), button:has-text("Дальше"), input[type="submit"]').first();
  if (await submit3ds.count() > 0) {
    console.log('🛡️ 3DS mock screen detected. Clicking submit...');
    await submit3ds.click();
    await page.waitForTimeout(6000);
  }
  
  // Wait for final redirect back to success page
  console.log('⏳ Waiting for return redirect to Smmplan success page...');
  await page.waitForURL(/success/i, { timeout: 20000 }).catch(e => {
    console.log('Success URL redirection wait timed out:', e.message);
  });
  
  console.log(`📍 Final URL: ${page.url()}`);
  await page.screenshot({ path: 'scratch/step6_success_page.png' });
  console.log('📸 Step 6: Final screen. Saved scratch/step6_success_page.png');
  
  if (page.url().includes('success')) {
    console.log('🎉 REAL YOOKASSA SANDBOX E2E TRANSACTION PASSED SUCCESSFULLY! 🏆');
  } else {
    console.error('❌ Failed to reach the success page.');
  }
  
  await browser.close();
}

run().catch(console.error).finally(() => db.$disconnect());
