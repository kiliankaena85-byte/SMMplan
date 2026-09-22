import React from 'react';
import { Copy, Link2, User, Hash, Box, Wallet, Building2, CheckCircle2 } from 'lucide-react';
import { OrderModalColumn } from './types';

interface OrderMinimalSummaryProps {
  order: OrderModalColumn;
  quantity: number;
  progressPercent?: number;
  copiedLink: boolean;
  onCopyLink: () => void;
  chargeRub: number;
  costRub?: number;
  marginRub?: number;
  marginPercent?: number;
  canSeeRates?: boolean;
}

export function OrderMinimalSummary({
  order,
  quantity,
  copiedLink,
  onCopyLink,
  chargeRub,
}: OrderMinimalSummaryProps) {

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card border border-border/80 shadow-sm rounded-2xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary shrink-0" />
          Сводка по заказу
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                Ссылка
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <a
                  href={order.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate max-w-[200px] min-w-0"
                >
                  {order.link}
                </a>
                <button
                  onClick={onCopyLink}
                  className="p-1 hover:bg-primary/10 rounded-md transition-colors text-muted-foreground hover:text-primary shrink-0"
                  title="Скопировать"
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 shrink-0" />
                Клиент
              </span>
              {order.user?.email ? (
                <a 
                  href={`/admin/users?search=${encodeURIComponent(order.user.email)}`}
                  target="_blank"
                  className="text-sm text-primary hover:underline truncate min-w-0"
                  title="Перейти в профиль пользователя"
                >
                  {order.user.email}
                </a>
              ) : (
                <span className="text-sm text-foreground truncate min-w-0">-</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 shrink-0" />
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
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                Поставщик
              </span>
              <div className="flex flex-col">
                <span className="text-sm text-foreground">{order.providerName || 'Неизвестен'}</span>
                {order.externalId ? (
                  <span className="text-xs text-muted-foreground font-mono mt-0.5">ID: {order.externalId}</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground mt-0.5">ID не присвоен</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 shrink-0" />
                Сумма заказа
              </span>
              <span className="text-sm font-bold text-foreground">{chargeRub.toFixed(2)} ₽</span>
            </div>
            <div className="flex flex-col gap-1 mt-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="opacity-70">🕒</span>
                Дата создания
              </span>
              <span className="text-sm text-foreground">
                {new Date(order.createdAt).toLocaleString('ru-RU', { 
                  day: '2-digit', month: '2-digit', year: 'numeric', 
                  hour: '2-digit', minute: '2-digit' 
                })}
              </span>
            </div>

            
          </div>
        </div>
      </div>
    </div>
  );
}
