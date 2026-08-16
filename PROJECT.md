# Project: Smmplan Platform Test Failure Elimination & Integrity Hardening

## Architecture
This project resolves all unit test failures across the SMMplan platform (1004/1004 passing Vitest tests), fixes database teardown & PostgreSQL immutable ledger constraints in E2E tests (`e2e/utils/db-cleaner.ts`), modernizes legacy E2E test selectors to HeroUI v3 & UnifiedOrderWizard, and synchronizes architectural decisions to GraphRAG.

- **Stack**: Next.js 16.0.10, React 19.0.0, Tailwind CSS 4.0.0, HeroUI v3 (dot notation), Prisma 5 (PostgreSQL), Vitest 4, Playwright.
- **Key Modules**:
  - **Unit Testing**: `test/unit/` (17 test files including `service-audit.test.ts`, `settings.test.ts`, `smart-drip-checkout.test.ts`, `pricing-sync.test.ts`, `services-data.test.ts`, etc.)
  - **Financial Rules**: Safety Floor markup 3.0, unit pricing ₽ / шт, BigInt kopecks, multi-tenant isolation.
  - **E2E Infrastructure**: `e2e/utils/db-cleaner.ts` with clean immutable ledger handling.
  - **E2E Test Suites**: `e2e/user-flow.spec.ts`, `e2e/providers.spec.ts`, `e2e/api-v2-mass-orders.spec.ts`.
  - **GraphRAG Synchronization**: `http://localhost:8100/api/decision`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Vitest Unit Tests Alignment | Fix failing unit tests across test/unit/ (Safety floor markup 3.0, ₽/шт, multi-tenant Prisma rules, Vault encryption) -> 1004/1004 passing | M1 | ORIGINAL_REQUEST §R1 |
| 2 | E2E DB Cleaner & Ledger Teardown | Update `e2e/utils/db-cleaner.ts` with session replication role / trigger bypass to cleanly handle PostgreSQL immutable ledger triggers without FK violations | M2 | ORIGINAL_REQUEST §R2 |
| 3 | Modern E2E Selectors Alignment | Update outdated selectors in `e2e/user-flow.spec.ts`, `e2e/providers.spec.ts`, `e2e/api-v2-mass-orders.spec.ts` for HeroUI v3 & UnifiedOrderWizard | M3 | ORIGINAL_REQUEST §R3 |
| 4 | GraphRAG Decision Synchronization | Log 3 final architectural decisions (Test Isolation, Financial Safety Floor 3.0, Multi-Tenant Session Verification) to `http://localhost:8100/api/decision` | M4 | ORIGINAL_REQUEST §R4 |
| 5 | Platform Verification & Forensic Audit | Verify `npx tsc --noEmit` exits with 0 errors, `npx vitest run` passes 1004/1004, and Forensic Audit verifies integrity | M5 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 0 | Survey & Scope Mapping | 3 parallel Explorers surveying unit test failures, E2E teardown/selectors, and GraphRAG/typecheck | None | DONE |
| 1 | M1: Vitest Unit Test Failure Elimination | Fix failing tests across test/unit/ and services -> 1004/1004 passed | M0 | IN_PROGRESS |
| 2 | M2: E2E DB Cleaner & Ledger Teardown | Clean PostgreSQL immutable ledger handling in db-cleaner.ts | M0 | PLANNED |
| 3 | M3: Modern E2E Selectors Alignment | HeroUI v3 & UnifiedOrderWizard selectors in 3 E2E spec files | M0 | PLANNED |
| 4 | M4: GraphRAG Decision Sync | Sync test isolation, financial safety floor, and session verification decisions | M0 | PLANNED |
| 5 | M5: Final Verification & Audit | Zero tsc errors, 1004/1004 Vitest, Maker-Checker Review and Forensic Audit | M1, M2, M3, M4 | PLANNED |

## Interface Contracts & Constraints
- **Pricing & Safety Floor**: Safety Floor markup factor is 3.0 (`SAFETY_FLOOR_MARKUP = 3.0`). Unit pricing is strictly in rubles per 1 unit (`₽ / шт`) and internal calculations in BigInt kopecks.
- **Vault Security**: All mock provider and gateway API credentials in test fixtures must use `VaultService.encrypt()` format. Plaintext secrets must be rejected.
- **Multi-Tenant Prisma**: Mocks for `@/lib/db` must include `tenant` and `featureFlag` models.
- **Immutable Ledger Teardown**: In E2E tests, cleaning the database must use session replication role or trigger disable to prevent ledger immutability errors.
- **HeroUI v3 Selectors**: Use modern interactive card locators, button texts (`Создать подключение`, `Сохранить`), and input placeholders (`input[placeholder*="ссылк"]`).

## Code Layout
- `test/unit/` - Vitest unit test files
- `e2e/utils/` - E2E helpers and DB cleaner utilities
- `e2e/` - Playwright E2E test specs
- `src/` - Production application source code
