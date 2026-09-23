-- ============================================================
-- DB Audit Fix: Missing Indexes & LedgerEntry.tenantId nullable
-- Date: 2026-09-21
-- Applied via: npx prisma db execute --file prisma/migrations/manual_db_audit_fix.sql
-- ============================================================

-- C-04: Commission — добавить индексы по status и составные
-- CONCURRENTLY позволяет не блокировать таблицу в продакшне
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Commission_status_idx"
  ON "Commission"("status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Commission_referrerId_status_idx"
  ON "Commission"("referrerId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Commission_status_updatedAt_idx"
  ON "Commission"("status", "updatedAt");

-- M-02: LedgerEntry — составной индекс (idempotencyKey, tenantId)
-- для быстрых WalletOps idempotency lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "LedgerEntry_idempotencyKey_tenantId_idx"
  ON "LedgerEntry"("idempotencyKey", "tenantId");

-- C-02: LedgerEntry.tenantId String? → String
-- Шаг 1: обновить NULL-строки дефолтным значением
UPDATE "LedgerEntry"
SET "tenantId" = 'smmplan'
WHERE "tenantId" IS NULL;

-- Шаг 2: добавить NOT NULL constraint (без лока на prod — добавляем check, потом constraint)
-- Сначала добавляем CHECK constraint как NOT VALID (мгновенно, без блокировки)
ALTER TABLE "LedgerEntry"
  ADD CONSTRAINT "LedgerEntry_tenantId_not_null"
  CHECK ("tenantId" IS NOT NULL) NOT VALID;

-- Шаг 3: Validate в фоне (не блокирует новые writes)
ALTER TABLE "LedgerEntry"
  VALIDATE CONSTRAINT "LedgerEntry_tenantId_not_null";

-- H-05: AnalyticsEvent TTL — удалить старые события (старше 90 дней)
-- Безопасно выполнять в любое время, удаляет только устаревшие данные
DELETE FROM "AnalyticsEvent"
WHERE "createdAt" < NOW() - INTERVAL '90 days';

-- Подтверждение
SELECT
  'Commission_status_idx' as index_name,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'Commission' AND indexname = 'Commission_status_idx'
  ) as created
UNION ALL
SELECT
  'Commission_referrerId_status_idx',
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'Commission' AND indexname = 'Commission_referrerId_status_idx'
  )
UNION ALL
SELECT
  'LedgerEntry_idempotencyKey_tenantId_idx',
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'LedgerEntry' AND indexname = 'LedgerEntry_idempotencyKey_tenantId_idx'
  );
