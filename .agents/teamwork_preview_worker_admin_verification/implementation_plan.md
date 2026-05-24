# Implementation Plan — Milestone 5 Testing & Verification

## Problem Statement
We need to implement a complete, robust, and clean Vitest test suite for Milestone 5 of the Smmplan Catalog Ops & CRUD task. This includes testing batch service reassignment, category merging, network CRUD, and manual service CRUD actions.

## Technology Stack & Constraints
- **Test Runner**: Vitest 4
- **Database ORM**: Prisma 5 (PostgreSQL)
- **Environment**: Next.js 16/Turbopack, TypeScript 5.7+
- **Mocking**: Mock `next/headers` (cookies, headers), mock `@/lib/session` (specifically `verifySession`).

## 5 Vectors of Reliability
1. **Architectural Boundary**: Mocking Next.js headers/cookies and `verifySession` cleanly, ensuring tests run in the isolated test environment.
2. **Chaos and Emptiness**: Before each test, wipe `db.service`, `db.category`, `db.network`, `db.provider`, `db.auditLog` to ensure fresh slate.
3. **Visual & UX Density**: Ensure error messages returned by mock actions align with the localized Russian UI specifications.
4. **Accessibility WCAG**: N/A for backend actions, but type safety and clean interfaces are preserved.
5. **Security & Trust**: Ensure RBAC (Role-Based Access Control) is thoroughly tested (Owner bypass, unauthorized access, and non-admin restrictions).

## Failure Simulation (Pre-Mortem)
- **Failure 1**: Prisma relations block category deletion/merging due to foreign key constraints if done in incorrect order.
  - *Protection*: The `mergeCategoriesAction` runs atomically inside a single transaction: updates all services categoryIds first, then deletes the category. We must assert this atomicity.
- **Failure 2**: Next.js `revalidatePath` and `revalidateTag` throw runtime errors inside the Vitest node environment.
  - *Protection*: We mock `next/cache` or let next/cache be mocked by the environment or stubbed. In our case, `revalidatePath` and `revalidateTag` should be safely stubbed or imported/ignored by Vitest. Let's check how they are mocked in other tests or simply mock them using `vi.mock('next/cache')`.
- **Failure 3**: Database rate limits or settings block test queries.
  - *Protection*: We set `isTestMode: true` in `systemSettings` at the start of each test.

## Execution Steps
1. **Define setup & mock files**: Create standard Next.js mocks (headers, cookies, cache, session).
2. **Create testing hooks**: Clear DB and upsert global settings in `beforeEach`.
3. **Write test cases**:
   - Batch reassignment (happy path, validation error, category not found, RBAC violation).
   - Category merge (happy path, same ID error, category not found, transaction atomicity).
   - Network CRUD (create, unique constraint check, update, slug validation, delete restrictions, delete happy path).
   - Service CRUD (manual creation, exchange rate conversion, targetType auto-inference, provider binding, manual update).
4. **Run and verify**: Execute `npx vitest run src/actions/admin/catalog/__tests__/categories-ops.test.ts`.
5. **Check compilation & linting**: Run `npx tsc --noEmit` and ESLint.
