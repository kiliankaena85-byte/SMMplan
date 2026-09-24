# SPEC-2026-09-24: Zero-Latency Catalog Pre-hydration & Admin Performance Remediation

## 1. Problem Statement & Executive Summary
Audits of the OmniSMM 1.0 platform revealed two major performance bottlenecks:
1. **Storefront / Catalog First Social Network Switch Latency:**
   - The entire active catalog across all 13 social networks and 84 categories comprises only **246 active services** (208.9 KB raw JSON, **20.7 KB gzipped**).
   - SSR currently pre-fetches services for only 1 category (Telegram Subscribers). Switching to any of the other 12 networks triggers an on-demand Server Action roundtrip (280–420ms local, 800–1600ms on mobile/tunnel).
   - While the request is in flight, `services` in `useOrderEngine.ts` is not cleared, causing "Zombie Tariffs" (Telegram cards shown at `opacity-60` under a newly selected network badge like VK).
   - Legacy redirect for `/boost` in `proxy.ts` points to `/services/telegram/busty`, which fails route matching (the DB category slug is `telegram-busty-dlya-kanalov`), resulting in a soft 404.
   - Rule 4.1 violations: `PlanSlideOrderClient.tsx`, `FluxDashboardOrderWizard.tsx`, and `FluxOrderClient.tsx` use the forbidden `s.targetType || inferTargetTypeFromName(s.name)` pattern instead of `resolveServiceTargetType(s)`.
   - Storefront API `/api/storefront/v1/catalog` executes an N+1 query loop across all 84 categories.

2. **Admin Panel Performance Bottlenecks:**
   - `/admin/dashboard`: Sequential query `oldestOrder` blocks the main `Promise.all` block. 13 parallel queries risk connection pool exhaustion. `getTopServices` and `accountingService.getMetrics` perform unbounded `findMany` queries without `take`, presenting severe Out-Of-Memory (OOM) risks.
   - `/admin/orders`: Sequential execution of `searchOrders` and `getOrderStats`. Large HTML payload (424 KB) on page 1 due to 50 rows each with modals and badges.
   - `/admin/catalog`: Default `pageSize=50` generates 538 KB HTML. `getMarkupAnalytics` performs a full table scan and JS loop across all services on every single pagination click (`?page=2`, `?page=3`).
   - `/admin/finance`: `LedgerReconciliationService.getSummary` executes a full table join between `User` and `LedgerEntry` on every load without caching.

---

## 2. Invariants & Architecture Guardrails

1. **Catalog Pre-hydration Invariant:**
   - `getCachedNetworks(tenantId)` embeds `services: PublicService[]` directly into each `PublicCategory`.
   - Client stores (`useOrderEngine.ts`, `PlanSlideOrderClient.tsx`, `MobileCatalogModal.tsx`, `useSmmplanOrderWizard.ts`) initialize their service caches synchronously from `initialCatalog`.
   - First social network switch latency must be **< 16 ms** (0ms perceptual delay, 0 network requests).

2. **Zero-Zombie-Tariffs Invariant:**
   - If switching to an uncached category/network, cards of the previous network must never be displayed with `opacity-60` under the wrong network header.

3. **Rule 4.1 TargetType Resolution Invariant:**
   - Strictly use `resolveServiceTargetType(service)` from `@/utils/target-type-mapper`.
   - Never use `s.targetType || inferTargetTypeFromName(s.name)`.

4. **Database Query Safety Invariant:**
   - No unbounded `findMany` queries on tables with transactional volume (`Order`, `LedgerEntry`).
   - All dashboard aggregations must use native PostgreSQL `GROUP BY` and `take`/`limit`.

5. **Multi-Tenant & Fiscal Invariants:**
   - Tenant isolation maintained across all operations (`smmplan` / `smmflux`).
   - All financial amounts strictly in BigInt (kopecks).

---

## 3. Detailed Component Changes

### 3.1 Storefront & Catalog
- `src/actions/order/catalog.ts`:
  - Update `getCachedNetworks` to include full service definitions and map them via `mapRawServiceToPublicService` with CBR exchange rate.
  - Extend `PublicCategory` with `services?: PublicService[]`.
  - Increase cache revalidation TTL to 3600 seconds.
- `src/hooks/useOrderEngine.ts`:
  - Prefill `categoryServicesCache` from `sortedInitialCatalog` across all categories.
  - Reset stale services when switching `networkId` to prevent zombie cards on cache miss.
- `src/components/landing/order-engine/variants/PlanSlideOrderClient.tsx`:
  - Replace `s.targetType || inferTargetTypeFromName(s.name)` with `resolveServiceTargetType(s)`.
  - Pre-populate category services cache from `initialNetworks`.
- `src/components/dashboard/flux/FluxDashboardOrderWizard.tsx`:
  - Replace `s.targetType || inferTargetTypeFromName(s.name)` with `resolveServiceTargetType(s)`.
- `src/components/ab-test/FluxOrderClient.tsx`:
  - Replace `s.targetType || inferTargetTypeFromName(s.name)` with `resolveServiceTargetType(s)`.
- `src/proxy.ts`:
  - Update legacy redirects: `/boost` and `/telegram/boost` point to `/services/telegram/telegram-busty-dlya-kanalov`.
- `src/app/services/[network]/[category]/page.tsx`:
  - Add slug alias normalization for `busty`/`boost`/`boosts` to match `telegram-busty-dlya-kanalov`.
- `src/app/api/storefront/v1/catalog/route.ts`:
  - Batch fetch services to eliminate the sequential 84-roundtrip N+1 loop.
- `prisma/schema.prisma`:
  - Add index `@@index([tenantId, categoryId, isActive, isQuarantined, rate])` to `Service`.

### 3.2 Admin Panel Performance
- `src/services/admin/order.service.ts`:
  - Refactor `getTopServices` to use Prisma `db.order.groupBy` with `take: limit` and `_sum: { charge: true, providerCost: true }`.
- `src/services/financial/accounting.service.ts`:
  - In `getMetrics`, bound the `refundedOrders` query (`take: 5000`) and handle partial refunds safely.
- `src/app/admin/dashboard/page.tsx`:
  - Include `oldestOrder` lookup within the concurrent queries or use default fallback if period is `'all'`.
- `src/services/financial/ledger-reconciliation.service.ts`:
  - Cache reconciliation summary in Redis (TTL 300s) to avoid full `User` LEFT JOIN `LedgerEntry` on every dashboard visit.
- `src/services/admin/catalog.service.ts`:
  - Cache `getMarkupAnalytics` in Redis (TTL 300s) keyed by tenant.
- `src/app/admin/orders/page.tsx`:
  - Parallelize `searchOrders`, `getOrderStats`, and cached metadata lookups with `Promise.all`.
- `src/app/admin/catalog/page.tsx`:
  - Change default `pageSize` from 50 to 25.

---

## 4. Verification Plan

1. **Unit & Integration Tests (`vitest`):**
   - Verify `getCachedNetworks` embeds `services` in each category.
   - Verify `useOrderEngine` cache pre-population across all 13 networks.
   - Verify Rule 4.1: `resolveServiceTargetType` handles `targetType: "POST"` with channel names correctly.
   - Verify `/boost` slug resolution and redirects.
   - Verify `getTopServices` uses `groupBy` with bounded results.
   - Verify `LedgerReconciliationService` Redis caching.
2. **Type Safety & Linting:**
   - `npx tsc --noEmit` (0 errors).
   - `node scripts/check-bundle-secrets.mjs` (0 secret leaks).
   - `npm run lint:tenant` (0 blockers).
