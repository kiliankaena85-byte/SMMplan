# SPEC-2026-09-24: Admin Panel Zero-Latency Remaster & Multi-Tier Caching Architecture

## 1. Problem Statement & Executive Summary

Following the successful deployment of the zero-latency catalog pre-hydration on the storefront, performance audits of the OmniSMM 1.0 admin panel revealed critical bottlenecks affecting operator experience:

1. **Dashboard Heavy Aggregate Storm (`/admin/dashboard` — TTFB 1.8–3.2s):**
   - The dashboard executes 13 parallel queries via `Promise.all`. Within these queries, multiple services execute heavy sequential queries on every page hit:
     - `accountingService.getMetrics`: Executes 6 queries (payment `groupBy`, `refundedOrders` scan of up to 5000 rows with JS processing, raw SQL `SUM(COGS)` across orders, `findUnique` system settings, `annualPayments` aggregate, `annualRefunds` aggregate) without any Redis caching.
     - `accountingService.getGatewayBreakdown`: Runs 2 payment aggregations live.
     - `adminOrderService.getOrdersTimeseries`: Runs raw `DATE_TRUNC` and `COUNT(*)` over orders without caching.
     - `adminTicketService.getTicketStats`: Runs 5 counts, followed by 2 sequential un-capped `findMany` queries (`resolvedTickets` and `respondedTickets`) to compute SLA metrics.
     - `adminUserService.getUserStats`: Runs 3 user counts and 1 user balance aggregate live.
   - When an operator navigates to or refreshes the dashboard, or changes the period dropdown (`all`, `today`, `yesterday`, `7d`, `30d`), all queries hit PostgreSQL simultaneously, saturating connection pool limits and inflating TTFB to 1.8–3.2 seconds.

2. **Uncached Catalog & Navigation Metadata (N+1 in Navigation):**
   - In `/admin/catalog/page.tsx`, every pagination click (`?page=2`) and search query re-fetches `adminCatalogService.listCategories`, `adminProviderService.listProviders`, `db.network.findMany`, and `adminCatalogService.getCatalogHealthCounts` without caching.
   - In `/admin/catalog/categories/page.tsx`, switching to the categories tab executes sequential queries (`db.category.findMany` followed by `db.service.groupBy`) without caching.
   - While `/admin/orders/page.tsx` introduced local `unstable_cache` helpers, they are isolated to that single route rather than shared across the admin panel.

3. **Sequential Waterfall in Treasury & Client-Side Blank Flash in Balance Requests:**
   - `/admin/finance/treasury`: `getTreasuryFinancialHealthAction` executes an Alfa-Bank API check, then sequentially `db.user.aggregate`, `db.order.aggregate`, `db.payment.aggregate`, `db.provider.count`, and USD exchange rate lookup (`await` after `await`), leading to 2.5–4.0s load times.
   - `/admin/finance/balance-requests`: Relies entirely on client-side `useEffect` to fetch data, displaying a blank screen/spinner before loading.

---

## 2. Invariants & Architecture Guardrails

1. **Zero-Latency Dashboard Invariant (NFR P95 < 200ms):**
   - Hot metrics (`accountingService.getMetrics`, `adminOrderService.getOrdersTimeseries`, `adminTicketService.getTicketStats`, `adminUserService.getUserStats`) must be cached in Redis with a TTL of 60–120 seconds.
   - Cache hits must return in **< 10ms**.
   - An explicit `forceRefresh` option must be supported to allow operators to bypass the cache when needed.

2. **Multi-Tenant Cache Isolation Invariant:**
   - Every Redis cache key must strictly include the normalized tenant ID (`admin:metrics:${tenantId}:${period}`).
   - Cross-tenant data leakage (Brand Bleeding) is strictly prohibited.

3. **Degraded Mode / Resilience Invariant:**
   - In the event of a Redis network blip or disconnection, all methods must transparently fall back to direct PostgreSQL query execution without throwing unhandled exceptions.

4. **Centralized Metadata Registry Invariant:**
   - Categories, networks, and providers for admin filtering must use centralized cached getters (`getCachedAdminCategories`, `getCachedAdminProviders`, `getCachedNetworks`) backed by Next.js `unstable_cache` with tag-based invalidation.

5. **Financial & Ledger Integrity Invariant:**
   - All balance, turnover, and liability numbers must remain strictly typed in `BigInt` (kopecks) with exact math precision.

---

## 3. Detailed Component Architecture

### Pillar 1: Dashboard Redis Caching
- `src/services/financial/accounting.service.ts`:
  - Wrap `getMetrics(startDate, endDate, tenantId, forceRefresh?)` with Redis cache (key `admin:metrics:${tenantId || 'all'}:${periodKey}`, TTL 120s).
  - Wrap `getGatewayBreakdown(startDate, endDate, tenantId, forceRefresh?)` with Redis cache (key `admin:gateways:${tenantId || 'all'}:${periodKey}`, TTL 120s).
- `src/services/admin/order.service.ts`:
  - Upgrade `getOrderStats` from process-local `Map` to Redis cache (key `admin:order_stats:${tenantId || 'all'}:${dateKey}`, TTL 60s).
  - Wrap `getOrdersTimeseries` with Redis cache (key `admin:timeseries:${tenantId || 'all'}:${step}:${dateKey}`, TTL 120s).
- `src/services/admin/ticket.service.ts`:
  - Parallelize SLA queries in `getTicketStats` and wrap with Redis cache (key `admin:ticket_stats:${tenantId || 'all'}:${dateKey}`, TTL 60s).
- `src/services/admin/user.service.ts`:
  - Wrap `getUserStats` with Redis cache (key `admin:user_stats:${tenantId || 'all'}:${dateKey}`, TTL 60s).

### Pillar 2: Centralized Admin Catalog & Provider Cache
- `src/services/admin/admin-cache.registry.ts`:
  - Create centralized cache module for admin:
    - `getCachedAdminCategories(tenantId?: string)`
    - `getCachedAdminProviders()`
    - `getCachedAdminNetworks()`
    - `getCachedCatalogHealth(tenantId?: string)`
    - `invalidateAdminCatalogCache()`
- Integrate into:
  - `src/app/admin/catalog/page.tsx`
  - `src/app/admin/catalog/categories/page.tsx`
  - `src/app/admin/orders/page.tsx`

### Pillar 3: Treasury Parallelization & Balance Requests SSR Pre-hydration
- `src/actions/admin/finance/treasury.ts`:
  - Refactor `getTreasuryFinancialHealthAction` to execute Alfa-Bank balance, user deposits, active orders cost, quarter inflow, and exchange rate concurrently via `Promise.all`.
  - Cache report in Redis (TTL 60s, key `admin:treasury:${tenantId}`).
- `src/app/admin/finance/balance-requests/page.tsx`:
  - Fetch initial balance adjustments and counts during SSR and pass to `BalanceRequestsClient` as `initialData`.

---

## 4. Verification Plan

1. **Unit & Integration Tests:**
   - `src/__tests__/admin-panel-zero-latency.test.ts`:
     - Test cache hit and miss behavior for accounting metrics.
     - Test tenant isolation in cache keys (`smmplan` vs `flux`).
     - Test fallback on Redis connection error.
     - Test `forceRefresh` bypass parameter.
     - Test Treasury parallel execution result consistency.
2. **Type Checking & Secret Scan:**
   - `npx tsc --noEmit` -> 0 errors.
   - `node scripts/check-bundle-secrets.mjs` -> 0 leaks.
3. **Vitest Suite:**
   - `npx vitest run src/__tests__/admin-panel-zero-latency.test.ts`.
