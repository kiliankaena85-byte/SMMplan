## 2026-05-24T03:35:00Z

You are the implementation agent 'teamwork_preview_worker'.
Your working directory is: d:\SMM_plan_2\.agents\worker_catalog_ops_crud
Your task is to implement the backend Server Actions for Milestone 2 of the Smmplan Catalog Ops & CRUD project.

### Required Actions & Files:
1. In `src/actions/admin/catalog/batch.ts`:
   - Implement `batchReassignServicesCategoryAction(serviceIds: string[], targetCategoryId: string)` that updates all selected services' `categoryId` in a single db query/transaction, checks `requireStaffPermission('catalog', 'edit')`, registers audit log `'BATCH_SERVICE_REASSIGN'`, and revalidates cache.

2. In `src/actions/admin/catalog/categories.ts`:
   - Implement `mergeCategoriesAction(sourceCategoryId: string, targetCategoryId: string)`:
     - Check `requireStaffPermission('catalog', 'edit')`.
     - Check that source and target categories exist and are not identical.
     - Move all services from source to target and delete the source category inside a single Prisma `$transaction`.
     - Log audit action `'CATEGORY_MERGE'` using the `auditAdmin` helper.
     - Revalidate cache paths and tags instantly.
   - Implement Network CRUD actions:
     - `createNetworkAction(rawData: { name: string; slug: string; sort: number })` with Zod validation. Log audit `'NETWORK_CREATE'`.
     - `updateNetworkAction(id: string, rawData: { name: string; slug: string; sort: number })` with Zod validation. Log audit `'NETWORK_UPDATE'`.
     - `deleteNetworkAction(id: string)`: Check if network has categories; restrict deletion if so. Log audit `'NETWORK_DELETE'`.

3. In a new file `src/actions/admin/catalog/services.ts` (or integrated in existing):
   - Implement manual Service CRUD actions:
     - `createServiceAction(rawData: any)`: Validate input with Zod, compute `pricePer1000Cents` dynamically, support manual provider/externalId binding, run inside an atomic `$transaction` if needed, log audit `'SERVICE_MANUAL_CREATE'`.
     - `updateServiceAction(id: string, rawData: any)`: Validate input, compute `pricePer1000Cents`, update Service fields, log audit `'SERVICE_MANUAL_UPDATE'`.

### Rules & Protocol:
- MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task.
- Follow the Smmplan Lite AI Developer Contract (AGENTS.md) rules: Use semantic tokens, transition-all, Zod schemas, audit logging, strict RBAC, and Next.js App Router/React 19 conventions.
- Zero-Defect Execution Protocol:
  1. Initialize your briefing/progress in `.agents/worker_catalog_ops_crud/`.
  2. Perform Double-Pass Planning: Create `implementation_plan.md` in your working directory, analyze against the 5 vectors of reliability, and include a pre-mortem failure simulation table with at least 3 scenarios.
  3. Implement code changes cleanly using precise replacements (avoid overwriting entire files).
  4. Run typescript typechecks (`npx tsc --noEmit`) and verify compilation.

Write all your implementation details and outputs in `d:\SMM_plan_2\.agents\worker_catalog_ops_crud\changes.md`.
When done, write your handoff report and send a message back to me (conversation ID: c818c0de-874d-4af4-a050-0f80122c47b3) with a summary and paths to the files you modified/created.
