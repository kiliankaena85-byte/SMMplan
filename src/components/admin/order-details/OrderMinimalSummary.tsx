import React from 'react';
import { Copy, ExternalLink, Link2, User, Hash, Box, Wallet, Building2, Percent, CheckCircle2 } from 'lucide-react';
import { OrderModalColumn } from './types';

interface OrderMinimalSummaryProps {
  order: OrderModalColumn;
  quantity: number;
  progressPercent: number;
  copiedLink: boolean;
  onCopyLink: () => void;
  chargeRub: number;
  costRub: number;
  marginRub: number;
  marginPercent: number;
  canSeeRates: boolean;
}

export function OrderMinimalSummary({
  order,
  quantity,
  progressPercent,
  copiedLink,
  onCopyLink,
  chargeRub,
  costRub,
  marginRub,
  marginPercent,
  canSeeRates,
}: OrderMinimalSummaryProps) {
  const isHealthyMargin = marginPercent >= 20;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card border border-border/80 shadow-sm rounded-2xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" />
          Сводка по заказу
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Ссылка
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={order.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate max-w-[200px]"
                >
                  {order.link}
                </a>
                <button
                  onClick={onCopyLink}
                  className="p-1 hover:bg-primary/10 rounded-md transition-colors text-muted-foreground hover:text-primary"
                  title="Скопировать"
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Клиент
              </span>
              <span className="text-sm text-foreground truncate">{order.user?.email || '-'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5" />
                Объем
              </span>
              <span className="text-sm text-foreground">
                <span className="font-semibold">{quantity} шт</span>
                <span className="text-muted-foreground ml-2">(Остаток: {order.remains ?? quantity} шт)</span>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Поставщик
              </span>
              <span className="text-sm text-foreground">{order.providerName || 'Неизвестен'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Сумма заказа
              </span>
              <span className="text-sm font-bold text-foreground">{chargeRub.toFixed(2)} ₽</span>
            </div>

            
          </div>
        </div>
      </div>
    </div>
  );
}
