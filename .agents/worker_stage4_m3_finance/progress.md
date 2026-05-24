# Progress Log — worker_stage4_m3_finance

Last visited: 2026-05-24T14:57:40+03:00

## Active Milestone
Milestone 3 (R3: Financial Dashboard Analytics) of Smmplan Stage 4 Hardening.

## Task Status
- [x] Extend `prisma/schema.prisma` with the `UsnScheme` enum and add the selection settings to the database.
- [x] Update `/admin/settings` configurations with the new `usnScheme` selector form and wire the action.
- [x] Refactor `src/services/financial/accounting.service.ts` `getMetrics` to dynamically calculate taxes based on `usnScheme` (INCOME vs INCOME_EXPENSES).
- [x] Add the premium high-density financial analytics block with 5 cards on the admin dashboard (`src/app/admin/dashboard/page.tsx`).
- [x] Create Vitest tests to verify accounting calculations and invariants.
- [x] Verify Typescript (`npx tsc --noEmit`) and build (`npm run build`).
- [x] Submit handoff and changes report.
