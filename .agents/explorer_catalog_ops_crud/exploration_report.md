# SMMPlan Catalog Operations & CRUD Exploration Report

This report provides exact implementation details, database schemas, component signatures, actions, and helper functions relevant to catalog management, categories, providers, RBAC, audit logging, and testing in the Smmplan codebase. It is designed to be a complete, self-contained, and highly detailed guide for the implementer agent.

---

## 1. Database Models Schema & Constraints (`prisma/schema.prisma`)

Below are the exact schema definitions and relations for the primary catalog-related models: `Service`, `Category`, `Network`, `Provider`, and `AdminAuditLog`.

### Model: `Service`
Defines an SMM service in the catalog. Includes integrations with a Category and optionally a Provider.
```prisma
model Service {
  id               String    @id @default(cuid())
  numericId        Int       @unique @default(autoincrement())
  name             String
  description      String? // Public SEO description (shown to clients)
  features         Json? // Structured metadata extracted by AI (geo, speed, warranty)
  categoryId       String
  category         Category  @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  providerId       String? // Link to Provider who fulfills this service
  provider         Provider? @relation(fields: [providerId], references: [id], onDelete: SetNull)
  rate             Float // provider rate per 1000
  providerCurrency String    @default("USD") // Dual-Ledger: original currency of rate
  markup           Float     @default(3.0) // 300% markup
  anomalyScore     Int       @default(0) // Data Intelligence: 0-100 score for suspicious provider claims
  minQty           Int       @default(10)
  maxQty           Int       @default(100000)
  externalId       String? // mapped ID to provider
  dataHash         String? // MD5 for diff-sync
  lastSeenAt       DateTime? // Last time provider confirmed this service exists

  // API v2 feature flags
  isDripFeedEnabled Boolean @default(true)
  isRefillEnabled   Boolean @default(false)
  isCancelEnabled   Boolean @default(false)

  // Quarantine: price spike isolation & Elastic Quarantine
  isQuarantined    Boolean   @default(false)
  pendingRate      Float? // Proposed new rate awaiting admin approval
  quarantineReason String? // Human-readable reason: "Price spike: +45%"
  quarantinedAt    DateTime? // When it was flagged

  // Wave 4.1: Elastic Quarantine (Self-Healing)
  cooldownUntil  DateTime? // If set, service is temporarily unavailable
  cooldownReason String? // Reason for cooldown (e.g., "API_ERROR", "DELAYED_CANCEL")

  // ETA Estimation
  etaP50Seconds  Int? // Median execution time in seconds
  etaP90Seconds  Int? // 90th percentile ("worst case")
  etaSampleCount Int       @default(0)
  etaSpeedClass  String? // FAST | MEDIUM | SLOW | ULTRA_SLOW
  etaUpdatedAt   DateTime?

  // Link Target & Format Validation
  targetType        String  @default("POST") // POST, PROFILE, CHANNEL, COMMENT, POLL, VK_WALL, etc.
  customDataType    String  @default("NONE") // NONE, TEXTAREA, NUMBER
  isMediaGroupAware Boolean @default(false)

  isActive          Boolean  @default(true)
  pricePer1000Cents Int      @default(0) // Denormalized price: rate * markup * exchangeRate
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  orders Order[]
  routes ServiceRoute[]

  @@index([categoryId])
  @@index([providerId])
  @@index([isQuarantined])
}
```
**Constraints & Behavior:**
* **Relation to `Category`:** Linked via `categoryId`. Uses `onDelete: Restrict`, meaning a Category **cannot** be deleted if there are any associated Services.
* **Relation to `Provider`:** Linked via `providerId`. Uses `onDelete: SetNull`. If a Provider is deleted, the service's `providerId` becomes `null`, but the service is preserved.
* **Denormalized Price:** `pricePer1000Cents` is stored as an integer (in Cents) to ensure fast sorting and querying in the DB.

### Model: `Category`
Groups Services by logical grouping (e.g., "Telegram Subscribers").
```prisma
model Category {
  id        String    @id @default(cuid())
  name      String
  slug      String    @unique @default(cuid())
  networkId String?
  network   Network?  @relation(fields: [networkId], references: [id], onDelete: Restrict)
  sort      Int       @default(0)
  services  Service[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([networkId])
}
```
**Constraints & Behavior:**
* **Relation to `Network`:** Linked via `networkId`. Uses `onDelete: Restrict`, preventing deletion of a Network while it has Categories.
* **Relation to `Service`:** Has a one-to-many relationship with `Service[]`.

### Model: `Network`
Represents the target platform (e.g., "Telegram", "Instagram").
```prisma
model Network {
  id          String       @id @default(cuid())
  name        String       @unique // "Telegram"
  slug        String       @unique // "telegram"
  icon        String? // SVG content or name
  sort        Int          @default(0)
  isActive    Boolean      @default(true)
  categories  Category[]
  urlPatterns UrlPattern[] // Link detection patterns
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}
```
**Constraints & Behavior:**
* Contains unique keys on `name` and `slug`.
* Has a one-to-many relationship with `Category[]`.

### Model: `Provider`
External fulfillment system config.
```prisma
model Provider {
  id              String   @id @default(cuid())
  name            String   @unique
  apiUrl          String
  apiKey          String // Encrypted API key
  isActive        Boolean  @default(true)
  metadata        Json? // { httpMethod, requestType, headers, keyField, actionField }
  providerType    String   @default("SMM_PANEL")
  syncLock        Boolean  @default(false)
  balanceCurrency String   @default("USD")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // SLA Monitoring fields
  errorCount5m  Int       @default(0)
  lastErrorAt   DateTime?
  lastSuccessAt DateTime?
  avgResponseMs Int       @default(0)

  services     Service[]
  Order        Order[]
  ServiceRoute ServiceRoute[]
}
```
**Constraints & Behavior:**
* Encrypted API keys in database (`apiKey`).
* One-to-many relationship with `Service[]`, `Order[]`, and `ServiceRoute[]`.

### Model: `AdminAuditLog`
Tracks administrative operations for compliance, security, and accountability.
```prisma
model AdminAuditLog {
  id         String   @id @default(cuid())
  adminId    String // Who performed the action
  adminEmail String // Denormalized for fast log reading
  action     String // USER_BALANCE_CHANGE, SERVICE_DISABLE, SETTINGS_UPDATE, etc.
  target     String // ID of affected entity
  targetType String // USER, SERVICE, ORDER, SETTINGS, PROVIDER
  oldValue   String? // JSON string of previous state
  newValue   String? // JSON string of new state
  ipAddress  String? // Admin IP for security investigations
  createdAt  DateTime @default(now())

  @@index([adminId])
  @@index([createdAt])
  @@index([targetType])
}
```

---

## 2. Existing Admin Actions & Helpers

### A. Batch Actions (`src/actions/admin/catalog/batch.ts`)
Handles bulk updates (toggle status, modify markups) with proper permissions and auditing.

* **`batchToggleServicesAction(serviceIds: string[], isActive: boolean)`**
  * Permission required: `catalog`, `edit`
  * Action: Updates `isActive` for up to 500 service IDs.
  * Audit Log action: `BATCH_SERVICE_ENABLE` / `BATCH_SERVICE_DISABLE`.
* **`batchSetMarkupAction(serviceIds: string[], markup: number)`**
  * Permission required: `finance`, `edit`
  * Action: Validates against `MIN_MARKUP` (Safety Floor). Computes retail prices in RUB using current exchange rate and runs updates inside a transaction `db.$transaction(...)`.
  * Audit Log action: `BATCH_MARKUP_SET`.
* **`updateServiceMarkupAction(serviceId: string, markup: number)`**
  * Permission required: `finance`, `edit`
  * Action: Changes a single service's markup and updates `pricePer1000Cents`.
  * Audit Log action: `SERVICE_MARKUP_UPDATE`.
* **`toggleServiceActiveAction(serviceId: string, isActive: boolean)`**
  * Permission required: `catalog`, `edit`
  * Action: Switches a single service status.
  * Audit Log action: `SERVICE_ENABLE` / `SERVICE_DISABLE`.

### B. Category Actions (`src/actions/admin/catalog/categories.ts`)
CRUD operations for categories.

* **`createCategory(rawData: { name: string; networkId: string; sort: number })`**
  * Permission required: `CATALOG`, `edit`
  * Action: Parses via Zod `categorySchema` and inserts into DB.
  * Audit Log action: `CATEGORY_CREATE`.
* **`updateCategory(rawId: string, rawData: { name: string; networkId: string; sort: number })`**
  * Permission required: `CATALOG`, `edit`
  * Action: Updates fields based on Category ID.
  * Audit Log action: `CATEGORY_UPDATE`.
* **`deleteCategory(rawId: string)`**
  * Permission required: `CATALOG`, `edit`
  * Action: Counts associated services first. **If services count > 0, returns a validation error.** Otherwise, deletes the category.
  * Audit Log action: `CATEGORY_DELETE`.

### C. Admin Catalog Service (`src/services/admin/catalog.service.ts`)
Encapsulates main business logic. Key operations:

* **`listServices(params: { cursor?, search?, categoryId?, pageSize? })`**
  * Performs query with `categoryId`, supports `contains` case-insensitive search by name or exact numeric ID, resolves network and categories.
* **`syncProviderCatalog(providerId: string, admin)`**
  * Synchoronizes provider catalog. Finds zombies (removed by provider) and disables them with `cooldownReason = 'ZOMBIE_AUTO_DISABLED'`.
  * Prevents price spike anomaly (quarantines service if price drift exceeds 20% or if markup drops below Safety Floor).
* **`importServices(externalIds: string[], categoryId: string, defaultMarkup: number, admin, providerId)`**
  * Cherry-picks services from a shadow Redis catalog cache (`provider:${providerId}:shadow_catalog`). Performs a live price check from the provider before importing to prevent cache poisoning.
* **`bulkUpdateMarkup(filter: { categoryId?, platform? }, newMarkup: number, admin)`**
  * Applies bulk pricing updates in batches of 50 via transaction.

### D. Admin Audit Logging Helper (`src/lib/admin-audit.ts`)
Provides methods to safely serialize payload and write audit records.

* **`safeSerialize(value: unknown): string | null`**
  * Recursively converts `BigInt` to string, handles circular references, date formatting, and scrubs sensitive keys (e.g. `password`, `hash`, `token`, `secret`, `key`, `yookassa`, `vault`).
* **`auditAdmin(params: { adminId, adminEmail, action, target, targetType, oldValue?, newValue?, ipAddress? })`**
  * Non-blocking call (`void db.adminAuditLog.create(...).catch(...)`) to ensure audit failures do not crash the primary action.
* **`auditAdminAwaitable(...)`**
  * Awaitable version for critical security/financial changes where persistence is mandatory.

### E. Staff RBAC (`src/lib/server/rbac.ts`)
Granular Role-Based Access Control wrapper.

* **`requireStaffPermission(section: string, actionMode: 'view' | 'edit', action)`**
  * Direct OWNER roles bypass all checks.
  * For staff, normalizes sections using `.toUpperCase()`. Verifies permissions in `StaffPermission` table.
* **`requireOwnerPermission(action)`**
  * Strict guard allowing execution only for OWNER users.
* **`enforcePageRole(allowedRoles: string[])`**
  * Verifies session inside Page components. Redirects to `/login` if unauthenticated, or to `/admin/orders` if unauthorized.

---

## 3. Frontend Pages & Components

### A. Catalog List Page (`src/app/admin/catalog/page.tsx`)
A Next.js Server Component page that enforces roles and fetches essential metadata in parallel.

* **Layout:** Dual layout. A left side panel listing all categories and total service counts, a center/right pane containing page headers, quarantine count badges, anomaly warnings, search filter input, bulk markup tools, and the services list.
* **Data Retrieval:**
  ```typescript
  const [
    { items: rawServices, nextCursor, hasMore },
    usdToRub,
    categories,
    quarantineCount,
    stats,
    markupAnalytics
  ] = await Promise.all([
    adminCatalogService.listServices({ ... }),
    SettingsProvider.getExchangeRateUSD(),
    adminCatalogService.listCategories(),
    adminCatalogService.getQuarantineCount(),
    adminCatalogService.getCatalogStats(),
    adminCatalogService.getMarkupAnalytics(),
  ]);
  ```

### B. Catalog Table Component (`src/components/admin/catalog-table-v2.tsx`)
A client component that handles interactive states, row multi-selection, status toggling, and inline price edits.

* **Interactive Elements:**
  * **Multi-selection:** Multi-checkbox management that unlocks the `BatchActionBar` at the top of the table.
  * **StatusToggle:** Updates `isActive` using `toggleServiceActiveAction`.
  * **ArchiveButton:** Performs a soft delete via `softDeleteServiceAction`.
  * **InlinePriceCell:** Standardized input that accepts local RUB pricing, computes the markup internally on-the-fly (`newPrice / providerCostRub`), protects against Safety Floor breach (shows a warning toast and reverts), and saves the update on input blur or Enter.
* **Mock HeroUI Table Imports:**
  It is important to note that the Smmplan codebase provides a mock wrapper in `src/components/admin/hero-ui.tsx` that exposes Shadcn table components under a unified dot-notation interface (e.g. `Table.Header`, `Table.Column`, `Table.Row`, `Table.Cell`, `Table.ScrollContainer`, `Table.Content`), though `catalog-table-v2.tsx` imports from `@heroui/react` directly.

### C. Category List Page (`src/app/admin/catalog/categories/page.tsx`)
Enforces Server Component rendering. Fetches categories ordered by `network` and `sort`, fetches networks, and supplies them to the client-side manager.

### D. Category Manager Component (`src/app/admin/catalog/categories/components/category-manager.tsx`)
A client component providing form actions for adding, editing, and deleting categories.

* **Component Signature:**
  ```typescript
  export function CategoryManager({ categories, networks }: { categories: any[], networks: any[] })
  ```
* **Actions:** Matches form submissions to `createCategory` or `updateCategory`. Handles deletion by calling `deleteCategory(id)` and displaying error messages if validation fails (e.g. category has active services).
* **UI Table:** Imports `Table` from `@/components/admin/hero-ui` which maps dot-notation calls to the shadcn-adapted mock definitions.

---

## 4. Providers Fetching Logic

Smmplan manages provider catalogs and instances using `ProviderService` (`src/services/providers/provider.service.ts`):

* **Fetch Active Providers:**
  ```typescript
  async getActiveProviders(): Promise<Provider[]> {
    return db.provider.findMany({ where: { isActive: true } });
  }
  ```
* **Fetch Admin-Safe Providers List (no credentials exposed):**
  Using `src/services/admin/provider.service.ts`:
  ```typescript
  async listProviders(): Promise<ProviderListDTO[]>
  ```
* **Provider Instantiation:**
  Retrieves a configured instance, decrypting credentials using `VaultService.decrypt(config.apiKey)`.
  ```typescript
  async getProviderInstance(config: Provider): Promise<BaseProvider>
  ```
* **Worker Redirection (QA Isolation):**
  Uses `getWorkerProviderInstance(config)` to redirect all outgoing requests during QA/test mode to a localized mock environment API.

---

## 5. Testing Setup & Architecture (Vitest)

Smmplan utilizes a robust Vitest testing structure optimized for PostgreSQL isolation, concurrency, and sandbox execution.

### Config Files
* **`vitest.config.ts`**: Standard configuration containing node environment settings, setup files mapping, module aliases (`@/`), and strict coverage thresholds (100% target for services, actions).
* **`vitest.unit.config.ts`**: Lightweight override specifically optimized for fast mock-based unit tests.

### Sandbox Setup (`test/setup.ts`)
* **Accidental DB Wipe Protection:** Before executing hooks, it checks if `DATABASE_URL` contains `test` or `smmplan_test`. If it does not, **it blocks execution and throws a fatal error to protect production/development databases.**
* **Automatic Database Truncation:** Contains a `beforeEach` routine that fetches all public tables (excluding migrations) and truncates them using:
  ```sql
  TRUNCATE TABLE "TableName" RESTART IDENTITY CASCADE;
  ```
* **System Seed:** Re-creates the `"global"` system settings block before each test to eliminate race conditions on settings retrieval.
* **Global Mocks:** Automatically mocks Next.js cache APIs (`revalidatePath`, `revalidateTag`) and stubs global `fetch` calls.
