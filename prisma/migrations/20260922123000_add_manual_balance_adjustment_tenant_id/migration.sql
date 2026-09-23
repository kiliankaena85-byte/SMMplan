-- AlterTable
ALTER TABLE "ManualBalanceAdjustment" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'smmplan';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ManualBalanceAdjustment_tenantId_idx" ON "ManualBalanceAdjustment"("tenantId");
