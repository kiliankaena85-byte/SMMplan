# Project: Smmplan Catalog Ops & CRUD

## Architecture
- Smmplan Admin Panel (Tailwind 4, HeroUI v3 wrappers over Base UI, React 19, Next.js 16 App Router).
- Database: PostgreSQL with Prisma ORM. Models involved: `Service`, `Category`, `Network`, `Provider`, `AdminAuditLog`.
- Server Actions for state mutation, protected by strict RBAC (`requireStaffPermission` checking `CATALOG`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Architecture & Exploration | Identify active routes, category components, existing actions, and exact import formats for both bulk operations and CRUD | none | DONE |
| 2 | Backend Implementation & Server Actions | Implement `batchReassignServicesCategoryAction`, `mergeCategoriesAction`, manual Service CRUD, and Network/Category CRUD with RBAC and audit logging | M1 | DONE |
| 3 | Frontend: Bulk Service Reassignment & Manual Service CRUD | Add "Перенести в категорию" and "Создать услугу" buttons, Edit/Create modals on main catalog page | M2 | DONE |
| 4 | Frontend: Category Merge Tool & Network/Category CRUD | Add Network CRUD and Category Merge utility to Categories Manager page | M2 | DONE |
| 5 | Testing & Verification | Implement Vitest suite, run all verifications, build/type checks, and audits | M3, M4 | IN_PROGRESS |

## Interface Contracts
### `batchReassignServicesCategoryAction`
- **Signature**: `(serviceIds: string[], targetCategoryId: string) => Promise<{ success: boolean; error?: string }>`
- **RBAC**: `requireStaffPermission('CATALOG', 'edit')`
- **Audit Action**: `"BATCH_SERVICE_REASSIGN"`

### `mergeCategoriesAction`
- **Signature**: `(sourceCategoryId: string, targetCategoryId: string) => Promise<{ success: boolean; error?: string }>`
- **RBAC**: `requireStaffPermission('CATALOG', 'edit')`
- **Audit Action**: `"CATEGORY_MERGE"`

### `createServiceAction` / `updateServiceAction`
- **Actions** for manual service CRUD with provider binding and audit logs (`SERVICE_MANUAL_CREATE`, `SERVICE_MANUAL_UPDATE`).

### `createNetworkAction` / `updateNetworkAction` / `deleteNetworkAction`
- **Actions** for Network CRUD with audit logs (`NETWORK_CREATE`, `NETWORK_UPDATE`, `NETWORK_DELETE`).
