CREATE INDEX CONCURRENTLY IF NOT EXISTS "Commission_status_idx" ON "Commission"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Commission_referrerId_status_idx" ON "Commission"("referrerId", status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Commission_status_updatedAt_idx" ON "Commission"(status, "updatedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "LedgerEntry_idempotencyKey_tenantId_idx" ON "LedgerEntry"("idempotencyKey", "tenantId");
UPDATE "LedgerEntry" SET "tenantId" = 'smmplan' WHERE "tenantId" IS NULL;
SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('Commission', 'LedgerEntry') ORDER BY tablename, indexname;
