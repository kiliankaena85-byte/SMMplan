import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { scanComponentFiles, LayoutFinding } from './ui/layout-sentry';

interface VisualAuditBug {
  category: 'OVERFLOW_SCREEN' | 'ICON_DISTORTED' | 'CONTRAST_OR_READABILITY' | 'BRAND_LEAK' | 'LAYOUT_BREAKAGE';
  page: string;
  viewport: string;
  theme: 'light' | 'dark';
  selector: string;
  textSnippet: string;
  details: string;
}

const FLUX_DIRS = [
  'src/components/ab-test',
  'src/components/knowledge/flux',
  'src/components/dashboard/flux',
  'src/components/orders/flux',
  'src/components/landing/flux',
  'src/components/auth',
];

const FLUX_ROUTES = [
  { name: 'Home (Wizard Step: Link)', path: '/?tenant=flux' },
  { name: 'Services: Telegram', path: '/services/telegram?tenant=flux' },
  { name: 'Knowledge Hub', path: '/knowledge?tenant=flux' },
  { name: 'Login / Register', path: '/login?tenant=flux' },
  { name: 'Legal: Terms', path: '/terms?tenant=flux' },
  { name: 'Legal: Privacy', path: '/privacy?tenant=flux' },
  { name: 'Legal: Refund', path: '/refund?tenant=flux' },
  { name: 'Support', path: '/support?tenant=flux' },
];

const VIEWPORTS = [
  { name: 'Desktop-1440', width: 1440, height: 900 },
  { name: 'Tablet-768', width: 768, height: 1024 },
  { name: 'Mobile-390', width: 390, height: 844 },
  { name: 'Mobile-375', width: 375, height: 667 },
];

async function main() {
  console.log('================================================================');
  console.log('🚀 SMMFLUX DEEP VISUAL & AST AUDIT SUITE');
  console.log('================================================================\n');

  // Step 1: AST Layout Audit
  console.log('--- 1. AST Layout Analysis ---');
  const astFindings = scanComponentFiles(FLUX_DIRS);
  console.log(`AST scan found ${astFindings.length} layout findings.\n`);
  astFindings.forEach((f, idx) => {
    console.log(`[AST #${idx + 1}] [${f.severity}] ${f.type} in ${f.file}:${f.line}`);
    console.log(`  Snippet: ${f.snippet}`);
    console.log(`  Fix: ${f.remediation}\n`);
  });

  // Step 2: Headless Playwright Visual Inspection & Screenshots
  console.log('\n--- 2. Playwright Visual & Viewport Audit ---');
  const screenshotDir = path.resolve(process.cwd(), 'artifacts/flux-audit/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const visualBugs: VisualAuditBug[] = [];

  for (const route of FLUX_ROUTES) {
    console.log(`\n🔍 Checking Page: ${route.name} (${route.path})`);

    for (const vp of VIEWPORTS) {
      for (const theme of ['light', 'dark'] as const) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: theme,
        });

        // Set cookies for tenant
        await context.addCookies([
          { name: 'x_admin_tenant', value: 'flux', domain: 'localhost', path: '/' },
          { name: 'smmplan_tenant', value: 'flux', domain: 'localhost', path: '/' },
        ]);

        const page = await context.newPage();

        try {
          const fullUrl = `http://localhost:3000${route.path}`;
          await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          
          // Toggle dark mode class if dark
          if (theme === 'dark') {
            await page.evaluate(() => document.documentElement.classList.add('dark'));
          } else {
            await page.evaluate(() => document.documentElement.classList.remove('dark'));
          }
          await page.waitForTimeout(500);

          // Save screenshot
          const sanitizedName = route.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const screenshotFile = path.join(
            screenshotDir,
            `${sanitizedName}_${vp.name}_${theme}.png`
          );
          await page.screenshot({ path: screenshotFile, fullPage: false });

          // Check 1: Real Horizontal Overflow (Page scrollWidth > clientWidth)
          const overflowBugs = await page.evaluate((winW) => {
            const bugs: any[] = [];
            const pageScrollW = document.documentElement.scrollWidth;
            if (pageScrollW <= winW + 3) {
              return []; // No actual horizontal scrollbar / page overflow!
            }

            const isClipped = (node: Element | null): boolean => {
              if (!node || node === document.body || node === document.documentElement) return false;
              const style = window.getComputedStyle(node);
              if (
                style.overflow === 'hidden' || 
                style.overflowX === 'hidden' || 
                style.overflowX === 'clip' || 
                style.contain?.includes('paint') ||
                node.classList.contains('overflow-hidden') ||
                node.classList.contains('overflow-x-clip') ||
                node.getAttribute('aria-hidden') === 'true'
              ) {
                return true;
              }
              return isClipped(node.parentElement);
            };

            const elements = document.querySelectorAll('body *');
            elements.forEach((el) => {
              if (['SCRIPT', 'STYLE', 'DEFS', 'PATH', 'G', 'SYMBOL'].includes(el.tagName)) return;
              if (isClipped(el) || el.classList.contains('overflow-x-auto') || el.closest('.overflow-x-auto')) return;
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) return;
              if (rect.right > winW + 3) {
                bugs.push({
                  selector: `${el.tagName.toLowerCase()}.${Array.from(el.classList).slice(0, 3).join('.')}`,
                  textSnippet: (el.textContent || '').trim().slice(0, 40),
                  details: `Right edge (${Math.round(rect.right)}px) causes horizontal scroll (page scrollWidth: ${pageScrollW}px > ${winW}px)`,
                });
              }
            });
            return bugs.slice(0, 3);
          }, vp.width);

          overflowBugs.forEach((b: any) => {
            visualBugs.push({
              category: 'OVERFLOW_SCREEN',
              page: route.name,
              viewport: vp.name,
              theme,
              selector: b.selector,
              textSnippet: b.textSnippet,
              details: b.details,
            });
          });

          // Check 2: Brand Leaks (Check for "SMMplan" texts leaking into SMMflux)
          const brandLeaks = await page.evaluate(() => {
            const leaks: any[] = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
              const text = node.textContent || '';
              // Exclude legal / copyright if allowed, or find inappropriate leaks
              if (text.includes('SMMplan') && !text.includes('smmplan.pro') && !node.parentElement?.closest('footer')) {
                leaks.push({
                  selector: node.parentElement?.tagName.toLowerCase() || 'unknown',
                  textSnippet: text.trim().slice(0, 50),
                  details: 'SMMplan brand name leaked in SMMflux interface',
                });
              }
            }
            return leaks.slice(0, 3);
          });

          brandLeaks.forEach((b: any) => {
            visualBugs.push({
              category: 'BRAND_LEAK',
              page: route.name,
              viewport: vp.name,
              theme,
              selector: b.selector,
              textSnippet: b.textSnippet,
              details: b.details,
            });
          });

          // Check 3: Check wizard steps if on Home page
          if (route.path === '/?tenant=flux' && vp.name === 'Desktop-1440' && theme === 'light') {
            const openCatalogBtn = await page.$('[data-testid="flux-open-catalog-btn"]');
            if (openCatalogBtn) {
              await openCatalogBtn.click();
              await page.waitForTimeout(700);
              await page.screenshot({ path: path.join(screenshotDir, 'home_step_network_desktop_light.png') });
              
              // Click Telegram network card to go to category
              const tgBtn = page.locator('button').filter({ hasText: 'Telegram' }).first();
              if (await tgBtn.count() > 0) {
                await tgBtn.click();
                await page.waitForTimeout(700);
                await page.screenshot({ path: path.join(screenshotDir, 'home_step_category_desktop_light.png') });

                // Click first category (e.g. Подписчики)
                const firstCat = page.locator('[role="button"]').first();
                if (await firstCat.count() > 0) {
                  await firstCat.click();
                  await page.waitForTimeout(700);
                  await page.screenshot({ path: path.join(screenshotDir, 'home_step_service_desktop_light.png') });

                  // Click first service
                  const firstSrv = page.locator('[role="button"]').first();
                  if (await firstSrv.count() > 0) {
                    await firstSrv.click();
                    await page.waitForTimeout(700);
                    await page.screenshot({ path: path.join(screenshotDir, 'home_step_checkout_desktop_light.png') });
                  }
                }
              }
            }
          }

        } catch (err: any) {
          console.error(`  ❌ Error testing ${route.name} on ${vp.name} (${theme}): ${err.message}`);
        } finally {
          await context.close();
        }
      }
    }
  }

  await browser.close();

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    totalAstFindings: astFindings.length,
    astFindings,
    totalVisualBugs: visualBugs.length,
    visualBugs,
  };

  const reportPath = path.resolve(process.cwd(), 'docs/audits/flux-visual-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('\n================================================================');
  console.log(`🏁 AUDIT FINISHED: ${astFindings.length} AST findings, ${visualBugs.length} visual bugs detected.`);
  console.log(`📊 Report saved to: docs/audits/flux-visual-audit-report.json`);
  console.log(`🖼️ Screenshots saved to: artifacts/flux-audit/screenshots/`);
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
