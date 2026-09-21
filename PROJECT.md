# Project: SMMplan / OmniSMM 1.0 Codebase Audit & Healing

## Architecture
- **Framework**: Next.js 16.x App Router (Standalone build with Webpack/Turbopack)
- **UI Engine**: React 19, Tailwind CSS 4 (`@theme`), HeroUI v3 (Compound dot notation)
- **Data & Services**: Prisma 5 (PostgreSQL), Redis (ioredis), BullMQ
- **Domain Invariants**: OmniSMM 1.0 Multi-Tenant (`SMMplan` / `SMMflux`), Ledger-First financial engine (`WalletOps`, BigInt kopecks, stable `idempotencyKey`), fail-closed timing-safe webhooks.

## Feature Inventory
| # | Feature / Issue | Description | Milestone | Source |
|---|-----------------|-------------|-----------|--------|
| 1 | Client/Server Boundaries & Typo Fix | Fix `'client';` typos in `error-tracker.tsx` and `telegram-simulator.tsx`, add missing `'use client'` across 18 decomposed client subcomponents. | M1 | Survey Explorer 2 |
| 2 | Suspense Boundary on Payment Redirect | Wrap `useSearchParams()` in `<Suspense>` in `src/app/payment-redirect/page.tsx` to prevent CSR bailout. | M1 | Survey Explorer 1 |
| 3 | HeroUI v3 Compound Modals & Buttons | Migrate flat modal imports in `promocode-columns.tsx` and `RoutingPanelClient.tsx` to compound `<Modal.*>`, fix `isPending` prop to `isLoading`. | M1 | Survey Explorer 2 |
| 4 | Catalog TargetType Resolution | Replace `s.targetType || inferTargetTypeFromName(s.name)` with `resolveServiceTargetType(s)` across 4 files to eliminate false channel link incompatibility. | M1 | Survey Explorer 2 |
| 5 | De-brand Lovable Residuals | Clean up `/ab-lovable` page and dead `handleLovableBulkCancel` helper per OmniSMM 1.0 single-brand rules. | M1 | Survey Explorer 2 |
| 6 | Server Action Function Exports | Fix `export const adminChangeTicketStatus = changeTicketStatus;` to explicit `async function` in `ticket.ts`. | M1 | Survey Explorer 2 |
| 7 | Deterministic Financial Idempotency Keys | Eliminate volatile `Date.now()` suffixes in `actions/admin/users.ts`, `actions/admin/orders.ts`, `order-status-mutator.service.ts`, `ledger-reconciliation.service.ts`. | M2 | Survey Explorer 3 |
| 8 | Server Actions Return Contract Healing | Remove raw `throw new Error` in `actions/admin/catalog.ts:133`, return typed `{ success, error }` in `finance/settings.ts` and `order/sync-payment.ts`. | M2 | Survey Explorer 1, 3 |
| 9 | Secondary Test Typecheck Healing | Fix 29 TypeScript errors in `test/tsconfig.json` (purged `/api/dev/*` tests, queue imports, schema property mismatches, type narrowing). | M3 | Survey Explorer 1 |
| 10 | Vitest Pool & DB Wipe Protection Stability | Stabilize `.env.test` connection limit (30) and ensure test harness execution executes without pool exhaustion. | M3 | Survey Explorer 3 |
| 11 | Full-Spectrum Regression & Build Gate | Verify `tsc --noEmit` (0 errors), `npm test` (100% pass), `next build --webpack` (0 errors), AST guardrails, and bundle secret checks. | M4 | Project Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Frontend Contracts & UI Boundaries | Client/server boundaries, Suspense, HeroUI v3 compound modals, targetType resolution, branding cleanup | none | IN_PROGRESS (Worker: df2bfdef-3ae0-429c-ac84-4934c75a79e9) |
| 2 | M2: Financial Invariants & Server Actions | Idempotency key stability, Server Actions { success, error } contracts, WalletOps audit | none | IN_PROGRESS (Worker: bf7cf831-858c-4ee9-90ac-f7ffc0652b8e) |
| 3 | M3: Test Suite & Typecheck Healing | Fix test/tsconfig.json 29 errors, test runner stability, Vitest connection pool configuration | none | IN_PROGRESS (Worker: c1764647-6f4a-43ca-93e4-28235a309c9f) |
| 4 | M4: Full-Spectrum Verification & Hardening | Run root tsc, test tsc, full Vitest suite, next build --webpack, secret audit, Challenger & Forensic Auditor gates | M1, M2, M3 | PLANNED |

## Interface Contracts
### UI Components ↔ Next.js App Router
- Client components MUST start with `'use client';` (not `'client';`).
- Client components using `useSearchParams()` MUST be wrapped in a React `<Suspense>` boundary.
- Server Actions in `src/actions/` MUST return `{ success: boolean, error?: string, data?: any }` and MUST NOT throw unhandled raw `Error`.

### Services ↔ Financial Ledger
- All balance mutations MUST use `WalletOps`.
- All idempotency keys MUST be stable and deterministic: `IdempotencyKeys.generate(...)` without `Date.now()` or random suffixes.

### Catalog Engine ↔ Services
- Target type resolution MUST use `resolveServiceTargetType(service)` from `@/utils/target-type-mapper`.

## Code Layout
- `src/app/`: Next.js 16 App Router pages and route handlers
- `src/actions/`: Server Actions with typed `{ success, error }` returns
- `src/components/admin/`: OmniSMM 1.0 Admin Panel widgets and components
- `src/components/landing/`, `src/components/catalog/`: Client showcase and order wizards
- `src/services/`: Domain services (Financial, Analyzer, Providers, Admin)
- `src/utils/`, `src/lib/`: Utilities, database client, target type resolvers
- `test/`, `src/__tests__/`: Integration and unit test suites
