'use client';

import React from 'react';
import Link from 'next/link';
import { CopyText } from '@/components/ui/CopyText';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { ClientDate } from '@/components/ui/client-date';
import { RetryPaymentModal } from '@/components/orders/RetryPaymentModal';
import { CancelOrderButton } from '@/components/orders/CancelOrderButton';
import { RepeatOrderButton } from '@/components/orders/RepeatOrderButton';
import { RefillRequestButton } from '@/components/orders/RefillRequestButton';
import { DripFeedProgress } from '@/components/orders/DripFeedProgress';
import { ChargeBreakdownModal } from '@/components/orders/ChargeBreakdownModal';
import { AlertCircle, Clock, CheckCircle2, Play, ExternalLink } from 'lucide-react';

export interface LovableOrder {
  id: string;
  numericId: number;
  status: string;
  charge: number; // in rub
  chargeCents?: number;
  discountCents?: number;
  usdToRubRate?: number | null;
  quantity: number;
  remains: number | null;
  link?: string | null;
  error: string | null;
  createdAt: string;
  isDripFeed?: boolean;
  runs?: number | null;
  interval?: number | null;
  currentRun?: number;
  nextRunAt?: string | null;
  refills?: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
  service: {
    id?: string;
    name: string;
    categoryId?: string;
    isRefillEnabled?: boolean;
    network: {
      slug: string;
    };
  };
}

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Выполнен',
  IN_PROGRESS: 'В работе',
  PENDING: 'Ожидание',
  AWAITING_PAYMENT: 'Ожидает оплаты',
  ERROR: 'Ошибка',
  CANCELED: 'Отменён',
  PARTIAL: 'Частично',
  PROVISIONING: 'Запуск',
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'text-emerald-800 dark:text-success bg-success/10 border-emerald-500/20',
  IN_PROGRESS: 'text-blue-800 dark:text-blue-500 bg-blue-500/10 border-blue-500/20',
  PENDING: 'text-orange-800 dark:text-orange-500 bg-orange-500/10 border-orange-500/20',
  AWAITING_PAYMENT: 'text-orange-800 dark:text-orange-500 bg-orange-500/10 border-orange-500/20',
  PROVISIONING: 'text-indigo-800 dark:text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  ERROR: 'text-red-800 dark:text-destructive bg-destructive/10 border-red-500/20',
  PARTIAL: 'text-amber-800 dark:text-warning bg-warning/10 border-amber-500/20',
  CANCELED: 'text-muted-foreground bg-muted border-border',
};

export function LovableOrdersList({
  orders,
  userBalanceCents = 0
}: {
  orders: LovableOrder[];
  userBalanceCents?: number;
}) {
  if (orders.length === 0) {
    return (
      <div className="bg-card/50 border border-border/30 rounded-[2rem] p-12 text-center space-y-4 hover:border-primary/20 transition-all">
        <div className="text-4xl">📭</div>
        <h3 className="font-extrabold text-foreground text-sm">Активных кампаний не обнаружено</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Запустите свою первую рекламную кампанию прямо сейчас, указав ссылку на соцсеть.
        </p>
        <Link
          href="/dashboard/new-order"
          className="inline-flex h-11 px-6 items-center text-xs font-bold bg-primary text-primary-foreground rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-sm"
        >
          Запустить рекламу
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const color = STATUS_COLOR[order.status] || STATUS_COLOR.CANCELED;
        const label = STATUS_LABEL[order.status] || order.status;
        const remains = order.remains ?? order.quantity;
        const completed = Math.max(0, order.quantity - remains);
        const percent = Math.min(100, Math.max(0, Math.round((completed / order.quantity) * 100)));

        return (
          <div
            key={order.id}
            className="p-6 bg-card/60 backdrop-blur-md border border-border/30 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/20 transition-all duration-200"
          >
            {/* Column 1: Platform & Service Details */}
            <div className="flex items-start gap-4 min-w-[280px] max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <SocialIcon slug={order.service.network.slug} size={20} />
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                  <span className="font-bold text-primary">#{order.numericId}</span>
                  <CopyText text={order.numericId.toString()} iconOnly={true} tooltipText="Копировать ID" />
                  <span>•</span>
                  <ClientDate date={order.createdAt} format="datetime" />
                </div>
                <h4 className="font-extrabold text-sm text-foreground leading-tight hover:text-primary transition-colors truncate" title={order.service.name}>
                  {order.service.name}
                </h4>
              </div>
            </div>

            {/* Column 2: Link target & amount */}
            <div className="flex-1 min-w-[180px] space-y-1">
              <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">Целевая ссылка</span>
              <div className="flex items-center gap-2">
                {order.link ? (
                  <>
                    <a
                      href={order.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary font-bold hover:underline truncate max-w-[220px]"
                    >
                      {order.link}
                    </a>
                    <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-primary">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">—</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-semibold tabular-nums block">
                  {order.quantity.toLocaleString('ru-RU')} шт.
                </span>
                <DripFeedProgress
                  isDripFeed={order.isDripFeed}
                  runs={order.runs}
                  interval={order.interval}
                  currentRun={order.currentRun}
                  nextRunAt={order.nextRunAt}
                />
              </div>
            </div>

            {/* Column 3: Live progress metrics */}
            <div className="w-full md:w-44 shrink-0 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                <span>Выполнено: {percent}%</span>
                <span className="font-mono">{completed} / {order.quantity}</span>
              </div>
              
              <div className="h-2 w-full bg-muted/60 border border-border/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${order.status === 'IN_PROGRESS' ? 'bg-primary animate-pulse' : 'bg-success'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {order.error && (
                <p className="text-[9px] text-destructive font-semibold flex items-center gap-0.5 truncate" title={order.error}>
                  <AlertCircle className="w-3 h-3 shrink-0" /> {order.error}
                </p>
              )}
            </div>

            {/* Column 4: Cost & Status info */}
            <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 md:pl-2">
              <div className="text-right">
                <span className="block text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Стоимость</span>
                <div className="flex items-center justify-end gap-1">
                  <span className="font-mono font-black text-sm text-foreground tabular-nums">
                    {order.charge.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                  </span>
                  <ChargeBreakdownModal
                    numericId={order.numericId}
                    chargeCents={order.chargeCents ?? order.charge * 100}
                    discountCents={order.discountCents}
                    usdToRubRate={order.usdToRubRate}
                  />
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={`inline-flex items-center px-3 py-1 text-[9px] uppercase tracking-wider font-extrabold rounded-xl border ${color}`}>
                  {label}
                </span>

                {/* Actions Panel */}
                <div className="flex items-center gap-1.5">
                  <RefillRequestButton
                    orderId={order.id}
                    isRefillEnabled={order.service.isRefillEnabled}
                    orderStatus={order.status}
                    refills={order.refills}
                  />
                  {['PENDING', 'AWAITING_PAYMENT'].includes(order.status) ? (
                    <div className="flex items-center gap-1.5">
                      {order.status === 'AWAITING_PAYMENT' && (
                        <RetryPaymentModal 
                          orderId={order.id} 
                          charge={order.charge * 100} // expects cents
                          balance={userBalanceCents} // expects cents
                          trigger={
                            <button className="h-7 px-2.5 bg-primary/15 text-primary text-[10px] font-bold rounded-lg border border-primary/20 hover:bg-primary/20 transition-all flex items-center gap-1">
                              Оплатить
                            </button>
                          }
                        />
                      )}
                      <CancelOrderButton 
                        orderId={order.id} 
                        createdAt={new Date(order.createdAt)} 
                        status={order.status} 
                      />
                    </div>
                  ) : (
                    <RepeatOrderButton 
                      serviceId={order.service.id || ''} 
                      categoryId={order.service.categoryId || ''} 
                      link={order.link ?? null} 
                      quantity={order.quantity} 
                    />
                  )}
                </div>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
