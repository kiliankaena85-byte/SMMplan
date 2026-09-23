-- DropIndex
DROP INDEX IF EXISTS "Article_slug_key";

-- DropIndex
DROP INDEX IF EXISTS "Category_slug_key";

-- DropIndex
DROP INDEX IF EXISTS "ContentCategory_slug_key";

-- DropIndex
DROP INDEX IF EXISTS "ContentItem_slug_key";

-- DropIndex
DROP INDEX IF EXISTS "FeatureFlag_key_key";

-- DropIndex
DROP INDEX IF EXISTS "Page_slug_key";

-- DropIndex
DROP INDEX IF EXISTS "PromoCode_code_key";

-- AlterTable
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'smmplan';

-- AlterTable
ALTER TABLE "ContentCategory" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'smmplan';

-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'smmplan';

-- AlterTable
ALTER TABLE "FeatureFlag" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'smmplan';

-- AlterTable
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'smmplan';

-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'smmplan';

-- AlterTable
ALTER TABLE "SupportTemplate" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'smmplan';

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Article_tenantId_slug_key" ON "Article"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Category_tenantId_slug_key" ON "Category"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ContentCategory_tenantId_slug_key" ON "ContentCategory"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ContentItem_tenantId_slug_key" ON "ContentItem"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_tenantId_key_key" ON "FeatureFlag"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Page_tenantId_slug_key" ON "Page"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PromoCode_tenantId_code_key" ON "PromoCode"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SupportTemplate_tenantId_shortcut_key" ON "SupportTemplate"("tenantId", "shortcut");
