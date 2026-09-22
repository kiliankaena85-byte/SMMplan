import React from 'react';
import Link from 'next/link';
import { CreditCard, ArrowRight } from 'lucide-react';
import { formatKopecks } from '@/utils/format-kopecks';
import { accountingService } from '@/services/financial/accounting.service';

interface Props {
  filterStart?: Date;
  filterEnd?: Date;
  tenantFilter?: string;
}

export async function PaymentGatewaysWidget({ filterStart, filterEnd, tenantFilter }: Props) {
  const gateways = await accountingService.getGatewayBreakdown(filterStart, filterEnd, tenantFilter);
  return (
    <div className="bg-card text-card-foreground rounded-lg p-5 border border-border/70 shadow-sm flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CreditCard className="w-4 h-4 shrink-0" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Эквайринг и платежные шлюзы
            </h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Объем пополнений, конверсия оплат и комиссии платежных систем
            </p>
          </div>
        </div>
        <Link
          href="/admin/finance"
          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>Биллинг</span>
          <ArrowRight className="w-3 h-3 shrink-0" />
        </Link>
      </div>

      {/* Content List */}
      {gateways.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          Транзакции за выбранный период не найдены
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {gateways.map((g) => (
            <div
              key={g.gateway}
              className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-muted/30 px-2 rounded-md transition-colors"
            >
              {/* Gateway Name & Stats */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0">{g.icon}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <span>{g.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">({g.sharePct}% объема)</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>Успех: <strong className="text-emerald-600 dark:text-emerald-400">{g.successRate}%</strong> ({g.successCount} опл.)</span>
                    <span>•</span>
                    <span>Комиссия: <span className="font-mono text-foreground">{formatKopecks(g.feeKopecks)}</span> (~{g.feePct}%)</span>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="text-right shrink-0">
                <div className="font-mono font-extrabold text-foreground tabular-nums text-sm">
                  {formatKopecks(g.amountKopecks)}
                </div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Поступления
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
