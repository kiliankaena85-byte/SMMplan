# СПЕЦИФИКАЦИЯ (SDD-TDD — RAC-2026)
# Пакет 2: Финансовая изоляция P1 (Telegram Smart Bind, Escrow-карантин, ManualBalanceAdjustment)

> **Статус:** APPROVED & IN PROGRESS  
> **Версия:** 1.0.0 (OmniSMM 1.0 RAC-2026)  
> **Дата:** 22.09.2026  
> **Контур:** Tier 1 (Финансовый леджер, Telegram Smart Bind, Escrow-карантин, ManualBalanceAdjustment)  
> **Методология:** SDD (Spec-Driven Development) + TDD (Test-Driven Development)

---

## 1. Контекст инцидентов и выявленные уязвимости

В рамках аудита финансовой изоляции платформы OmniSMM 1.0 (обслуживающей бренды `SMMplan` и `SMMflux`) согласованы и утверждены к реализации 3 критические задачи:

### 1. [VULN-03] Межтенантное слияние и перенос баланса через Telegram Smart Bind
- **Проблема:** При создании токена авторизации привязки Telegram `db.authToken.create` в `src/actions/user/settings/telegram.action.ts` поле `tenantId` не передавалось, по умолчанию становясь `smmplan`. При обработке `/start tg_bind_...` в `src/bot/constructors/role-handlers.ts:705-728` бот сливал временного Telegram-пользователя `tempUser` с веб-пользователем `webUserId` без сверки совпадения `tenantId`. Это позволяло инициировать перенос заказов, тикетов и баланса (`tempUser.balance`) между аккаунтами разных брендов (`smmplan` <-> `flux`).
- **Решение:**
  1. В `src/actions/user/settings/telegram.action.ts`: явно сохранять `tenantId: tenantId` в `db.authToken.create`.
  2. В `src/bot/constructors/role-handlers.ts`: при слиянии проверять совпадение `tenantId`:
     ```typescript
     const webUser = await tx.user.findUnique({ where: { id: webUserId } });
     if (tempUser && webUser && tempUser.tenantId !== webUser.tenantId) {
       throw new Error('КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО объединять аккаунты разных брендов (SMMplan / SMMflux)');
     }
     ```
  3. Если бренды не совпадают или `webUser.tenantId !== tenantId`, транзакция слияния отменяется, баланс сохраняется на исходном аккаунте.

### 2. [VULN-05] Межтенантная утечка записей Escrow-карантина
- **Проблема:** Метод `escrowService.getQuarantineEntries()` в `src/services/admin/escrow.service.ts` не принимал `tenantId` и возвращал все записи `LedgerEntry` со статусом `QUARANTINE` без фильтрации по тенанту. Страница `src/app/admin/finance/page.tsx:56` вызывала метод без передачи активного контекста `activeTenantId`.
- **Решение:**
  1. В `src/services/admin/escrow.service.ts`: метод `getQuarantineEntries(tenantId?: string)` обязан принимать `tenantId` и фильтровать `where: { status: 'QUARANTINE', ...(tenantId && tenantId !== 'all' ? { tenantId } : {}) }`.
  2. В `src/app/admin/finance/page.tsx:56`: передавать `activeTenantId` в `escrowService.getQuarantineEntries(activeTenantId)`.

### 3. [VULN-04] Изоляция ручных корректировок баланса (`ManualBalanceAdjustment`)
- **Проблема:** Модель `ManualBalanceAdjustment` не содержала поля `tenantId`, что делало заявки глобальными. Оператор с доступом только к `smmplan` мог просматривать, создавать или утверждать заявки для пользователей `flux`, а при исполнении корректировки вызовы `WalletOps.credit` и `WalletOps.adminAdjust` не получали `tenantId`, что ослабляло проверку изоляции в финансовом ядре.
- **Решение:**
  1. В `prisma/schema.prisma`: добавить в `ManualBalanceAdjustment` поле `tenantId String @default("smmplan")` и индекс `@@index([tenantId])`.
  2. Выполнить `npx prisma generate`.
  3. В `src/actions/admin/balance-adjustments.ts`:
     - При создании заявки (`createBalanceAdjustmentRequestAction` / `requestManualBalanceAdjustmentAction`):
       - Определять `targetUser.tenantId`.
       - Проверять права оператора через `isTenantAllowedForUser(staffUser, targetTenant)`.
       - Сохранять `tenantId: targetTenant`.
     - При утверждении (`approveBalanceAdjustmentAction`):
       - Проверять права оператора на утверждение заявок данного тенанта (`isTenantAllowedForUser(approver, adjustment.tenantId)`).
       - При исполнении передавать `tenantId: adjustment.tenantId` в `WalletOps.credit` / `WalletOps.adminAdjust`.
     - При отклонении (`rejectBalanceAdjustmentAction`) и отмене (`cancelBalanceAdjustmentRequestAction`):
       - Проверять права оператора и передавать `tenantId: adjustment.tenantId` при возврате средств.
     - При выборке заявок (`getBalanceAdjustmentsAction` / `getManualBalanceAdjustmentsAction`) и статистики:
       - Резолвить тенант через `resolveAdminTenantAsync(staffUser, requestedTenant)`.
       - Фильтровать `where.tenantId = resolvedTenant` (если не `'all'`).
     - Экспортировать совместимые алиасы `requestManualBalanceAdjustmentAction` и `getManualBalanceAdjustmentsAction`.

---

## 2. Архитектурный контракт и инварианты

1. **Zero-Cross-Tenant-Merge:** Слияние аккаунтов Telegram и Web разрешено строго в пределах одного и того же `tenantId`. Любая попытка объединить аккаунты с разными `tenantId` выбрасывает исключение и откатывает транзакцию.
2. **Escrow Quarantine Isolation:** Список карантинных транзакций в админке финансов строго изолирован выбранным тенантом администратора.
3. **Manual Adjustment Boundary:** Заявка на ручную корректировку баланса жестко привязана к `tenantId` целевого пользователя. Оператор с доступом только к марке `smmplan` не имеет права запрашивать, утверждать, отклонять или просматривать заявки марки `flux`.
4. **WalletOps Tenant Invariant:** При начислении или списании баланса через `WalletOps` в опции передается `tenantId: adjustment.tenantId`, гарантируя отказ при несовпадении тенанта пользователя и записи в LedgerEntry.

---

## 3. План TDD (Test-Driven Development)

1. **Unit/Интеграционные тесты (`src/__tests__/security/financial-isolation-package-2.test.ts`):**
   - Тест VULN-03:
     - Проверка явного сохранения `tenantId` в `db.authToken.create` при вызове `getTelegramBindDetailsAction`.
     - Проверка блокировки слияния аккаунтов `tempUser` (smmplan) и `webUser` (flux) при Telegram Smart Bind с выбросом ошибки и откатом транзакции (баланс не переносится).
     - Проверка успешного слияния при совпадении тенантов (`smmplan` == `smmplan`).
   - Тест VULN-05:
     - Проверка `escrowService.getQuarantineEntries('smmplan')` — возвращает только smmplan записи.
     - Проверка `escrowService.getQuarantineEntries('flux')` — возвращает только flux записи.
     - Проверка `escrowService.getQuarantineEntries('all')` — возвращает все записи.
   - Тест VULN-04:
     - Проверка блокировки создания заявки оператором `smmplan` для пользователя `flux`.
     - Проверка сохранения `tenantId: 'flux'` при создании заявки для пользователя `flux`.
     - Проверка фильтрации выборки заявок по `resolvedTenant`.
     - Проверка блокировки утверждения заявки `flux` оператором `smmplan`.
     - Проверка успешного утверждения и передачи `tenantId` в `WalletOps` с созданием `LedgerEntry` с правильным `tenantId`.
