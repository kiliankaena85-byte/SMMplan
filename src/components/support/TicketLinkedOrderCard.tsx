import React from 'react';

export interface TicketLinkedOrder {
  id: string;
  numericId: number;
  status: string;
  charge: number | bigint;
  createdAt: Date;
  service?: { name: string } | null;
}

interface TicketLinkedOrderCardProps {
  order: TicketLinkedOrder;
}

export function TicketLinkedOrderCard({ order }: TicketLinkedOrderCardProps) {
  const statusBadgeClass =
    order.status === 'COMPLETED'
      ? 'bg-status-success-bg text-status-success'
      : order.status === 'IN_PROGRESS'
      ? 'bg-primary/10 text-primary'
      : order.status === 'PENDING'
      ? 'bg-status-warning-bg text-status-warning'
      : 'bg-default-200 text-default-600';

  const statusLabel =
    order.status === 'COMPLETED'
      ? 'Выполнен'
      : order.status === 'IN_PROGRESS'
      ? 'Выполняется'
      : order.status === 'PENDING'
      ? 'В очереди'
      : order.status;

  return (
    <div className="bg-status-info-bg border border-status-info/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm shrink-0 animate-in fade-in duration-300">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-status-info-bg text-status-info flex items-center justify-center font-bold text-lg shrink-0">
          📦
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">Привязанный заказ #{order.numericId}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${statusBadgeClass}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{order.service?.name || 'Услуга'}</p>
        </div>
      </div>
      <div className="text-xs text-muted-foreground flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
        <span>Дата: {new Date(order.createdAt).toLocaleDateString('ru-RU')}</span>
        <span className="font-bold text-foreground">{(Number(order.charge) / 100).toFixed(2)} ₽</span>
      </div>
    </div>
  );
}
