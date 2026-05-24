# Implementation Plan — Backend Server Actions for Catalog Ops & CRUD

This plan outlines the implementation of the backend Server Actions required for Milestone 2 of the Smmplan Catalog Ops & CRUD project.

---

## 1. Architectural Design & Decomposition

### User Story 1: Bulk Service Category Reassignment
- **Target File**: `src/actions/admin/catalog/batch.ts`
- **Function**: `batchReassignServicesCategoryAction(serviceIds: string[], targetCategoryId: string)`
- **Behavior**:
  - Perform RBAC check `requireStaffPermission('catalog', 'edit')`.
  - Validate inputs (`serviceIds` using `batchIdsSchema`, `targetCategoryId` as non-empty string).
  - Verify that the target category exists in the DB.
  - Update all matching services' `categoryId` using `db.service.updateMany()`.
  - Log audit trace `BATCH_SERVICE_REASSIGN` using `auditAdmin()`.
  - Revalidate `/admin/catalog` and tags `catalog` and `services`.

### User Story 2: Category Merging & Network CRUD
- **Target File**: `src/actions/admin/catalog/categories.ts`
- **Functions**:
  - `mergeCategoriesAction(sourceCategoryId: string, targetCategoryId: string)`:
    - Perform RBAC check `requireStaffPermission('catalog', 'edit')`.
    - Validate inputs (non-empty strings, distinct IDs).
    - Check both source and target categories exist.
    - Inside a single atomic Prisma `$transaction`:
      1. Move all services from the source category to the target category.
      2. Delete the source category.
    - Log audit action `CATEGORY_MERGE` with details of old/new count.
    - Revalidate cache tags `catalog`, `services` and path `/admin/catalog/categories`.
  - `createNetworkAction(rawData)`:
    - Validate via Zod: `name`, `slug` (kebab-case preferred, unique), `sort` (integer).
    - Log audit `NETWORK_CREATE`.
    - Revalidate cache tags and paths.
  - `updateNetworkAction(id, rawData)`:
    - Validate ID and rawData with Zod.
    - Update network fields.
    - Log audit `NETWORK_UPDATE`.
    - Revalidate cache.
  - `deleteNetworkAction(id)`:
    - Verify if network has associated categories; restrict deletion with a helpful error if count > 0.
    - Delete network.
    - Log audit `NETWORK_DELETE`.
    - Revalidate cache.

### User Story 3: Manual Service CRUD
- **Target File**: `src/actions/admin/catalog/services.ts` (new file)
- **Functions**:
  - `createServiceAction(rawData: any)`:
    - Validate all required fields (`name`, `categoryId`, `rate`, `markup`, `minQty`, `maxQty`, `targetType`, `providerId`, `externalId`, `isActive`, `description`).
    - Use fallback helper `inferTargetTypeFromCategory(categoryName)` if `targetType` is not provided (as per AGENTS.md).
    - Fetch the current USD exchange rate from settings to compute `pricePer1000Cents` dynamically using:
      `pricePer1000Cents = Math.round(applyBeautifulRounding(rate * markup * usdToRub) * 100)`.
      Wait, we'll verify this formula and use `SettingsProvider.getExchangeRateUSD()` or `db.systemSettings.findUnique` to fetch the exchange rate.
    - Run the database creation within an atomic query or transaction.
    - Log audit `SERVICE_MANUAL_CREATE`.
    - Revalidate cache paths.
  - `updateServiceAction(id: string, rawData: any)`:
    - Validate input fields.
    - Calculate new `pricePer1000Cents`.
    - Log audit `SERVICE_MANUAL_UPDATE` with old/new values.
    - Revalidate cache paths.

---

## 2. The 5 Vectors of Reliability Analysis

### 1. Architectural Junction (Server/Client boundaries)
- Since these are Server Actions (`"use server"`), they must never return rich/complex objects with functions or non-serializable properties.
- They must always return plain JS objects like `{ success: true }` or `{ success: false, error: "Reason" }` for easy consumption on client side.
- Enforce standard TypeScript types for inputs and outputs.

### 2. Chaos and Emptiness (Cold Starts, Database integrity)
- **Cold start / Empty DB**: All category/network lookups will fail gracefully with clear error messages rather than throwing raw unhandled database exceptions.
- **Transaction Safety**: `mergeCategoriesAction` moves services and deletes the category. If deletion fails, the move must be rolled back. Wrap inside `db.$transaction`.
- **Input Corruptions**: Strict Zod schemas will reject partial, negative, or excessive values (e.g. `rate < 0`, `minQty > maxQty`, excessive string lengths).

### 3. Visual & UX Density
- Although these are backend actions, the error messages returned will be rendered directly in toast notifications or inline form fields in the admin UI.
- Russian language translations will be provided for user-facing validation errors (e.g. "Сеть содержит категории", "Категория не найдена").

### 4. Accessibility (WCAG 2.2 AA)
- Failures or successes returned by these actions must contain clear status codes/messages so screen readers or client-side validation can convey precise action results.

### 5. Security & Trust
- Strict RBAC using the customized `requireStaffPermission` wrapper on all actions.
- Audit logging via the existing `auditAdmin` helper so every change has a cryptographic/temporal trace in `AdminAuditLog`.

---

## 3. Pre-Mortem Failure Simulation (Failure Scenarios & Mitigation)

| Scenario ID | Hypothesized Failure Mode | Programmatic Prevention & Mitigation |
| :--- | :--- | :--- |
| **PM-01** | Category merging is executed, but the database connection drops mid-way, leaving services moved but the empty category remaining. | **Atomic Transaction**: Wrap the re-assignment of services and the category deletion inside a single Prisma `$transaction` block. If the deletion fails, the re-assignment is automatically rolled back. |
| **PM-02** | Administrator creates a manual service with an invalid `targetType` (e.g. link expectations mismatch), leading to broken URL validations for users. | **Validation & Fallback**: Use `inferTargetTypeFromCategory` from `src/utils/target-type.ts` if not provided, and restrict input strictly to allowed categories/targets in the Zod schema. |
| **PM-03** | Deleting a Network that still has active categories/services orphanizes them or causes Prisma RESTRICT violations. | **Relation Safeguard**: Count categories associated with the network prior to deletion. If `count > 0`, immediately return a user-friendly error instead of attempting database deletion. |

---

## 4. Verification Methods
1. Run Typescript compiler check: `npx tsc --noEmit` to confirm complete type safety.
2. Run database migration tests/unit tests where applicable.
