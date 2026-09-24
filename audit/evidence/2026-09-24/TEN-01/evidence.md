# Доказательства ремедиации TEN-01 (Изоляция SupportFinancialAction в мульти-тенантности)

## До исправления (Before)
1. В `src/lib/prisma-tenant-enforcer.ts` модель `supportFinancialAction` отсутствовала в списке `TENANT_SCOPED_MODELS`. В результате запросы к таблице `SupportFinancialAction` не защищались автоматическим внедрением `where.tenantId` и проверкой на несанкционированный кросс-тенантный доступ.
2. В `src/actions/admin/support-review.ts` методы `getSupportActionsReviewListAction`, `reviewSupportFinancialAction` и `exportSupportActionsCSVAction` выполняли выборки и выгрузку в CSV по всем операторам всех сайтов без фильтра по текущему активному `tenantId`.
3. В `src/actions/admin/users.ts` проверка дублирования `supportFinancialAction.findFirst({ where: { idempotencyKey } })` выполнялась без привязки к `targetUser.tenantId`.
4. В `scripts/lint-tenant-isolation.ts` модель отсутствовала в целевом наборе, что позволяло проходить проверку коду без фильтрации по `tenantId`.

## После исправления (After)
1. В `src/lib/prisma-tenant-enforcer.ts` добавлена `supportFinancialAction` в `TENANT_SCOPED_MODELS`:
   ```typescript
   export const TENANT_SCOPED_MODELS = [
     'order',
     'payment',
     'ticket',
     'user',
     'service',
     'category',
     'customerGroup',
     'ticketFeedback',
     'promoCode',
     'ledgerEntry',
     'supportFinancialAction',
   ] as const;
   ```
2. В `scripts/lint-tenant-isolation.ts` добавлена `supportfinancialaction` в `TENANT_SCOPED_MODELS`.
3. В `src/actions/admin/support-review.ts`:
   - `getSupportActionsReviewListAction` scoped по `tenantId: resolvedTenant`.
   - `reviewSupportFinancialAction` проверяет операцию через `findFirst({ where: { id: actionId, tenantId: resolvedTenant } })`.
   - `exportSupportActionsCSVAction` фильтрует выборку по `tenantId: resolvedTenant`.
4. В `src/actions/admin/users.ts` добавлено условие `...(targetUser.tenantId ? { tenantId: targetUser.tenantId } : {})`.
5. В `src/lib/security/worker-tenant-guard.ts` устранена уязвимость нормализации и убран фантомный бренд.

## Верификация:
- `npm run lint:tenant` — 0 BLOCKERS (PASS, код выхода 0).
- `npx dotenv -e .env.test -- vitest run src/__tests__/security/worker-tenant-guard.test.ts` — 4/4 PASS (100%).
- `npx dotenv -e .env.test -- vitest run src/__tests__/security/tenant-audit-isolation.test.ts` — 3/3 PASS (100%).
- `npx tsc --noEmit` — 0 ошибок (PASS).
