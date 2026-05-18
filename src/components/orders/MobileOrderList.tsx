'use client';

import React, { useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from '@heroui/react';
import { CancelOrderButton } from '@/components/orders/CancelOrderButton';
import { RetryPaymentModal } from '@/components/orders/RetryPaymentModal';
import { Clock, ExternalLink, LayoutDashboard } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  COMPLETED:       'Выполнен',
  IN_PROGRESS:     'В работе',
  PENDING:         'Ожидание',
  AWAITING_PAYMENT:'Ожидает оплаты',
  ERROR:           'Ошибка',
  CANCELED:        'Отменён',
  PARTIAL:         'Частично',
  PROVISIONING:    'Запуск',
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED:       'text-success bg-success/10 border-emerald-500/20',
  IN_PROGRESS:     'text-blue-500    bg-blue-500/10    border-blue-500/20',
  PENDING:         'text-orange-500  bg-orange-500/10  border-orange-500/20',
  AWAITING_PAYMENT:'text-orange-500  bg-orange-500/10  border-orange-500/20',
  PROVISIONING:    'text-indigo-500  bg-indigo-500/10  border-indigo-500/20',
  ERROR:           'text-destructive     bg-destructive/10     border-red-500/20',
  PARTIAL:         'text-warning         bg-warning/10         border-amber-500/20',
  CANCELED:        'text-muted-foreground bg-muted border-border',
};

export function MobileOrderList({ orders, user }: { orders: any[], user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onOpenChange = (open: boolean) => setIsOpen(open);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: orders.length,
    estimateSize: () => 140, // Estimated height of each order card
    overscan: 5,
  });

  const handleOrderClick = (order: any) => {
    setSelectedOrder(order);
    onOpen();
  };

  return (
    <>
      {/* 4.5.1 Virtualized List with 4.5.2 Pull-to-Refresh overscroll contain */}
      <div 
        ref={listRef} 
        className="sm:hidden -mx-4 px-4 overflow-y-auto overscroll-y-contain"
        style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualizer.getVirtualItems()[0]?.start ?? 0}px)` }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const order = orders[virtualRow.index];
            const color = STATUS_COLOR[order.status] || STATUS_COLOR.CANCELED;
            const label = STATUS_LABEL[order.status] || order.status;
            
            return (
              <div 
                key={virtualRow.key} 
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="py-2"
              >
                {/* 4.1 Карточки вместо таблиц + 4.3 Touch Targets */}
                <div 
                  onClick={() => handleOrderClick(order)}
                  className="bg-card border border-border rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                  style={{ minHeight: '120px' }} // Ensures large enough touch target
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-muted-foreground">#{order.numericId}</div>
                      
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1 flex items-center gap-1">
                        {order.service.category?.network?.name && (
                          <span className="text-primary">{order.service.category.network.name}</span>
                        )}
                        {order.service.category?.name && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="truncate">{order.service.category.name}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="text-sm font-medium text-foreground line-clamp-2 mt-0.5">
                        {order.service.name}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-foreground tabular-nums">
                        {(Number(order.charge) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                      </div>
                      <span className={`mt-1 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${color}`}>
                        {label}
                      </span>
                    </div>
                  </div>

                  {/* 4.3 Progress bar for Partial / In Progress */}
                  {order.status === 'IN_PROGRESS' && order.remains != null && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>
                          {order.quantity - order.remains >= order.quantity 
                            ? 'Завершение...' 
                            : order.quantity - order.remains <= 0 
                              ? 'Начинаем работу...' 
                              : 'В работе'}
                        </span>
                        <span className="tabular-nums">{Math.min(order.quantity, Math.max(0, order.quantity - order.remains))} / {order.quantity}</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-primary rounded-full transition-all duration-500 ${(order.quantity - order.remains >= order.quantity) || (order.quantity - order.remains <= 0) ? 'animate-pulse opacity-80' : ''}`}
                          style={{ width: `${Math.min(100, Math.max(0, Math.round(((order.quantity - order.remains) / order.quantity) * 100)))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="tabular-nums font-medium">{order.quantity.toLocaleString('ru-RU')} шт.</span>
                      <span>
                        {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    </div>
                    
                    {['PENDING', 'AWAITING_PAYMENT'].includes(order.status) && (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <CancelOrderButton orderId={order.id} createdAt={order.createdAt} status={order.status} />
                        {order.status === 'AWAITING_PAYMENT' && user && (
                          <RetryPaymentModal 
                            orderId={order.id} 
                            charge={Number(order.charge)} 
                            balance={Number(user.balance)} 
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4.2 Drawer для деталей (Mobile only) */}
      <Drawer 
        isOpen={isOpen} 
        onOpenChange={setIsOpen} 
      >
        <DrawerContent placement="bottom" className="max-h-[90dvh] rounded-t-3xl pb-[env(safe-area-inset-bottom)] motion-reduce:transition-none motion-reduce:transform-none">
          {(onClose) => (
            <>
              {/* Touch action none on handle for swipe down */}
              <div className="w-full flex justify-center pt-3 pb-1 touch-none">
                <div className="w-12 h-1.5 bg-muted rounded-full min-h-2 min-w-12" />
              </div>
              <DrawerHeader className="flex flex-col gap-1 px-6 min-h-[48px] justify-center">
                <h2 className="text-xl font-bold">Заказ #{selectedOrder?.numericId}</h2>
                <div className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  {selectedOrder && new Date(selectedOrder.createdAt).toLocaleString('ru-RU', { 
                    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })}
                </div>
              </DrawerHeader>
              
              {/* Overscroll contain to avoid refreshing page when scrolling inside Drawer */}
              <DrawerBody className="px-6 pb-6 overflow-y-auto overscroll-contain">
                {selectedOrder && (
                  <div className="space-y-5">
                    {/* Status & Price */}
                    <div className="flex items-center justify-between bg-muted/30 p-4 rounded-2xl border border-border/50">
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Статус</div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${STATUS_COLOR[selectedOrder.status] || STATUS_COLOR.CANCELED}`}>
                          {STATUS_LABEL[selectedOrder.status] || selectedOrder.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Сумма</div>
                        <div className="text-lg font-black tabular-nums">
                          {(Number(selectedOrder.charge) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                        </div>
                      </div>
                    </div>

                    {/* Service */}
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Услуга</label>
                      <div className="text-sm font-semibold">{selectedOrder.service.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <LayoutDashboard className="w-3 h-3" />
                        {selectedOrder.service.category?.name || 'Без категории'}
                      </div>
                    </div>

                    {/* Link */}
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Ссылка</label>
                      <a 
                        href={selectedOrder.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary break-all"
                      >
                        {selectedOrder.link}
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Кол-во</div>
                        <div className="text-base font-black tabular-nums mt-1">{selectedOrder.quantity.toLocaleString('ru-RU')}</div>
                      </div>
                      
                      {selectedOrder.remains > 0 && selectedOrder.status === 'IN_PROGRESS' && (
                        <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">Осталось</div>
                          <div className="text-base font-black tabular-nums mt-1 text-primary">{selectedOrder.remains.toLocaleString('ru-RU')}</div>
                        </div>
                      )}
                    </div>

                    {selectedOrder.customData && (
                      <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Комментарии / Настройки</label>
                        <div className="text-xs font-mono whitespace-pre-wrap">{selectedOrder.customData}</div>
                      </div>
                    )}

                    {selectedOrder.status === 'ERROR' && selectedOrder.error && (
                      <div className="bg-destructive/10 border border-rose-500/20 text-destructive p-3 rounded-xl">
                        <div className="text-[10px] font-bold uppercase mb-1">Ошибка</div>
                        <div className="text-xs font-semibold">{selectedOrder.error}</div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {['PENDING', 'AWAITING_PAYMENT'].includes(selectedOrder.status) && (
                      <div className="flex gap-3 pt-2">
                        <CancelOrderButton orderId={selectedOrder.id} createdAt={selectedOrder.createdAt} status={selectedOrder.status} />
                        {selectedOrder.status === 'AWAITING_PAYMENT' && user && (
                          <RetryPaymentModal 
                            orderId={selectedOrder.id} 
                            charge={Number(selectedOrder.charge)} 
                            balance={Number(user.balance)} 
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
