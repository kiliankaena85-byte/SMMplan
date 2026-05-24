## 2026-05-24T03:48:38Z
You are the implementation agent 'teamwork_preview_worker'.
Your working directory is: d:\SMM_plan_2\.agents\teamwork_preview_worker_admin_verification
Your task is to write and execute the complete test suite for Milestone 5 (Testing & Verification) of the Smmplan Catalog Ops & CRUD task.

### Required Tasks:
1. **Create the Vitest test file**: `src/actions/admin/catalog/__tests__/categories-ops.test.ts`.
2. **Implement comprehensive tests** in it to verify the following backend actions:
   - **Service Batch Reassignment** (`batchReassignServicesCategoryAction`):
     - Test moving a list of service IDs to a target category.
     - Test that audit log is recorded with type `'BATCH_SERVICE_REASSIGN'` and revalidations are triggered.
     - Test error cases (invalid IDs, target category not found, RBAC/permission violation).
   - **Category Merge** (`mergeCategoriesAction`):
     - Test merging category A into category B. Verify that all services in A are reassigned to B, and A is successfully deleted.
     - Test that the entire process runs atomically inside a single transaction.
     - Test error cases (same category IDs, non-existing source or target category, RBAC violation).
   - **Network CRUD** (`createNetworkAction`, `updateNetworkAction`, `deleteNetworkAction`):
     - Test creating a network (Zod validation, uniqueness of name/slug, audit log).
     - Test updating a network (Zod validation, unique slug/name check, audit log).
     - Test deleting a network (restrict deletion if it has associated categories, delete successfully if empty, audit log).
   - **Service CRUD** (`createServiceAction`, `updateServiceAction`):
     - Test manual creation of services with proper Zod validations.
     - Verify dynamic price conversion logic via USD exchange rate (`pricePer1000Cents`).
     - Verify targetType auto-inference based on category name.
     - Test manual provider/externalId binding.
     - Test updating a service parameters and checking audit logging.
3. **Environment Setup & Mocking**:
     - Follow the test setup patterns in `src/services/users/__tests__/deletion.test.ts`.
     - Enable test mode in `systemSettings` (`isTestMode: true`).
     - Clean up database tables (`db.service`, `db.category`, `db.network`, `db.provider`, `db.auditLog`) in a `beforeEach` hook.
     - Mock `next/headers` (cookies, headers) to mock active admin session or use the `requireStaffPermission` helper by mocking the session verify utility to return an admin user.
4. **Execution & Verification**:
     - Run the tests using Vitest (`npx vitest run src/actions/admin/catalog/__tests__/categories-ops.test.ts`). Ensure all tests pass successfully.
     - Verify full type safety of the test suite and modified paths by running `npx tsc --noEmit`.
     - Verify lint rules by running ESLint.

### Rules & Protocol from AGENTS.md:
- **No inline colors**: Strictly respect code guidelines.
- **Russian language / localization**: User-facing labels, validations, and toaster messages are in Russian, tests should match these expectations.

### MANDATORY INTEGRITY WARNING (DO NOT REMOVE):
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write all implementation changes, test suite files, test execution logs, and compilation results in `d:\SMM_plan_2\.agents\teamwork_preview_worker_admin_verification\changes.md`. When done, write a handoff report in `d:\SMM_plan_2\.agents\teamwork_preview_worker_admin_verification\handoff.md` and send a message back to me (conversation ID: c818c0de-874d-4af4-a050-0f80122c47b3) with a summary.
