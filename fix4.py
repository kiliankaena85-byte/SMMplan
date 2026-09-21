import re

with open('src/components/admin/OrderDetailsModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = re.sub(
    r"import \{ OrderServiceDetails \}.*?import \{ OrderFinancialSummary \} from '\./order-details/OrderFinancialSummary';",
    "import { OrderMinimalSummary } from './order-details/OrderMinimalSummary';",
    content,
    flags=re.DOTALL
)

# 2. Update the Grid
old_grid = """              {/* 3-COLUMN BENTO GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <OrderServiceDetails
                  order={currentOrder}
                  copiedLink={copiedLink}
                  onCopyLink={handleCopyLink}
                  quantity={quantity}
                  progressPercent={progressPercent}
                />

                <OrderProviderStatusCard
                  order={currentOrder}
                  selectedStatus={selectedStatus}
                  onSelectedStatusChange={setSelectedStatus}
                  remains={remains}
                  onRemainsChange={setRemains}
                  quantity={quantity}
                  isPending={isPending}
                  onSetStatus={handleSetStatus}
                />

                <OrderFinancialSummary
                  order={currentOrder}
                  chargeRub={chargeRub}
                  costRub={costRub}
                  marginRub={marginRub}
                  marginPercent={marginPercent}
                  pricePerUnitRub={pricePerUnitRub}
                  canSeeRates={canSeeRates}
                />
              </div>"""

new_grid = """              <OrderMinimalSummary
                order={currentOrder}
                quantity={quantity}
                progressPercent={progressPercent}
                copiedLink={copiedLink}
                onCopyLink={handleCopyLink}
                chargeRub={chargeRub}
                costRub={costRub}
                marginRub={marginRub}
                marginPercent={marginPercent}
                canSeeRates={canSeeRates}
              />"""
content = content.replace(old_grid, new_grid)

# 3. Simplify Error Box
old_error = """              {/* PROVIDER ERROR BANNER */}
              {currentOrder.error && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Ответ / Ошибка провайдера:</span>
                    </div>
                    {classifiedError && (
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${classifiedError.badgeBg} ${classifiedError.badgeText} ${classifiedError.badgeBorder}`}>
                        {classifiedError.code}
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-bold text-rose-700 dark:text-rose-300">
                    {classifiedError ? classifiedError.titleRu : currentOrder.error}
                  </div>

                  {classifiedError && (
                    <div className="text-xs text-foreground/85 leading-relaxed bg-card/60 p-2.5 rounded-xl border border-border/50">
                      <div className="font-semibold text-[11px] text-muted-foreground uppercase mb-0.5">ПОЯСНЕНИЕ:</div>
                      {classifiedError.descriptionRu}
                      <div className="mt-2 pt-1.5 border-t border-border/40 text-[11px] text-primary font-medium">
                        💡 <strong>Действие:</strong> {classifiedError.recommendedAction}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground font-mono break-all pt-0.5">
                    Сырой ответ: {currentOrder.error}
                  </div>
                </div>
              )}"""

new_error = """              {/* SMART ERROR BANNER */}
              {currentOrder.error && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    {classifiedError ? `${classifiedError.titleRu} (${classifiedError.code})` : 'Ошибка поставщика'}
                  </div>
                  
                  {classifiedError && (
                    <div className="text-xs text-rose-600 dark:text-rose-400">
                      {classifiedError.descriptionRu}
                      <span className="font-medium ml-2">— Действие: {classifiedError.recommendedAction}</span>
                    </div>
                  )}

                  <details className="text-[11px] text-muted-foreground font-mono mt-2 group cursor-pointer">
                    <summary className="select-none font-semibold text-rose-500/80 hover:text-rose-500 transition-colors">Показать сырые логи</summary>
                    <div className="mt-2 p-2 bg-rose-500/5 rounded-lg border border-rose-500/20 break-all">
                      {currentOrder.error}
                    </div>
                  </details>
                </div>
              )}"""
content = content.replace(old_error, new_error)

with open('src/components/admin/OrderDetailsModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
