# Структурные ошибки TypeScript (без каскада Prisma) — 2026-09-23

Источник: `NODE_OPTIONS=--max-old-space-size=3000 node node_modules/typescript/lib/tsc.js --noEmit --pretty false` на коммите `54b8a77f`.
Всего диагностик: 717. Каскадных (нет сгенерированного Prisma Client): 679 (TS7006/TS7031/TS18046 — 543, TS2307/TS2305/TS2694 — 136). Ниже — 38 структурных.
Проверено экспериментально: просачивание `any` не порождает TS2322/TS2365/TS2367, т.е. денежные диагностики — реальные.

```
src/actions/admin/clients.ts(684,9): error TS2365: Operator '+=' cannot be applied to types 'bigint' and 'number'.
src/actions/admin/users.ts(123,12): error TS18047: 'policyCheck' is possibly 'null'.
src/app/admin/catalog/quarantine/page.tsx(184,32): error TS2339: Property 'numericId' does not exist on type '{}'.
src/app/admin/catalog/quarantine/page.tsx(185,27): error TS2339: Property 'name' does not exist on type '{}'.
src/app/admin/catalog/quarantine/page.tsx(186,28): error TS2339: Property 'category' does not exist on type '{}'.
src/app/admin/catalog/quarantine/page.tsx(187,27): error TS2339: Property 'category' does not exist on type '{}'.
src/app/admin/catalog/quarantine/page.tsx(188,26): error TS2339: Property 'provider' does not exist on type '{}'.
src/app/admin/catalog/quarantine/page.tsx(189,28): error TS2339: Property 'provider' does not exist on type '{}'.
src/app/admin/catalog/quarantine/page.tsx(190,26): error TS2339: Property 'externalId' does not exist on type '{}'.
src/app/admin/clients/[id]/page.tsx(210,7): error TS2365: Operator '+=' cannot be applied to types 'bigint' and 'number'.
src/lib/finance/reconciliation.ts(73,5): error TS2322: Type 'number' is not assignable to type 'bigint'.
src/lib/finance/reconciliation.ts(78,52): error TS2367: This comparison appears to be unintentional because the types 'number' and 'bigint' have no overlap.
src/lib/finance/reconciliation.ts(129,5): error TS2322: Type 'number' is not assignable to type 'bigint'.
src/services/admin/catalog.service.ts(974,36): error TS2339: Property 'rate' does not exist on type '{}'.
src/services/admin/catalog.service.ts(1102,13): error TS2345: Argument of type '{}' is not assignable to parameter of type 'ProviderComparisonInput'.
src/services/admin/catalog.service.ts(1213,34): error TS2339: Property 'min' does not exist on type '{}'.
src/services/admin/catalog.service.ts(1214,34): error TS2339: Property 'max' does not exist on type '{}'.
src/services/admin/catalog.service.ts(1221,44): error TS2339: Property 'name' does not exist on type '{}'.
src/services/admin/catalog.service.ts(1223,104): error TS2339: Property 'name' does not exist on type '{}'.
src/services/admin/catalog.service.ts(1645,77): error TS2339: Property 'toLowerCase' does not exist on type '{}'.
src/services/admin/catalog.service.ts(1655,81): error TS2339: Property 'id' does not exist on type '{}'.
src/services/admin/catalog.service.ts(1663,81): error TS2339: Property 'id' does not exist on type '{}'.
src/services/admin/catalog.service.ts(1744,81): error TS2339: Property 'name' does not exist on type '{}'.
src/services/admin/catalog.service.ts(1917,34): error TS2339: Property 'providerCurrency' does not exist on type '{}'.
src/services/admin/catalog.service.ts(1935,60): error TS2339: Property 'name' does not exist on type '{}'.
src/services/admin/catalog.service.ts(1959,56): error TS2339: Property 'name' does not exist on type '{}'.
src/services/financial/ledger-reconciliation.service.ts(339,13): error TS2367: This comparison appears to be unintentional because the types 'number' and 'bigint' have no overlap.
src/services/financial/nightly-ledger-audit.service.ts(59,41): error TS2339: Property 'balance' does not exist on type '{}'.
src/services/financial/nightly-ledger-audit.service.ts(64,26): error TS2339: Property 'id' does not exist on type '{}'.
src/services/financial/nightly-ledger-audit.service.ts(65,29): error TS2339: Property 'email' does not exist on type '{}'.
src/services/financial/nightly-ledger-audit.service.ts(66,28): error TS2339: Property 'tenantId' does not exist on type '{}'.
src/services/operator/users/client-financial-summary.query.ts(76,9): error TS2365: Operator '+=' cannot be applied to types 'bigint' and 'number'.
src/services/operator/users/client-financial-summary.query.ts(79,9): error TS2365: Operator '+=' cannot be applied to types 'bigint' and 'number'.
src/services/system/feature-flag.service.ts(113,21): error TS2339: Property 'id' does not exist on type '{}'.
src/services/system/feature-flag.service.ts(117,25): error TS2339: Property 'state' does not exist on type '{}'.
src/services/system/feature-flag.service.ts(118,28): error TS2339: Property 'updatedBy' does not exist on type '{}'.
src/services/system/feature-flag.service.ts(119,28): error TS2339: Property 'updatedAt' does not exist on type '{}'.
src/utils/balance-verifier.ts(60,35): error TS2367: This comparison appears to be unintentional because the types 'number' and 'bigint' have no overlap.
```
