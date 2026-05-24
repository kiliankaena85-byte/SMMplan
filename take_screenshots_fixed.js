/**
 * Smmplan Landing Page Robust Screenshot and Visual Audit Automation Script
 * Written in UTF-8.
 */
const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('[Audit Tool] Starting visual audit automation script...');

  const outputDir = path.resolve(__dirname, '.planning', 'screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const logFilePath = path.join(outputDir, 'browser_console.log');
  const consoleLogs = [];

  const addLog = (type, text) => {
    const logStr = `[${new Date().toISOString()}] [${type}] ${text}`;
    console.log(logStr);
    consoleLogs.push(logStr);
  };

  const browser = await chromium.launch({ headless: true });

  // 1. DESKTOP AUDIT (1280x800, scale 2)
  try {
    addLog('INFO', 'Commencing Desktop view audit...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2
    });

    const page = await desktopContext.newPage();

    // Listen to console & error events
    page.on('console', msg => {
      addLog(`CONSOLE_${msg.type().toUpperCase()}`, msg.text());
    });
    page.on('pageerror', err => {
      addLog('EXCEPTION', err.stack || err.message);
    });

    addLog('INFO', 'Navigating to http://localhost:3000/...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000); // Allow animations/Aurora to render

    // Interact with networks
    addLog('INFO', 'Finding social networks in desktop selector...');
    const networkButtons = await page.locator('.hidden.md\\:flex button').all();
    addLog('INFO', `Found ${networkButtons.length} networks buttons on desktop.`);

    // Click on a few platforms (first 3)
    for (let i = 0; i < Math.min(networkButtons.length, 3); i++) {
      const btn = networkButtons[i];
      const title = await btn.getAttribute('title') || `Index ${i}`;
      addLog('INFO', `Clicking social network platform: ${title}`);
      await btn.click();
      await page.waitForTimeout(1000);
    }

    // Capture desktop screenshot
    const desktopPath = path.join(outputDir, 'desktop.png');
    await page.screenshot({ path: desktopPath, fullPage: false });
    addLog('INFO', `Saved desktop screenshot to: ${desktopPath}`);

    await desktopContext.close();
  } catch (err) {
    addLog('ERROR', `Desktop capture failed: ${err.stack || err.message}`);
  }

  // 2. MOBILE AUDIT (375x812, scale 3)
  try {
    addLog('INFO', 'Commencing Mobile view audit (iPhone X configuration)...');
    const iPhoneX = devices['iPhone X'];
    const mobileContext = await browser.newContext({
      ...iPhoneX,
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 3
    });

    const page = await mobileContext.newPage();

    // Listen to console & error events
    page.on('console', msg => {
      addLog(`CONSOLE_${msg.type().toUpperCase()}`, msg.text());
    });
    page.on('pageerror', err => {
      addLog('EXCEPTION', err.stack || err.message);
    });

    addLog('INFO', 'Navigating to http://localhost:3000/ on mobile...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Step 1: Input URL link to unfold selectors
    addLog('INFO', 'Locating mobile URL link input field...');
    const urlInput = page.locator('input[placeholder="https://t.me/channel_or_post"]');
    await urlInput.fill('https://t.me/durov');
    addLog('INFO', 'URL input filled with https://t.me/durov.');
    await page.waitForTimeout(1500); // wait for state unfolding animation

    // Step 2 & 3: Open select triggers and interactively click platforms/categories
    addLog('INFO', 'Locating select triggers...');
    const triggersCount = await page.locator('[data-slot="select-trigger"]').count();
    addLog('INFO', `Found ${triggersCount} select triggers in regular mode.`);

    if (triggersCount === 2) {
      // Both Platform and Category are present
      addLog('INFO', 'Clicking Platform select trigger...');
      await page.locator('[data-slot="select-trigger"]').nth(0).click();
      await page.waitForTimeout(800);

      addLog('INFO', 'Selecting first platform item...');
      await page.locator('[data-slot="select-item"]').first().click();
      await page.waitForTimeout(1000);

      addLog('INFO', 'Clicking Category select trigger...');
      await page.locator('[data-slot="select-trigger"]').nth(1).click();
      await page.waitForTimeout(800);

      addLog('INFO', 'Selecting first category item...');
      await page.locator('[data-slot="select-item"]').first().click();
      await page.waitForTimeout(1000);
    } else if (triggersCount === 1) {
      // Only Category is present (Platform is auto-detected)
      addLog('INFO', 'Platform auto-detected. Clicking Category select trigger...');
      await page.locator('[data-slot="select-trigger"]').first().click();
      await page.waitForTimeout(800);

      addLog('INFO', 'Selecting first category item...');
      await page.locator('[data-slot="select-item"]').first().click();
      await page.waitForTimeout(1000);
    } else {
      addLog('WARNING', 'No select triggers found. They might be already loaded or hidden.');
    }

    // Step 4: Click the first service tariff plan card
    addLog('INFO', 'Selecting first service tariff plan card...');
    const tariffPlan = page.locator('div.grid-cols-3 button').first();
    await tariffPlan.click();
    await page.waitForTimeout(1000);

    // Step 5: Advance to Step 2 by clicking checkout progress button
    addLog('INFO', 'Clicking Step 1 progress button to proceed to Step 2...');
    const nextStepBtn = page.locator('button:has-text("Далее"), button:has-text("Шаг 2")').first();
    await nextStepBtn.click();
    await page.waitForTimeout(1500);

    // Enter email in step 2
    addLog('INFO', 'Filling email in Step 2...');
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('audit@smmplan.ru');
      await page.waitForTimeout(500);
    }

    // Capture mobile screenshot in Step 2
    const mobilePath = path.join(outputDir, 'mobile.png');
    await page.screenshot({ path: mobilePath, fullPage: false });
    addLog('INFO', `Saved mobile screenshot to: ${mobilePath}`);

    await mobileContext.close();
  } catch (err) {
    addLog('ERROR', `Mobile capture failed: ${err.stack || err.message}`);
  }

  await browser.close();

  // Write all collected logs to log file
  fs.writeFileSync(logFilePath, consoleLogs.join('\n'), 'utf8');
  console.log(`[Audit Tool] All automation completed successfully. Logs written to ${logFilePath}`);
})();
