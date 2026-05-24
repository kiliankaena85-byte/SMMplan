# Implementation Plan: Stage 4 Hardening Milestone 5 (R5: Visual QA Script & E2E Tests)

This document outlines the step-by-step procedure to implement Visual QA comparisons and E2E regression testing under high-security and strict data-consistency controls.

---

## 1. Task Definition & Scope
- **Mission**: Implement visual regression protection for the 7 key admin pages of the Smmplan platform.
- **Objectives**:
  1. Add dependencies: `pixelmatch`, `pngjs`, and their `@types/` equivalents.
  2. Implement `scripts/visual-qa.js`: Standalone JWT authentication, screenshot capture, baseline comparison, and Russian console feedback.
  3. Implement `e2e/visual-regression.spec.ts`: Native Playwright E2E visual tests with dynamic content masking.
  4. Integrate scripts in `package.json`.
  5. Verify the compilation (`tsc --noEmit`), build (`npm run build`), and execution of all QA checks.

---

## 2. 5 Vectors of Reliability Analysis (Double-Pass Auditing)

### A. Архитектурный стык (Server/Client Boundaries & Auth Integration)
- **Problem**: Testing the admin panel requires high-level session state (`OWNER`). 
- **Solution**: The E2E tests and standalone script must generate JWTs perfectly aligned with `src/lib/session.ts` crypto requirements. We will register a temporary session row in the PostgreSQL database via Prisma for the user `e2e-tester@test.com` with `'OWNER'` role, and serialize/inject the signed cookie so middleware and API endpoints recognize the session as fully valid.

### B. Хаос и пустота (Cold Start / Empty State Protection)
- **Problem**: In a clean testing environment (e.g. CI or fresh DB), some admin panels like `/admin/orders` or `/admin/tickets` will be completely empty. A blank table or missing elements might differ from visual baseline screenshots taken on populated environments.
- **Solution**: Both the standalone script and the Playwright spec must perform lightweight seeding of vital records (a test user, a ticket with messages, an active/quarantined service) prior to taking the screenshot. Also, dynamic lists are masked.

### C. Visual & UX Density (Responsive & Design Consistency)
- **Problem**: Viewports, pixel ratio differences, and CSS transitions (like fading toasts, rotating loaders, or active tooltips) can produce false visual diff failures.
- **Solution**: 
  - Standardize viewport sizes: strict `1280x800` desktop resolution, device scale factor `1`.
  - Wait for page idle (`networkidle`, no ongoing animations) before taking screenshots.
  - Inject CSS styles inside Playwright context to suppress animated loaders, spinners, blinking cursors, and custom transitions (`transition: none !important; animation: none !important;`).

### D. Доступность WCAG 2.2 AA (Accessibility & Masking targets)
- **Problem**: Masking text blocks could block important accessibility structures, causing tests to lose relevance.
- **Solution**: Playwright's `toHaveScreenshot({ mask: [...] })` covers the bounding box visually, but does not alter the underlying DOM accessibility tree. This allows us to keep the standard accessible markers intact.

### E. Security & Trust (Trust Boundaries)
- **Problem**: Exposing test secrets or leaking session tokens.
- **Solution**: 
  - JWT secret falls back strictly to `'fallback-secret-for-dev-only-v2'` only in dev/test setups and is otherwise loaded directly from environment.
  - The created E2E database records use mock patterns (`e2e-tester@test.com`, distinct prefixes) that can be easily purged by the project's teardown scripts.

---

## 3. Pre-Mortem Failure Simulation

| Hypothetical Production/Test Failure Scenario | Root Cause in Software / Environment | Proactive Mitigation Mechanism |
|---|---|---|
| **Scenario 1: False positive visual failure on the Dashboard due to shifting charts.** | Recharts responsive canvas rendering has minor timing anomalies depending on layout engine speeds, changing numbers of orders, and active dates. | Inject custom CSS inside the page context to hide `.recharts-responsive-container` and other SVG charts before screenshot capture. |
| **Scenario 2: Standalone visual comparison fails due to inconsistent sub-pixel rendering or platform-dependent fonts.** | Anti-aliasing differences on Windows vs Linux (CI environments) or slight browser version differences create sub-pixel variations. | Keep viewport and device scale factors matching exactly, set a standard `pixelmatch` sensitivity/threshold (`threshold: 0.1`), and set the ratio ceiling strictly at 1% of total pixels. |
| **Scenario 3: DB session validation fails during E2E run.** | The DB session is deleted, expired, or user properties like `isActive` are disabled, resulting in redirection to the `/login` page instead of admin views. | Dynamically ensure the test user's status (`isActive: true`, `isDeleted: false`, `role: 'OWNER'`) is upserted, and the DB session expiration time is set 7 days in the future prior to each test group run. |

---

## 4. Implementation Steps

### Step 1: Install Dependencies
- Run `npm install --save-dev pixelmatch pngjs @types/pixelmatch @types/pngjs`.

### Step 2: Implement Standalone `scripts/visual-qa.js`
- Set up dotenv environment variables.
- Connect Prisma.
- Upsert `e2e-tester@test.com` with `OWNER` role.
- Generate valid session and session JWT token.
- Launch Chromium using Playwright.
- Navigate to the 7 key admin pages and take screenshots at `1280x800`.
- Save screenshots under `.planning/screenshots/`.
- If `--compare` is passed:
  - Verify baseline exists at `.planning/screenshots/baseline/`.
  - Compare using `pixelmatch` and write diff images to `diff_...`.
  - Calculate mismatched ratio. If >1% (0.01), flag errors, log Russian summary, and exit with code `1`.
  - Otherwise, exit with code `0`.
- Disconnect Prisma securely.

### Step 3: Implement Playwright `e2e/visual-regression.spec.ts`
- Write an E2E spec covering the 7 admin pages.
- Reuse `auth.setup.ts` to log in.
- Inject masks for dynamic elements: charts, dynamic lists, timestamps, balance values, etc.
- Verify through Playwright's `expect(page).toHaveScreenshot()` with `maxDiffPixelRatio: 0.01`.

### Step 4: Add package.json Scripts
- Add `visual-qa`
- Add `visual-qa:compare`
- Add `test:visual`

### Step 5: Verification & Production Safety Checks
- Run typecheck `npx tsc --noEmit`.
- Run production build `npm run build`.
- Execute `npm run visual-qa` to capture baseline.
- Execute `npm run visual-qa:compare` to verify comparison works.
- Execute `npm run test:visual` to ensure Playwright tests are passing.
