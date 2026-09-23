# Структурные ошибки TypeScript на ветке main (c691e8b2) — 2026-09-23

Источник: `NODE_OPTIONS=--max-old-space-size=3000 node node_modules/typescript/lib/tsc.js --noEmit --pretty false` в worktree `main` (c691e8b2).
Всего диагностик: 722. Структурных (без каскада отсутствующего Prisma Client): 43.
Для сравнения: baseline `54b8a77f` — 717 диагностик / 38 структурных.

```
src/actions/admin/clients.ts(715,9): error TS2365: Operator '+=' cannot be applied to types 'bigint' and 'number'.
src/actions/admin/users.ts(129,12): error TS18047: 'policyCheck' is possibly 'null'.
src/app/admin/catalog/quarantine/page.tsx(186,32): error TS2339: Property 'numericId' does not exist on type '{}'.
src/app/admin/catalog/quarantine/page.tsx(187,27): error TS2339: Property 'name' does not exist on type '{}'.
src/app/admin/catalog/quarantine/page.tsx(188,28): error TS2339: Property 'category' does not exist on type '{}'.
src/app/admin/catalog/quarantine/page.tsx(189,27): error TS2339: Property 'category' does not exist on type '{}'.
src/app/admin/catalog/quarantine/page.tsx(190,26): error TS2339: Property 'provider' does not exist on type '{}'.
src/app/admin/catalog/quarantine/page.tsx(191,28): error TS2339: Property 'provider' does not exist on type '{}'.
src/app/admin/catalog/quarantine/page.tsx(192,26): error TS2339: Property 'externalId' does not exist on type '{}'.
src/app/admin/clients/[id]/page.tsx(210,7): error TS2365: Operator '+=' cannot be applied to types 'bigint' and 'number'.
src/lib/finance/reconciliation.ts(73,5): error TS2322: Type 'number' is not assignable to type 'bigint'.
src/lib/finance/reconciliation.ts(78,52): error TS2367: This comparison appears to be unintentional because the types 'number' and 'bigint' have no overlap.
src/lib/finance/reconciliation.ts(129,5): error TS2322: Type 'number' is not assignable to type 'bigint'.
src/services/admin/analytics.service.ts(77,28): error TS2339: Property 'name' does not exist on type '{}'.
src/services/admin/analytics.service.ts(78,29): error TS2339: Property 'category' does not exist on type '{}'.
src/services/admin/catalog/catalog-import.service.ts(157,7): error TS2322: Type 'Map<unknown, unknown>' is not assignable to type 'Map<string, string | null>'.
src/services/admin/catalog/catalog-import.service.ts(158,7): error TS2322: Type 'Map<unknown, unknown>' is not assignable to type 'Map<string, string>'.
src/services/admin/catalog/catalog-import.service.ts(159,7): error TS2322: Type 'Map<unknown, unknown>' is not assignable to type 'Map<string, { id: string; name: string; slug: string; } | null>'.
src/services/admin/catalog/catalog-import.service.ts(160,7): error TS2322: Type 'Map<unknown, unknown>' is not assignable to type 'Map<string, { id: string; name: string; slug: string; }>'.
src/services/admin/catalog/catalog-import.service.ts(282,81): error TS2339: Property 'name' does not exist on type '{}'.
src/services/admin/catalog/catalog-sync.service.ts(349,36): error TS2339: Property 'rate' does not exist on type '{}'.
src/services/admin/catalog/catalog-sync.service.ts(571,34): error TS2339: Property 'providerCurrency' does not exist on type '{}'.
src/services/admin/catalog/catalog-sync.service.ts(588,60): error TS2339: Property 'name' does not exist on type '{}'.
src/services/admin/catalog/catalog-sync.service.ts(610,56): error TS2339: Property 'name' does not exist on type '{}'.
src/services/admin/order/order-analytics.service.ts(178,21): error TS2339: Property 'name' does not exist on type '{}'.
src/services/admin/order/order-analytics.service.ts(179,28): error TS2339: Property 'category' does not exist on type '{}'.
src/services/admin/order/order-analytics.service.ts(180,29): error TS2339: Property 'category' does not exist on type '{}'.
src/services/financial/ledger-reconciliation.service.ts(339,13): error TS2367: This comparison appears to be unintentional because the types 'number' and 'bigint' have no overlap.
src/services/financial/nightly-ledger-audit.service.ts(59,41): error TS2339: Property 'balance' does not exist on type '{}'.
src/services/financial/nightly-ledger-audit.service.ts(64,26): error TS2339: Property 'id' does not exist on type '{}'.
src/services/financial/nightly-ledger-audit.service.ts(65,29): error TS2339: Property 'email' does not exist on type '{}'.
src/services/financial/nightly-ledger-audit.service.ts(66,28): error TS2339: Property 'tenantId' does not exist on type '{}'.
src/services/operator/users/client-financial-summary.query.ts(75,9): error TS2365: Operator '+=' cannot be applied to types 'bigint' and 'number'.
src/services/operator/users/client-financial-summary.query.ts(78,9): error TS2365: Operator '+=' cannot be applied to types 'bigint' and 'number'.
src/services/providers/quarantine.service.ts(173,72): error TS2339: Property 'id' does not exist on type '{}'.
src/services/providers/quarantine.service.ts(181,93): error TS2339: Property 'id' does not exist on type '{}'.
src/services/providers/quarantine.service.ts(182,73): error TS2339: Property 'id' does not exist on type '{}'.
src/services/providers/quarantine.service.ts(182,88): error TS2339: Property 'name' does not exist on type '{}'.
src/services/system/feature-flag.service.ts(126,21): error TS2339: Property 'id' does not exist on type '{}'.
src/services/system/feature-flag.service.ts(130,25): error TS2339: Property 'state' does not exist on type '{}'.
src/services/system/feature-flag.service.ts(131,28): error TS2339: Property 'updatedBy' does not exist on type '{}'.
src/services/system/feature-flag.service.ts(132,28): error TS2339: Property 'updatedAt' does not exist on type '{}'.
src/utils/balance-verifier.ts(60,35): error TS2367: This comparison appears to be unintentional because the types 'number' and 'bigint' have no overlap.
```
