-- AddIndex: hot-path indexes discovered during the 2026-09-23 static audit.
--
-- 1) User(telegramId, tenantId)
--    Evidence: 10+ call sites in src/bot/index.ts do
--      db.user.findFirst({ where: { telegramId, tenantId } })
--    and 2 admin counters do db.user.count({ where: { telegramId: { not: null }, tenantId } }).
--    User had no index on telegramId at all -> sequential scan on the largest table,
--    executed on every incoming Telegram update (the slowest path in the product).
--    The composite keeps the tenant prefix usable for the (telegramId)-only lookups too.
--
-- 2) Provider(isActive)
--    Evidence: 19 query sites filter providers by isActive (admin lists, sync workers,
--    routing / fallback selection). The Provider table had zero indexes.
--
-- Both statements are idempotent (IF NOT EXISTS) so the migration is safe to re-run.
-- On a large production table prefer the zero-downtime variant in
-- prisma/migrations/apply_indexes_hot_paths_CONCURRENTLY.sql (see its header).

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_telegramId_tenantId_idx" ON "User"("telegramId", "tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Provider_isActive_idx" ON "Provider"("isActive");
