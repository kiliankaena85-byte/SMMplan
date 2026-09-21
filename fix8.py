import re

with open('src/app/admin/orders/[id]/order-standalone-view.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The grid containing cost and margin starts with `<div className="col-span-full xl:col-span-1 space-y-4">`
# Let's just wrap the two cost/margin blocks in `{canSeeRates && ( ... )}`

old_blocks = """            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Стоимость провайдера</span>
              <div className="text-base font-black text-foreground tabular-nums">
                {costRub.toFixed(2)} ₽
              </div>
              <div className="text-[10px] text-muted-foreground">
                Закупочная цена
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border space-y-1 ${
              marginRub >= 0 
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Чистая маржа</span>
              <div className="text-base font-black tabular-nums">
                {marginRub >= 0 ? `+${marginRub.toFixed(2)} ₽` : `${marginRub.toFixed(2)} ₽`}
              </div>
              <div className="text-[10px] font-bold">
                {marginRub >= 0 ? `Рентабельность +${marginPercent}%` : `Убыток ${marginPercent}%`}
              </div>
            </div>"""

new_blocks = """            {canSeeRates && (
              <>
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Стоимость провайдера</span>
                  <div className="text-base font-black text-foreground tabular-nums">
                    {costRub.toFixed(2)} ₽
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Закупочная цена
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border space-y-1 ${
                  marginRub >= 0 
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Чистая маржа</span>
                  <div className="text-base font-black tabular-nums">
                    {marginRub >= 0 ? `+${marginRub.toFixed(2)} ₽` : `${marginRub.toFixed(2)} ₽`}
                  </div>
                  <div className="text-[10px] font-bold">
                    {marginRub >= 0 ? `Рентабельность +${marginPercent}%` : `Убыток ${marginPercent}%`}
                  </div>
                </div>
              </>
            )}"""

content = content.replace(old_blocks, new_blocks)

with open('src/app/admin/orders/[id]/order-standalone-view.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done standalone view")
