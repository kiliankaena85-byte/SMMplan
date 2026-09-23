-- Zero-downtime variant of 20260923090000_add_hot_path_indexes.
--
-- WHY: Prisma Migrate wraps each migration file in a transaction, and
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block. When the
-- User / Provider tables are already large in production, apply THIS file
-- manually (psql or `prisma db execute`) and then mark the Prisma migration as
-- already applied, so `prisma migrate deploy` does not try to create the same
-- indexes again:
--
--   psql "$DATABASE_URL" -f prisma/migrations/apply_indexes_hot_paths_CONCURRENTLY.sql
--   npx prisma migrate resolve --applied 20260923090000_add_hot_path_indexes
--
-- Prescribed by skills: db-evolution-zero-downtime (CONCURRENTLY, expand/contract).
-- Follows the existing precedent of prisma/migrations/apply_indexes.sql.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_telegramId_tenantId_idx" ON "User"("telegramId", "tenantId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Provider_isActive_idx" ON "Provider"("isActive");

SELECT tablename, indexname
FROM pg_indexes
WHERE indexname IN ('User_telegramId_tenantId_idx', 'Provider_isActive_idx')
ORDER BY tablename, indexname;
