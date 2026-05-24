## 2026-05-24T12:09:16Z

Implement Milestone 5 (R5: Visual QA Script & E2E Tests) of the Smmplan Stage 4 Hardening.

Objectives:
1. Install and integrate necessary visual comparison dependencies in `package.json` devDependencies:
   - Add `pixelmatch`, `pngjs`, and their `@types/` equivalents (`@types/pixelmatch`, `@types/pngjs`) as devDependencies, and ensure they are successfully installed (`npm install`).
2. Implement the standalone visual QA script `scripts/visual-qa.js` (or `.ts` if compiled/run via tsx):
   - Location: `scripts/visual-qa.js`
   - It should initialize Prisma database connection, create/upsert a test Owner user (`e2e-tester@test.com`), create a session, and generate a valid JWT `session_token` signed with the project's `JWT_SECRET` (falling back to `'fallback-secret-for-dev-only-v2'`).
   - Launch Playwright's Chromium browser, create a context with desktop viewport (1280x800, scale factor 2 or 1), and inject the `session_token` cookie for `localhost`.
   - Capture screenshots of the **7 key admin pages**:
     1. Dashboard: `/admin/dashboard`
     2. Orders: `/admin/orders`
     3. Services: `/admin/catalog`
     4. Providers: `/admin/providers`
     5. Clients: `/admin/clients`
     6. Support Chat: `/admin/tickets`
     7. Settings: `/admin/settings`
   - Save the screenshots under `.planning/screenshots/<name>_desktop.png`. Create the directory if it does not exist.
   - Implement the `--compare` option. When `--compare` is active:
     - Compare the captured screenshots with baseline screenshots expected at `.planning/screenshots/baseline/<name>_desktop.png`.
     - Use `pixelmatch` to compare the two images. Write a difference image to `.planning/screenshots/diff_<name>_desktop.png` to easily debug UI layout shifts.
     - Compute the ratio of mismatched pixels. If the ratio exceeds 1% (0.01), flag a layout shift error.
     - If any page exceeds the 1% layout shift threshold or if any baseline is missing, print a detailed Russian error summary to the console and exit the script with exit code `1`.
     - If all matches are clean within the 1% threshold, print a success summary and exit with exit code `0`.
     - Properly disconnect Prisma upon completion or error.
3. Implement native Playwright visual regression tests:
   - Location: `e2e/visual-regression.spec.ts`
   - Write standard Playwright E2E test cases for all 7 admin pages.
   - Use Playwright's native `toHaveScreenshot` expectation with a strict `maxDiffPixelRatio: 0.01` (1% limit).
   - Ensure dynamic content (such as dynamic numeric charts, tabular balances, transaction logs, dates, or UUIDs) are safely masked using Playwright's `mask: [...]` or CSS hidden injection to prevent false positive failures.
4. Add convenient package scripts under `package.json`:
   - `"visual-qa": "dotenv -e .env -- tsx scripts/visual-qa.js"`
   - `"visual-qa:compare": "dotenv -e .env -- tsx scripts/visual-qa.js --compare"`
   - `"test:visual": "dotenv -e .env.test -- playwright test e2e/visual-regression.spec.ts"`
5. Verify the entire setup:
   - Run typecheck (`npx tsc --noEmit`) to confirm 0 compilation errors.
   - Run Next.js production compilation (`npm run build`) to ensure build safety.
   - Execute both `npm run visual-qa` and `npm run test:visual` (running visual tests) and verify success status. Document the commands and execution outputs cleanly.

Stack and Conventions:
- Adhere strictly to the Smmplan Lite AI Developer Contract (AGENTS.md) and Ralph Loop v3.
- Design System compliance (semantic tokens, transitions, no hardcoded colors) is non-negotiable.
- Absolutely zero-tolerance for mock test results or hardcoding. All visual captures and pixel comparisons must be genuine.

Write your implementation details to `changes.md` and your 5-component handoff report to `handoff.md` inside your working directory: `d:\SMM_plan_2\.agents\worker_stage4_m5_qa\`.
