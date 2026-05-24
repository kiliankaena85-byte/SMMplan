# Changes Made — Stage 4 Hardening Milestone 5

## Summary of Changes

We have implemented visual QA safeguards and comprehensive regression test suites for the 7 key admin panels:
1. Dashboard (`/admin/dashboard`)
2. Orders (`/admin/orders`)
3. Services (`/admin/catalog`)
4. Providers (`/admin/providers`)
5. Clients (`/admin/clients`)
6. Support Chat (`/admin/tickets`)
7. Settings (`/admin/settings`)

### 1. Dependencies Added (`package.json`)
- Added `pixelmatch` (for pixel-by-pixel image diffing).
- Added `pngjs` (for loading, writing, and parsing PNG screenshots in Node).
- Added `@types/pixelmatch` and `@types/pngjs` for robust TypeScript support in scripts.

### 2. Standalone Visual QA Script (`scripts/visual-qa.js`)
- Implemented a complete visual regression harness:
  - Connects to Prisma and seeds necessary mock rows (owner, ticket, quarantine service, orders) to ensure rich interface renders on cold starts.
  - Dynamically registers a database session for a mock OWNER `e2e-tester@test.com`.
  - Signs a genuine JWT token using `jose` with the project's `JWT_SECRET`.
  - Spawns a Chromium browser via Playwright, injects the cookie, and navigates to the 7 admin pages.
  - Injects a strict custom CSS style block before screenshot capture to hide all dynamic content (recharts container, numbers, dates, UUIDs) and disable animations/transitions.
  - Saves screen captures under `.planning/screenshots/<name>_desktop.png`.
  - Implements the `--compare` mode using `pixelmatch` to compare captures against baseline expectations (`.planning/screenshots/baseline/...`), writes pixel diff PNG images, and fails (with Russian error log and exit code 1) if differences exceed 1%.
  - Implements `--baseline` argument to easily record baseline snapshots.

### 3. Native E2E Playwright Visual Regression Spec (`e2e/visual-regression.spec.ts`)
- Implemented standard Playwright E2E visual tests:
  - Hooks into database-level seeding during `beforeAll`.
  - Leverages standard Playwright `toHaveScreenshot` with a strict `maxDiffPixelRatio: 0.01` limit.
  - Automatically masks dynamic DOM nodes (SVG charts, table CUID IDs, timestamps, balance displays) to prevent false positives.

### 4. Integration Scripts (`package.json`)
- `"visual-qa"`: Runs the screenshot capture using `tsx`.
- `"visual-qa:compare"`: Runs screenshot capture and compares against the baseline using `pixelmatch`.
- `"test:visual"`: Executes the Playwright visual regression E2E spec.

---

## Change Tracker
- **Files modified**:
  - `package.json` — Integrated devDependencies and scripts.
  - `scripts/visual-qa.js` — Standalone screen capture and diff script.
  - `e2e/visual-regression.spec.ts` — E2E playwright visual tests.
- **Build status**: PASS
- **Pending issues**: None
