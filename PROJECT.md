# Project: Smmplan Stage 4 Hardening (B2B Admin & Support Security and UX)

## Architecture
This project hardens the Smmplan B2B administration panel and client-support flows. It implements visual ergonomics, auto-pricing with elastic quarantine and loss prevention, detailed financial dashboard metrics, a double-check ledger balance verifier, and a Playwright visual QA script.

- **Stack**: Next.js 16.0.10, React 19.0.0, Tailwind CSS 4.0.0, HeroUI v3 (dot notation), Prisma 5 (PostgreSQL), Vitest 4, Playwright.
- **Key Modules**:
  - **Support UX (R1)**: `src/app/admin/tickets/components/unified-workspace.tsx` and `src/components/support/ClientProfileSidebar.tsx`. Warm pastel palette (Zinc/Ivory/Amber) defined in `src/app/globals.css`.
  - **Auto-pricing (R2)**: `src/services/system/cbr-rate.service.ts`, `src/actions/admin/providers/sync-action.ts`, and `src/services/providers/quarantine.service.ts`.
  - **Financial Dashboard & USN (R3)**: `src/app/admin/dashboard/page.tsx` and `src/services/financial/accounting.service.ts`.
  - **Balance Verifier (R4)**: `src/utils/balance-verifier.ts` triggered via `npm run check-balances`.
  - **Visual QA (R5)**: `scripts/visual-qa.js` and `e2e/visual-regression.spec.ts`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | R1: Ergonomic UX & Warm Theme | Support panel ergonomic layout, soft Zinc/Ivory theme, 1.6 line-height, >=44px touch targets, hidden/collapsible profile sidebar on desktop, bottom drawer on mobile, auto-copy and provider bridge. | None | DONE |
| 2 | R2: CBR Pricing & Quarantine | CBR USD/RUB exchange API sync, safety floor retail pricing, Elastic Quarantine for >20% spikes, Loss Prevention auto-block, and sync execution checks. | None | DONE |
| 3 | R3: Financial Dashboard Analytics | dashboard metrics (Revenue, YooKassa fees, Provider cost COGS), dynamic USN tax selection (Income vs. Income minus Expenses), and clear net profit indicators (green/yellow/red). | M1, M2 | DONE |
| 4 | R4: Balance Verification Ledger | Double-check Ledger verifier utility `src/utils/balance-verifier.ts` (`npm run check-balances`) to compare user.balance with ledger entries sum, auto-block fraud, and write alerts. | None | DONE |
| 5 | R5: Visual QA Script & E2E Tests | `scripts/visual-qa.js` utilizing Playwright with `--compare` using pixelmatch, native visual regression test spec, and 100% build checks. | M1, M3 | DONE |
| 6 | R6: Ads Analytics Promo Campaign | UTM campaign promo tracking in Prisma, atomic logging at payment time, UI promo creation forms with Ruble-to-cents conversion, dynamic CAC/LTV/ROMI columns with Ivory/Zinc colors and >= 44px hitboxes. | M1, M2, M3 | DONE |


## Interface Contracts
- **Ergonomic Palette**: Theme colors must be derived exclusively from the `@theme` variable definitions in `src/app/globals.css` (Zinc / Ivory backgrounds, graphite/slate slate text, amber highlight elements). Hardcoded tailwind colors (like `bg-slate-950` or `text-emerald-600`) are forbidden.
- **USN Scheme Schema Enum**: Define `UsnScheme` as `enum` in Prisma schema:
  ```prisma
  enum UsnScheme {
    INCOME
    INCOME_EXPENSES
  }
  ```
  And add `usnScheme UsnScheme @default(INCOME_EXPENSES)` to `SystemSettings` model.
- **Double-Entry Ledger Integrity**: Every balance adjustment must write an approved `LedgerEntry` record in PostgreSQL. The `BalanceVerifier` utility must run dynamically against these records.
- **Ads Campaign Metrics Integrity**: All promotional UTM metrics (LTV, CAC, ROMI) displayed in tables must compute dynamically in-memory from transactional `PromoCodeUsage` rows to completely prevent drift or race condition desynchronization. ROMI efficiency cell rendering must conform to warm Ivory/Zinc theme visual color indicator depending on efficiency (Green for ROMI >= 50%, Yellow for 0-49%, Red for loss).
- **Visual Thresholds**: The Playwright visual QA comparisons must use pixelmatch with a strict `maxDiffPixelRatio: 0.01` (1% limit).

## Code Layout
- `src/actions/` - Server Actions (guarded by `requireAdmin()`)
- `src/app/` - Next.js page routes & split ticket workspace
- `src/components/` - React shared and layout components
- `src/services/` - Core financial and business services
- `src/utils/` - Balance verifier and other utility scripts
- `scripts/` - QA scripting environment
