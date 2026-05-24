# Smmplan Catalog Ops & CRUD Implementation Plan

## Overview
This plan implements bulk catalog operations (reassignment, category merge) and full manual CRUD (services, categories, social networks) in the Smmplan admin panel with transaction safety, audit logging, and RBAC security.

## User Stories / Decomposition

### Part 1: Exploration & Architecture (Milestone 1)
- **Task 1.1**: Scout codebase for exact models (Service, Category, Network, Provider, AdminAuditLog) and list their current schemas.
- **Task 1.2**: Scout `/admin/catalog` and `/admin/catalog/categories` layout, locating the components to be modified/added.
- **Task 1.3**: Identify existing audit helpers (e.g. `auditAdmin`), path/tag revalidation functions, and permission checks (`requireStaffPermission`).

### Part 2: Backend Implementation & Server Actions (Milestone 2)
- **Task 2.1**: Implement backend actions for:
  - Bulk service reassignment: `batchReassignServicesCategoryAction`
  - Category merge: `mergeCategoriesAction`
  - Manual Service CRUD: `createServiceAction`, `updateServiceAction`
  - Manual Network CRUD: `createNetworkAction`, `updateNetworkAction`, `deleteNetworkAction`
- **Task 2.2**: Ensure strict Zod schema validation, transaction atomicity (using Prisma `$transaction`), RBAC protection, and proper `AdminAuditLog` entries.

### Part 3: Frontend - Main Catalog page (Milestone 3)
- **Task 3.1**: Update `catalog-table-v2.tsx` to include the "Перенести в категорию" batch action, which opens a searchable, grouped select modal.
- **Task 3.2**: Add an edit pencil button to each service row opening the Edit Service Modal.
- **Task 3.3**: Add a "Создать услугу" button at the top opening the Create Service Modal.
- **Task 3.4**: Ensure both modals support full attributes (name, description, category, targetType, min/max qty, rate, markup, active status) and manual provider/external ID binding.

### Part 4: Frontend - Categories Manager page (Milestone 4)
- **Task 4.1**: Update `CategoryManager` component to support the "Merge Categories" utility.
- **Task 4.2**: Implement Network CRUD forms/tables (create, list, update, delete) on `/admin/catalog/categories`.
- **Task 4.3**: Integrate category editing/creation dialog or forms aligned with Network changes.

### Part 5: Testing & Verification (Milestone 5)
- **Task 5.1**: Write Vitest specs in `src/actions/admin/catalog/__tests__/categories-ops.test.ts`.
- **Task 5.2**: Run typechecking (`npx tsc --noEmit`) and build checks to ensure compile-time correctness.
- **Task 5.3**: Run Forensic Audit using the auditor subagent.

## Verification Checklist
- [ ] Bulk service reassignment moves all selected services and revalidates cache.
- [ ] Category merge reassigns all services from source to target and deletes empty source.
- [ ] Network CRUD operates flawlessly (Create, Read, Update, Delete) with validation and audits.
- [ ] Service Edit/Create modals operate correctly with provider binding and audit logs.
- [ ] Vitest tests run and pass.
- [ ] TypeScript check and production build compile successfully.
