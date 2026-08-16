# Original User Request

## 2026-08-16T13:41:14Z

Eliminate all remaining test failures across the entire SMMplan platform, achieving 100% test pass rate in both Vitest (1004/1004) and Playwright E2E suites, with clean database teardowns.

Working directory: d:/SMM_plan_2
Integrity mode: development

## Requirements

### R1. Fix All Failing Vitest Unit Tests (P0)
Resolve all 51 failing unit tests across the 17 files in test/unit/ (e.g. service-audit.test.ts, settings.test.ts, smart-drip-checkout.test.ts, pricing-sync.test.ts, services-data.test.ts, etc.) to align with current financial constants (Safety Floor markup 3.0, unit pricing ₽ / шт, and multi-tenant Prisma rules).

### R2. Resolve Database Teardown & Immutable Ledger Constraint in E2E (P1)
Update e2e/utils/db-cleaner.ts to cleanly handle PostgreSQL's immutable ledger trigger during test teardowns without throwing foreign key violations or leaving console warnings.

### R3. Align Remaining Legacy E2E Test Selectors (P1)
Update outdated selectors in e2e/user-flow.spec.ts, e2e/providers.spec.ts, and e2e/api-v2-mass-orders.spec.ts to match modern HeroUI v3 components and UnifiedOrderWizard.

### R4. Synchronize Architecture Decisions to GraphRAG (P2)
Log all final test isolation, financial safety floor, and session verification architectural decisions to the GraphRAG memory service at http://localhost:8100/api/decision.

## Acceptance Criteria

### Vitest Unit Suite
- [ ] npx vitest run completes with 0 failed tests (1004 / 1004 passed).

### Playwright E2E Suite
- [ ] All Playwright E2E test suites pass without selector timeouts.
- [ ] E2E database teardowns run cleanly without unhandled errors.

### TypeScript & Code Integrity
- [ ] npx tsc --noEmit exits with 0 errors.
