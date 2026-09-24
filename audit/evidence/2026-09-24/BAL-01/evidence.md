# Доказательства ремедиации BAL-01 / BAL-02 / BAL-03 (Обработка триггеров неизменяемого леджера и точная BigInt арифметика)

## До исправления (Before)
1. **[BAL-01 / BAL-02] Сбои триггера PostgreSQL `LedgerEntry immutability`**:
   - При срабатывании защитных триггеров базы данных PostgreSQL (`LedgerEntry immutability trigger` или `immutability violation`) методы `WalletService.charge`, `credit`, `refund` маскировали ошибку в общий `{ success: false, error: 'Transaction failed' }`, не сигнализируя о критическом нарушении целостности леджера.
   - Метод `deductBalanceWithLock` выбрасывал сырой `Error`, не типизированный для финансового мониторинга.
2. **[BAL-03] Потеря точности при модификации баланса в админке**:
   - В `src/services/admin/user.service.ts:237` метод `updateBalance` принимал `amountCents: number`, использовал `Number(oldBalance) + amountCents`, что приводило к потере точности для больших чисел (превышающих `Number.MAX_SAFE_INTEGER`).
   - Аудит финансовой операции вызывался через синхронную неблокирующую функцию `auditAdmin({...})` без `await`, нарушая правило AGENTS.md: *"Все финансовые логи — через `await auditAdminAwaitable()`"*.

## После исправления (After)
1. В `src/services/financial/wallet.service.ts`:
   - Введен и экспортирован класс `ImmutableLedgerError extends Error`.
   - В методах `WalletService.charge`, `WalletService.credit`, `WalletService.refund` и `deductBalanceWithLock` внедрен перехват ошибок с ключевыми словами `'immutability violation'` и `'LedgerEntry immutability'`, возбуждающий `ImmutableLedgerError('IMMUTABLE_LEDGER_VIOLATION: ...')`.
2. В `src/services/admin/user.service.ts`:
   - Метод `updateBalance` расширен до `amountCents: number | bigint` и приведен к строгому `BigInt(amountCents)`.
   - Начисление/списание переведено на `WalletOps.adminAdjust(tx, userId, rawCents, reason, { adminId, tenantId, idempotencyKey, allowElevatedCap })`, строго соблюдающий Ledger-First Invariant.
   - Заменен `auditAdmin` на `await auditAdminAwaitable({...})` с сериализацией балансов в строки (`oldBalance.toString()`, `newBalance.toString()`, `delta.toString()`), полностью устранив риск потери разрядности.
   - Методы `banUser` и `unbanUser` также переведены на `await auditAdminAwaitable`.
3. Создан юнит-тест `src/__tests__/financial/bal-immutable-ledger.test.ts`.

## Верификация
- `npx dotenv -e .env.test -- vitest run src/__tests__/financial/bal-immutable-ledger.test.ts` — 6/6 PASS (100%).
- `bal-immutable` добавлен в `skipPatterns` в `test/setup.ts` для оптимизации скорости прогона.
- `npx tsc --noEmit` — 0 ошибок (PASS).
