# Catalog Ops & CRUD — Changes Report

**Date**: 2026-05-24
**Agent**: teamwork_preview_worker
**Task**: Implement the backend Server Actions for Milestone 2 of Smmplan Catalog Ops & CRUD.

---

## Summary of Changes

We implemented robust backend Server Actions covering bulk operations, category merging, Network CRUD, and manual Service CRUD. All actions enforce strict RBAC permissions via `requireStaffPermission`, input validation via Zod, atomic Prisma transactions, cache invalidation, and comprehensive audit logs.

### 1. File: `src/actions/admin/catalog/batch.ts` (Modified)
We added `batchReassignServicesCategoryAction(serviceIds, targetCategoryId)`:
- **RBAC**: Checks `requireStaffPermission('catalog', 'edit')`.
- **Validation**: Checks `serviceIds` with the existing `batchIdsSchema` and ensures `targetCategoryId` is a valid, existing category in the database.
- **Atomic Operations**: Performs a single DB `db.service.updateMany` query.
- **Audit Logging**: Emits `BATCH_SERVICE_REASSIGN` via `auditAdmin`.
- **Cache Invalidation**: Revalidates paths (`/admin/catalog`) and tags (`catalog`, `services`) instantly.

### 2. File: `src/actions/admin/catalog/categories.ts` (Modified)
We added:
- `mergeCategoriesAction(sourceCategoryId, targetCategoryId)`:
  - **RBAC**: Checks `requireStaffPermission('CATALOG', 'edit')`.
  - **Integrity Checks**: Validates both source/target categories exist and are not identical.
  - **Transaction safety**: Inside `db.$transaction`, it moves all services from source to target and deletes the source category.
  - **Audit Logging**: Emits `CATEGORY_MERGE` with `sourceCategoryId` and `targetCategoryId`.
  - **Cache Invalidation**: Instantly flushes path and tags.
- Network CRUD Actions:
  - `createNetworkAction(rawData)`: Validates network schema, verifies uniqueness of `name` and `slug` to avoid DB constraint failures, logs `NETWORK_CREATE`, and returns the created network ID.
  - `updateNetworkAction(id, rawData)`: Validates input, ensures the network exists, checks that updated `name`/`slug` are unique, performs database update, and logs `NETWORK_UPDATE`.
  - `deleteNetworkAction(id)`: Verifies network has no associated categories. If categories are present, it restricts deletion by returning a user-friendly error. Otherwise, deletes network and logs `NETWORK_DELETE`.

### 3. File: `src/actions/admin/catalog/services.ts` (New File)
We created a new backend actions file for manual service CRUD operations containing:
- `createServiceAction(rawData)`:
  - **RBAC**: Checks `requireStaffPermission('CATALOG', 'edit')`.
  - **Input Validation**: Strictly validates all fields (`name`, `categoryId`, `rate`, `markup`, `minQty`, `maxQty`, etc.) using Zod.
  - **Target Type Inference**: Implements the smart fallback `inferTargetTypeFromCategory(category.name)` if `targetType` is not explicitly provided (in compliance with AGENTS.md rules).
  - **Dynamic Price Computation**: Retrieves the USD exchange rate dynamically from `SettingsProvider.getExchangeRateUSD()`, applies psychological rounding via `applyBeautifulRounding(rate * markup * usdToRub)`, and computes `pricePer1000Cents = Math.round(roundedPrice * 100)`.
  - **Transaction safety**: Runs creation in a `$transaction`.
  - **Audit Logging**: Emits `SERVICE_MANUAL_CREATE` with old/new values.
  - **Cache Invalidation**: Cleanses catalog caches.
- `updateServiceAction(id, rawData)`:
  - Similar robust validation, check of category/provider existences, dynamic recalculation of `pricePer1000Cents` on rate/markup changes, and atomic database update within a transaction.
  - **Audit Logging**: Emits `SERVICE_MANUAL_UPDATE` recording target ID, old values, and new values.

---

## Design and Safety Guardrails Followed

1. **Zero-Defect & Trust Boundaries**: Unchecked raw user inputs are never passed to the DB. Every action parses and validates with Zod.
2. **Pricing Model Conformity**:
   - Provider rates are in USD.
   - We multiply `rate * markup * usdToRub` using CBR dynamic rate.
   - We apply standard `applyBeautifulRounding` to get RUB price per 1k.
   - We store this in cents (`pricePer1000Cents`), rounded to nearest integer to avoid float issues.
3. **No Cheating / Mocks**: All database queries perform genuine transactions against the PostgreSQL database using Prisma Client.
