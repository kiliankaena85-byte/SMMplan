/**
 * (c) 2026 SMMplan & OmniSMM 1.0.
 * End-to-End Browser Visual & Layout Auditor Harness for the Admin Panel.
 *
 * Capabilities:
 * 1. Genuine Authentication: Creates DB Session record in PostgreSQL + signed HS256 JWT
 *    matching src/lib/session.ts and src/lib/session-edge.ts.
 * 2. Deterministic Seeding: Ingests fixed-CUID fixtures from scripts/ci/seed-admin-audit-fixtures.ts.
 * 3. Multi-Viewport Matrix:
 *    - Desktop: 1280x800
 *    - Tablet:  768x1024
 *    - Mobile:  375x812
 * 4. Zero Horizontal Scroll Detector: Flags scrollWidth > clientWidth.
 * 5. Clipped Table Cell Sentry: Detects clipped table cells without title or tooltip.
 * 6. React 19 Hydration & Server Action Guard: Intercepts console errors (418, 425, action crashes).
 * 7. Tenant Cookie Persistence: Verifies x_admin_tenant persistence across navigations.
 * 8. Markdown & JSON Audit Reporting: Outputs to docs/audits/admin-harness-audit.*
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { SignJWT } from 'jose';
import { getEncodedKey } from '../src/lib/session-edge';
import {
  seedAdminAuditFixtures,
  AUDIT_FIXTURES,
  prisma,
  resolveAuditDatabaseUrl,
} from './ci/seed-admin-audit-fixtures';

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
  isMobile?: boolean;
}

export const AUDIT_VIEWPORTS: ViewportConfig[] = [
  { name: 'Desktop (1280x800)', width: 1280, height: 800 },
  { name: 'Tablet (768x1024)', width: 768, height: 1024, isMobile: true },
  { name: 'Mobile (375x812)', width: 375, height: 812, isMobile: true },
  { name: 'Mobile (390x844)', width: 390, height: 844, isMobile: true },
];

export interface RouteAuditResult {
  route: string;
  viewport: string;
  status: number;
  durationMs: number;
  horizontalOverflow: {
    hasOverflow: boolean;
    scrollWidth: number;
    clientWidth: number;
    delta: number;
  };
  clippedCells: {
    tag: string;
    text: string;
    scrollWidth: number;
    offsetWidth: number;
  }[];
  headerIssues?: string[];
  tabCollisions?: string[];
  errorBoundary?: string | null;
  consoleErrors: string[];
  hydrationMismatches: string[];
  serverActionErrors: string[];
  passed: boolean;
}

export interface AdminHarnessReport {
  timestamp: string;
  baseUrl: string;
  totalRoutesAudited: number;
  viewportsCount: number;
  passedTests: number;
  failedTests: number;
  tenantPersistenceVerified: boolean;
  results: RouteAuditResult[];
  summary: {
    horizontalOverflowCount: number;
    clippedCellsCount: number;
    headerIssuesCount: number;
    tabCollisionsCount: number;
    errorBoundaryCount: number;
    hydrationMismatchesCount: number;
    serverActionCrashesCount: number;
  };
}

export async function checkServerReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) });
    return res.status < 500;
  } catch {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      return res.status < 500;
    } catch {
      return false;
    }
  }
}

export async function detectBaseUrl(): Promise<string> {
  const envUrl = process.env.ADMIN_AUDIT_URL || process.env.PLAYWRIGHT_TEST_BASE_URL;
  if (envUrl && (await checkServerReachable(envUrl))) {
    return envUrl;
  }

  const candidatePorts = [3000, 3005, 3001];
  for (const port of candidatePorts) {
    const testUrl = `http://127.0.0.1:${port}`;
    if (await checkServerReachable(testUrl)) {
      return testUrl;
    }
  }

  return 'http://127.0.0.1:3000';
}

export const AUDIT_USER_AGENT = 'Playwright-Admin-Audit-Harness/2026';

export async function createAdminAuthSession(adminUserId: string): Promise<{ sessionToken: string; sessionId: string }> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const session = await prisma.session.create({
    data: {
      userId: adminUserId,
      expiresAt,
      userAgent: AUDIT_USER_AGENT,
      ipAddress: '127.0.0.1',
    },
  });

  const sessionToken = await new SignJWT({
    sessionId: session.id,
    userId: adminUserId,
    canResetPassword: false,
    tenantId: 'smmplan',
    contour: 'test',
    sessionVer: 1,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getEncodedKey());

  return { sessionToken, sessionId: session.id };
}

export async function runAdminLayoutAudit(options?: {
  baseUrl?: string;
  headless?: boolean;
  routesFilter?: string[];
}): Promise<AdminHarnessReport> {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🛡️  OmniSMM 1.0 — Production-Grade Admin Panel Layout & Visual Auditor');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // 1. Seed deterministic fixtures with fixed CUIDs
  const fixtures = await seedAdminAuditFixtures();
  const routesToTest = options?.routesFilter || Object.values(fixtures.urls);

  // 2. Discover running server
  const baseUrl = options?.baseUrl || (await detectBaseUrl());
  console.log(`🌐 Target Base URL: ${baseUrl}`);
  const isOnline = await checkServerReachable(baseUrl);
  if (!isOnline) {
    throw new Error(
      `FATAL: Target server at ${baseUrl} is unreachable. Ensure Next.js is running (e.g., 'npm run dev' or container :3000/:3005) before executing the audit harness.`
    );
  }

  // 3. Create genuine DB Session & JWT
  const { sessionToken, sessionId } = await createAdminAuthSession(fixtures.adminUserId);
  console.log(`🔑 Genuine Auth Session created: ID=${sessionId.slice(0, 10)}... (JWT Signed HS256)\n`);

  // 4. Launch Playwright browser
  let browser: Browser;
  try {
    browser = await chromium.launch({ headless: options?.headless ?? true, channel: 'chrome' });
  } catch {
    browser = await chromium.launch({ headless: options?.headless ?? true });
  }

  const results: RouteAuditResult[] = [];
  let tenantPersistenceVerified = false;

  try {
    const context = await browser.newContext({
      userAgent: AUDIT_USER_AGENT,
    });

    // Configure genuine auth and tenant cookies
    const isHttps = baseUrl.startsWith('https://');
    const authCookies: Parameters<typeof context.addCookies>[0] = [
      {
        name: 'session_token',
        value: sessionToken,
        url: baseUrl,
        httpOnly: true,
        sameSite: 'Lax',
      },
      {
        name: 'cookie_consent',
        value: 'true',
        url: baseUrl,
        httpOnly: false,
        sameSite: 'Lax',
      },
      {
        name: 'x_admin_tenant',
        value: 'smmplan',
        url: baseUrl,
        httpOnly: false,
        sameSite: 'Lax',
      },
    ];

    if (isHttps) {
      authCookies.push({
        name: '__Host-session_token',
        value: sessionToken,
        url: baseUrl,
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      });
    }

    await context.addCookies(authCookies);

    const page = await context.newPage();

    // 5. Verify Tenant Cookie Persistence (x_admin_tenant)
    console.log('🔄 [Tenant Guard] Verifying x_admin_tenant cookie persistence across navigation...');
    await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    const initialCookies = await context.cookies(baseUrl);
    const tenantCookie = initialCookies.find((c) => c.name === 'x_admin_tenant');

    if (tenantCookie && tenantCookie.value === 'smmplan') {
      // Switch tenant to 'flux' and verify preservation
      await context.addCookies([{ name: 'x_admin_tenant', value: 'flux', url: baseUrl }]);
      await page.goto(`${baseUrl}/admin/orders`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      const switchedCookies = await context.cookies(baseUrl);
      const switchedTenant = switchedCookies.find((c) => c.name === 'x_admin_tenant');
      if (switchedTenant && switchedTenant.value === 'flux') {
        tenantPersistenceVerified = true;
        console.log('   ✓ Tenant cookie persistence verified: successfully retains active tenant selection.');
      }
    }
    // Restore primary tenant for the audit
    await context.addCookies([{ name: 'x_admin_tenant', value: 'smmplan', url: baseUrl }]);

    // 6. Traverse Admin Routes Across All Viewports
    console.log(`\n📐 Running matrix inspection: ${routesToTest.length} routes x ${AUDIT_VIEWPORTS.length} viewports...\n`);

    for (const route of routesToTest) {
      const targetUrl = `${baseUrl}${route}`;
      console.log(`🔹 Auditing route: ${route}`);

      for (const vp of AUDIT_VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        const consoleErrors: string[] = [];
        const hydrationMismatches: string[] = [];
        const serverActionErrors: string[] = [];

        const consoleHandler = (msg: any) => {
          const text = msg.text();
          const type = msg.type();
          if (type === 'error' || text.includes('Error:') || text.includes('Hydration failed')) {
            consoleErrors.push(text);
          }
          if (
            text.includes('418') ||
            text.includes('425') ||
            text.includes('Hydration failed') ||
            text.includes('Text content does not match') ||
            text.includes('did not match')
          ) {
            hydrationMismatches.push(text);
          }
          if (text.includes('An unexpected response was received from the server')) {
            serverActionErrors.push(text);
          }
        };

        page.on('console', consoleHandler);

        const startTime = Date.now();
        let status = 200;

        try {
          const resp = await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });
          status = resp?.status() || 200;
        } catch (navErr: any) {
          status = 500;
          consoleErrors.push(`Navigation failed: ${navErr.message}`);
        }

        const currentUrl = page.url();
        if (
          currentUrl.includes('/login') ||
          currentUrl.includes('/dashboard/new-order') ||
          currentUrl.includes('/forbidden')
        ) {
          status = 401;
          consoleErrors.push(`Auth check failed: unexpected redirect to ${currentUrl}`);
        }

        // Wait brief settling time for client-side hydrations/tables
        await page.waitForTimeout(300);

        // A. Viewport & Container Zero Horizontal Scroll Audit
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(doc ? doc.scrollWidth : 0, body ? body.scrollWidth : 0);
          const clientWidth = Math.max(doc ? doc.clientWidth : 0, window.innerWidth);
          let isOverflowing = scrollWidth > clientWidth + 3;
          let delta = isOverflowing ? scrollWidth - clientWidth : 0;

          // Check header internal overflow
          const header = document.querySelector('header');
          if (header && header.scrollWidth > header.clientWidth + 2) {
            isOverflowing = true;
            delta = Math.max(delta, header.scrollWidth - header.clientWidth);
          }

          return {
            hasOverflow: isOverflowing,
            scrollWidth: Math.max(scrollWidth, header ? header.scrollWidth : 0),
            clientWidth,
            delta,
          };
        });

        // B. Header Clipping, Tab Collisions & Error Boundary Sentry
        const layoutDefects = await page.evaluate(() => {
          const headerIssues: string[] = [];
          const tabCollisions: string[] = [];

          // 1. Header scrollWidth and offscreen button/link check
          const header = document.querySelector('header');
          if (header) {
            if (header.scrollWidth > header.clientWidth + 2) {
              headerIssues.push(`Header scrollWidth exceeds clientWidth by ${header.scrollWidth - header.clientWidth}px (${header.scrollWidth}px > ${header.clientWidth}px)`);
            }
            const buttons = Array.from(header.querySelectorAll('button, a'));
            for (const b of buttons) {
              const r = b.getBoundingClientRect();
              if (r.right > window.innerWidth + 2) {
                const text = (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 25);
                headerIssues.push(`Button/link "${text}" offscreen right (${Math.round(r.right)}px > ${window.innerWidth}px)`);
              }
            }
          }

          // 2. TabsList collision and stamping check
          const tabsLists = Array.from(document.querySelectorAll('[data-slot="tabs-list"], .tabs-list'));
          for (const tl of tabsLists) {
            const tlEl = tl as HTMLElement;
            const tlRect = tlEl.getBoundingClientRect();
            const triggers = Array.from(tlEl.querySelectorAll('[data-slot="tabs-trigger"], button'));

            for (const tr of triggers) {
              const trRect = (tr as HTMLElement).getBoundingClientRect();
              if (trRect.bottom > tlRect.bottom + 2 && !tlEl.classList.contains('overflow-y-auto')) {
                tabCollisions.push(`Tab trigger "${(tr.textContent || '').trim().slice(0, 20)}" overflows TabsList bottom (${Math.round(trRect.bottom)}px > ${Math.round(tlRect.bottom)}px)`);
                break;
              }
            }

            const tc = document.querySelector('[data-slot="tabs-content"]');
            if (tc) {
              const tcRect = tc.getBoundingClientRect();
              for (const tr of triggers) {
                const trRect = (tr as HTMLElement).getBoundingClientRect();
                if (trRect.bottom > tcRect.top + 2) {
                  tabCollisions.push(`Tab trigger overlaps TabsContent by ${Math.round(trRect.bottom - tcRect.top)}px`);
                  break;
                }
              }
            }
          }

          // 3. Error boundary detection
          let errorBoundary: string | null = null;
          const bodyText = document.body ? document.body.innerText : '';
          if (bodyText.includes('Раздел временно недоступен')) {
            const match = bodyText.match(/Раздел временно недоступен[^\n]*/);
            errorBoundary = match ? match[0] : 'Раздел временно недоступен';
          } else if (bodyText.includes('Что-то пошло не так') && bodyText.includes('Ошибка')) {
            errorBoundary = 'Что-то пошло не так (Error Boundary crash)';
          }

          return { headerIssues, tabCollisions, errorBoundary };
        });

        // C. Clipped Table Cells & Data Density Audit
        const clippedCells = await page.evaluate(() => {
          const elements = Array.from(
            document.querySelectorAll('td, th, [role="cell"], [role="columnheader"], .table-cell')
          );
          const list: { tag: string; text: string; scrollWidth: number; offsetWidth: number }[] = [];

          for (const el of elements) {
            const htmlEl = el as HTMLElement;
            if (htmlEl.scrollWidth > htmlEl.offsetWidth + 2) {
              const hasTitle = Boolean(htmlEl.getAttribute('title') || htmlEl.querySelector('[title]'));
              const hasTooltip = Boolean(
                htmlEl.getAttribute('aria-label') ||
                  htmlEl.querySelector('[aria-label]') ||
                  htmlEl.closest('[data-tooltip]') ||
                  htmlEl.querySelector('[data-tooltip]')
              );
              if (!hasTitle && !hasTooltip) {
                list.push({
                  tag: htmlEl.tagName.toLowerCase(),
                  text: (htmlEl.innerText || htmlEl.textContent || '').trim().slice(0, 50),
                  scrollWidth: htmlEl.scrollWidth,
                  offsetWidth: htmlEl.offsetWidth,
                });
              }
            }
          }
          return list;
        });

        page.off('console', consoleHandler);

        const durationMs = Date.now() - startTime;
        const hasCriticalErrors =
          status >= 400 ||
          overflow.hasOverflow ||
          layoutDefects.headerIssues.length > 0 ||
          layoutDefects.tabCollisions.length > 0 ||
          Boolean(layoutDefects.errorBoundary) ||
          hydrationMismatches.length > 0 ||
          serverActionErrors.length > 0;

        const result: RouteAuditResult = {
          route,
          viewport: vp.name,
          status,
          durationMs,
          horizontalOverflow: overflow,
          clippedCells,
          headerIssues: layoutDefects.headerIssues,
          tabCollisions: layoutDefects.tabCollisions,
          errorBoundary: layoutDefects.errorBoundary,
          consoleErrors,
          hydrationMismatches,
          serverActionErrors,
          passed: !hasCriticalErrors,
        };

        results.push(result);

        const mark = result.passed ? '✓' : '✗';
        const overflowNotice = overflow.hasOverflow ? ` [OVERFLOW +${overflow.delta}px]` : '';
        const headerNotice = layoutDefects.headerIssues.length > 0 ? ` [HEADER CLIPPED]` : '';
        const tabNotice = layoutDefects.tabCollisions.length > 0 ? ` [TAB COLLISION]` : '';
        const boundaryNotice = layoutDefects.errorBoundary ? ` [CRASH: ${layoutDefects.errorBoundary}]` : '';
        const hydrationNotice = hydrationMismatches.length > 0 ? ` [HYDRATION MISMATCH]` : '';
        console.log(`   ${mark} [${vp.name}] status=${status} (${durationMs}ms)${overflowNotice}${headerNotice}${tabNotice}${boundaryNotice}${hydrationNotice}`);
      }
    }

    await page.close();
    await context.close();
  } finally {
    await browser.close();
  }

  // 7. Aggregate Findings & Report Generation
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;
  const horizontalOverflowCount = results.filter((r) => r.horizontalOverflow.hasOverflow).length;
  const clippedCellsCount = results.reduce((acc, r) => acc + r.clippedCells.length, 0);
  const headerIssuesCount = results.reduce((acc, r) => acc + (r.headerIssues?.length || 0), 0);
  const tabCollisionsCount = results.reduce((acc, r) => acc + (r.tabCollisions?.length || 0), 0);
  const errorBoundaryCount = results.filter((r) => Boolean(r.errorBoundary)).length;
  const hydrationMismatchesCount = results.reduce((acc, r) => acc + r.hydrationMismatches.length, 0);
  const serverActionCrashesCount = results.reduce((acc, r) => acc + r.serverActionErrors.length, 0);

  const report: AdminHarnessReport = {
    timestamp: new Date().toISOString(),
    baseUrl,
    totalRoutesAudited: routesToTest.length,
    viewportsCount: AUDIT_VIEWPORTS.length,
    passedTests,
    failedTests,
    tenantPersistenceVerified,
    results,
    summary: {
      horizontalOverflowCount,
      clippedCellsCount,
      headerIssuesCount,
      tabCollisionsCount,
      errorBoundaryCount,
      hydrationMismatchesCount,
      serverActionCrashesCount,
    },
  };

  const outDir = path.resolve(process.cwd(), 'docs/audits');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const jsonPath = path.join(outDir, 'admin-harness-audit.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  const mdPath = path.join(outDir, 'admin-harness-audit.md');
  fs.writeFileSync(mdPath, generateMarkdownReport(report), 'utf8');

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`🎯 AUDIT COMPLETE: ${passedTests}/${results.length} checks passed.`);
  console.log(`   - Horizontal Overflows:   ${horizontalOverflowCount}`);
  console.log(`   - Header Clippings:       ${headerIssuesCount}`);
  console.log(`   - Tab Collisions:         ${tabCollisionsCount}`);
  console.log(`   - Error Boundaries:       ${errorBoundaryCount}`);
  console.log(`   - Clipped Cells:          ${clippedCellsCount}`);
  console.log(`   - Hydration Mismatches:   ${hydrationMismatchesCount}`);
  console.log(`   - Server Action Crashes:  ${serverActionCrashesCount}`);
  console.log(`   - Tenant Cookie Verified: ${tenantPersistenceVerified ? 'YES' : 'NO'}`);
  console.log(`📄 Reports saved to: ${mdPath}\n`);

  return report;
}

function generateMarkdownReport(report: AdminHarnessReport): string {
  const isClean = report.failedTests === 0;
  const badge = isClean ? '🟢 PASS' : '🔴 DEFECTS DETECTED';

  return `# 🛡️ Admin Panel E2E Layout & Visual Audit Report

**Date:** ${new Date(report.timestamp).toLocaleString('ru-RU')}  
**Base URL:** \`${report.baseUrl}\`  
**Verdict:** **${badge}** (${report.passedTests}/${report.results.length} passed)  
**Tenant Cookie Persistence:** ${report.tenantPersistenceVerified ? '✅ Verified (`x_admin_tenant`)' : '⚠️ Failed'}

---

## 📊 Summary Metrics

| Metric | Value | Status |
|---|---|---|
| Total Routes Checked | **${report.totalRoutesAudited}** | ✅ Complete |
| Viewports Tested | **${report.viewportsCount}** (Desktop, Tablet, Mobile 375, Mobile 390) | ✅ Matrix |
| Horizontal Scroll Breakages | **${report.summary.horizontalOverflowCount}** | ${report.summary.horizontalOverflowCount === 0 ? '🟢 Clean' : '🔴 Overflow'} |
| Header Clipping / Overflow | **${report.summary.headerIssuesCount}** | ${report.summary.headerIssuesCount === 0 ? '🟢 Clean' : '🔴 Clipped'} |
| Tab Collisions & Stamping | **${report.summary.tabCollisionsCount}** | ${report.summary.tabCollisionsCount === 0 ? '🟢 Clean' : '🔴 Collision'} |
| Error Boundary Crashes | **${report.summary.errorBoundaryCount}** | ${report.summary.errorBoundaryCount === 0 ? '🟢 Clean' : '🔴 Error'} |
| Clipped Data Cells | **${report.summary.clippedCellsCount}** | ${report.summary.clippedCellsCount === 0 ? '🟢 Zero Clipping' : '🟡 Warning'} |
| React 19 Hydration Mismatches | **${report.summary.hydrationMismatchesCount}** | ${report.summary.hydrationMismatchesCount === 0 ? '🟢 Clean' : '🔴 Mismatch'} |
| Server Action Crashes | **${report.summary.serverActionCrashesCount}** | ${report.summary.serverActionCrashesCount === 0 ? '🟢 Clean' : '🔴 Crash'} |

---

## 📋 Inspection Matrix Details

| Route | Viewport | Status | Time | Horizontal Scroll | Header | Tabs | Error Boundary |
|---|---|---|---|---|---|---|---|
${report.results
  .map(
    (r) =>
      `| \`${r.route}\` | ${r.viewport} | ${r.status} | ${r.durationMs}ms | ${
        r.horizontalOverflow.hasOverflow ? `🔴 +${r.horizontalOverflow.delta}px` : '🟢 0px'
      } | ${
        r.headerIssues && r.headerIssues.length > 0 ? `🔴 ${r.headerIssues.length} issues` : '🟢 OK'
      } | ${
        r.tabCollisions && r.tabCollisions.length > 0 ? `🔴 ${r.tabCollisions.length} collisions` : '🟢 OK'
      } | ${
        r.errorBoundary ? `🔴 Crash: ${r.errorBoundary.slice(0, 30)}` : '🟢 OK'
      } |`
  )
  .join('\n')}

---

## 🔍 Detailed Findings & Defect Diagnostics

${
  report.results.filter((r) => !r.passed || r.clippedCells.length > 0).length === 0
    ? '_No defects found! All admin panel views meet responsive density and layout invariants._'
    : report.results
        .filter((r) => !r.passed || r.clippedCells.length > 0)
        .map(
          (r, idx) => `
### #${idx + 1} Route: \`${r.route}\` [${r.viewport}]
- **HTTP Status:** ${r.status}
- **Horizontal Overflow:** ${r.horizontalOverflow.hasOverflow ? `Yes (+${r.horizontalOverflow.delta}px overflow)` : 'No'}
${r.headerIssues && r.headerIssues.length > 0 ? `- **Header Issues:**\n${r.headerIssues.map((hi) => `  - ${hi}`).join('\n')}` : ''}
${r.tabCollisions && r.tabCollisions.length > 0 ? `- **Tab Collisions:**\n${r.tabCollisions.map((tc) => `  - ${tc}`).join('\n')}` : ''}
${r.errorBoundary ? `- **Error Boundary Crash:** \`${r.errorBoundary}\`` : ''}
- **Clipped Cells:** ${r.clippedCells.length}
${r.clippedCells.map((c) => `  - \`<${c.tag}>\`: "${c.text}" (scrollWidth=${c.scrollWidth}px > offsetWidth=${c.offsetWidth}px)`).join('\n')}
${r.hydrationMismatches.length > 0 ? `- **Hydration Errors:**\n${r.hydrationMismatches.map((h) => `  - \`${h}\``).join('\n')}` : ''}
${r.serverActionErrors.length > 0 ? `- **Server Action Crashes:**\n${r.serverActionErrors.map((s) => `  - \`${s}\``).join('\n')}` : ''}
`
        )
        .join('\n')
}
`;
}

if (require.main === module) {
  runAdminLayoutAudit()
    .catch((err) => {
      console.error('Fatal auditor failure:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
