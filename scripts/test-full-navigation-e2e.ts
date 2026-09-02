import { chromium, devices } from "@playwright/test";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const iPhone = devices["iPhone 12"];
  const context = await browser.newContext({ ...iPhone });
  const page = await context.newPage();

  console.log("Navigating to homepage...");
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Dismiss cookie
  const cookieBtn = await page.$('button:has-text("Принять и продолжить")');
  if (cookieBtn) await cookieBtn.click();

  // 2. Fill URL
  const urlInput = await page.$("#standard-url-input") || await page.$('input[placeholder*="t.me"]');
  if (urlInput) {
    await urlInput.fill("https://t.me/durov");
    await page.waitForTimeout(1500);
  }

  // 3. Select service
  const serviceCard = await page.$('div:has-text("Telegram Подписчики")');
  if (serviceCard) {
    await serviceCard.click();
    await page.waitForTimeout(1500);
  }

  console.log("Checking Step 4 state...");
  let step4Btn = await page.$('button:has-text("Заказать")');
  console.log("  Step 4 'Заказать' button visible:", !!step4Btn);

  // 4. Test "Назад к тарифам"
  console.log("Testing 'Назад к тарифам'...");
  const backBtn = await page.$('button:has-text("Назад к тарифам")');
  if (backBtn) {
    await backBtn.click();
    await page.waitForTimeout(1000);
    const step3Header = await page.$('span:has-text("3. Выберите тариф")');
    console.log("  Successfully returned to Step 3?", !!step3Header);
  }

  // 5. Pick service again to go to Step 4
  const serviceCardAgain = await page.$('div:has-text("Telegram Подписчики")');
  if (serviceCardAgain) {
    await serviceCardAgain.click();
    await page.waitForTimeout(1000);
  }

  // 6. Test "Изменить" link button on Step 4
  console.log("Testing 'Изменить' link button...");
  const changeLinkBtn = await page.$('button:has-text("Изменить")');
  if (changeLinkBtn) {
    await changeLinkBtn.click();
    await page.waitForTimeout(1000);
    const step1Input = await page.$('#standard-url-input');
    console.log("  Successfully returned to Step 1 (change link)?", !!step1Input);

    // Advance back to Step 4 using Enter
    if (step1Input) {
      await step1Input.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1000);
    }
  }

  // 7. Test "Сбросить всё" button on Step 4
  console.log("Testing 'Сбросить всё' button...");
  const resetBtn = await page.$('button:has-text("Сбросить всё")');
  if (resetBtn) {
    await resetBtn.click();
    await page.waitForTimeout(1000);
    const step1InputAfterReset = await page.$('#standard-url-input');
    const urlValue = step1InputAfterReset ? await step1InputAfterReset.inputValue() : "null";
    console.log("  Successfully reset to Step 1?", !!step1InputAfterReset);
    console.log("  URL value after reset:", JSON.stringify(urlValue));
  }

  console.log("All e2e navigation and reset tests complete!");
  await browser.close();
}

main().catch(console.error);
