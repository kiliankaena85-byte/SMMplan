const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureAll() {
  const artifactsDir = 'C:\\Users\\Артём\\.gemini\\antigravity\\brain\\ea3a0555-f229-4c26-9329-c26f154ae6e0';
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  console.log('Starting browser for comprehensive visual capture...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const url = process.env.DEMO_URL || 'http://localhost:3000/client-demo';
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

    const modes = [
      { name: 'plan', buttonText: 'SMMplan Only' },
      { name: 'flux', buttonText: 'SMMflux Only' },
      { name: 'compare', buttonText: 'Сравнение рядом' }
    ];

    const viewports = [
      { name: '320', width: 320, height: 800 },
      { name: '768', width: 768, height: 900 },
      { name: '1024', width: 1024, height: 900 },
      { name: '1440', width: 1440, height: 900 }
    ];

    for (const mode of modes) {
      console.log(`Switching to mode: ${mode.name}`);
      await page.click(`button:has-text("${mode.buttonText}")`);
      await page.waitForTimeout(300);

      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(400);
        const fileName = `${mode.name}_${vp.name}px.png`;
        const filePath = path.join(artifactsDir, fileName);
        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`Captured: ${fileName}`);
      }
    }

  } catch (err) {
    console.error('Capture error:', err.message);
  } finally {
    await browser.close();
  }
}

captureAll();
