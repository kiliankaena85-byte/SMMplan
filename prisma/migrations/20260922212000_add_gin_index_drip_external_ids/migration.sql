-- CreateIndex
CREATE INDEX "Order_dripExternalIds_idx" ON "Order" USING GIN ("dripExternalIds");
