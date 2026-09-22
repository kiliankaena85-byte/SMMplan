-- DropIndex
DROP INDEX IF EXISTS "SupportTemplate_shortcut_key";

-- DropIndex
DROP INDEX IF EXISTS "User_phoneHash_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneHash_tenantId_key" ON "User"("phoneHash", "tenantId");
