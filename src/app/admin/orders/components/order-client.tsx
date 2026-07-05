'use client';

/**
 * OrderClient v2.1 — RBAC & Polish
 *
 * - canSeeRates support (hides provider cost for Support role)
 * - Memoized columns logic
 */

import * as React from 'react';
import { useState, useTransition, useOptimistic } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { Table as ReactTable, Row } from '@tanstack/react-table';
import { columns, OrderColumn, RowActions, STATUS_LABELS, STATUS_STYLES, SPEED_CLASS_META } from './columns';
import Link from 'next/link';
import { formatEta } from '@/utils/format-eta';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { XCircle, Copy } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { bulkCancelOrdersAction } from '@/actions/admin/orders';
import { OrderDrawer } from '@/components/admin/OrderDrawer';

export function OrderClient({ data, canSeeRates = true }: { data: OrderColumn[]; canSeeRates?: boolean }) {
  const [optimisticData, addOptimisticUpdate] = useOptimistic(
    data,
    (state, update: { id: string, status: string, remains?: number }) => {
      return state.map(order => 
        order.id === update.id 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? { ...order, status: update.status as any, remains: update.remains ?? order.remains } 
          : order
      );
    }
  );

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const editOrderId = searchParams.get('edit_order_id');
  const selectedOrder = React.useMemo(
    () => optimisticData.find(o => o.id === editOrderId) ?? null,
    [optimisticData, editOrderId]
  );

  const [isPendingBulk, startBulkTransition] = useTransition();
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkSelectedRows, setBulkSelectedRows] = useState<{ original: unknown }[]>([]);

  // Memoize columns to pass canSeeRates
  const memoColumns = React.useMemo(() => columns(canSeeRates), [canSeeRates]);

  function closeDrawer() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('edit_order_id');
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleBulkCancel(selectedRows: { original: unknown }[]) {
    setBulkSelectedRows(selectedRows);
    setBulkConfirmOpen(true);
  }

  function executeBulkCancel() {
    setBulkConfirmOpen(false);
    const ids = bulkSelectedRows.map(r => (r.original as OrderColumn).id);
    startBulkTransition(async () => {
      ids.forEach(id => addOptimisticUpdate({ id, status: 'CANCELED' }));
      try {
        const r = await bulkCancelOrdersAction(ids);
        if (r.success) {
          const refund = r.totalRefundCents > 0
            ? `, возврат ${(r.totalRefundCents / 100).toFixed(2)} ₽`
            : '';
          if (r.cancelledCount < ids.length) {
            toast.warning(`Отменено ${r.cancelledCount} из ${ids.length} заказов. Остальные не подлежат отмене.${refund}`);
          } else {
            toast.success(`🚫 Отменено ${r.cancelledCount} заказов${refund}`);
          }
        }
      } catch (e) {
        toast.error((e as Error).message || 'Ошибка пакетной отмены');
      }
    });
  }

  const renderMobileView = (table: ReactTable<OrderColumn>) => {
    return (
      <div className="space-y-4">
        {table.getRowModel().rows.map((row: Row<OrderColumn>) => {
          const order = row.original;
          const style = STATUS_STYLES[order.status] || 'default';
          
          const classes: Record<string, string> = {
            success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
            primary: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
            default: 'bg-muted text-muted-foreground border-border/80',
          };

          const s = order.service;
          const showEta = s.etaP50Seconds && s.etaSampleCount && s.etaSampleCount >= 2;
          const meta = showEta ? (SPEED_CLASS_META[s.etaSpeedClass ?? ''] ?? SPEED_CLASS_META.MEDIUM) : null;
          
          const dateStr = new Date(order.createdAt).toLocaleString('ru-RU', { 
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
          });

          return (
            <div key={row.id} className="bg-card border border-border/80 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 space-y-3">
              {/* Card Header: Checkbox + ID + Date & Status Badge + Quick Actions */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/50">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    className="w-5 h-5 mt-0.5 rounded border-border text-primary focus:ring-indigo-600 cursor-pointer"
                    checked={row.getIsSelected()}
                    onChange={(e) => row.toggleSelected(e.target.checked)}
                    aria-label={`Выбрать заказ #${order.numericId}`}
                  />
                  <div className="flex flex-col">
                    <span className="font-black text-sm text-foreground">
                      #{order.numericId}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums select-none mt-0.5">
                      {dateStr}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={`font-black text-[9px] uppercase border px-1.5 py-0.5 rounded-md ${classes[style] || classes.default}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </Badge>
                    {order.isDripFeed && (
                      <span className="text-[9px] text-purple-600 dark:text-purple-400 font-black bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-md">
                        Drip ({order.currentRun}/{order.runs})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center ml-1 shrink-0">
                    <RowActions order={order} />
                  </div>
                </div>
              </div>

              {/* Card Body: User email and Service details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground select-none">Покупатель:</span>
                  <Link
                    href={`/admin/clients?q=${encodeURIComponent(order.user.email)}`}
                    className="text-sky-600 hover:underline font-bold"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {order.user.email}
                  </Link>
                </div>

                <div className="space-y-1 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-muted font-black text-foreground text-[9px] uppercase tracking-wide">
                      {s.category.network?.name || '—'}
                    </span>
                    <span className="font-semibold text-muted-foreground text-[10px]">
                      {s.category.name}
                    </span>
                  </div>
                  <div className="font-bold text-foreground leading-snug">
                    {s.name}
                  </div>
                  <div className="flex items-start gap-1 pt-1 border-t border-border/30 mt-1">
                    <span className="text-muted-foreground shrink-0 select-none">Ссылка:</span>
                    <a
                      href={order.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:underline break-all font-mono text-[10px] flex-1 leading-normal"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {order.link}
                    </a>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div>
                    <span className="text-muted-foreground select-none">Кол-во:</span>{' '}
                    <span className="font-bold text-foreground tabular-nums">
                      {order.quantity.toLocaleString('ru-RU')}
                    </span>
                    {order.remains > 0 && (
                      <>
                        {' '}<span className="text-muted-foreground select-none">/ Остаток:</span>{' '}
                        <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          {order.remains.toLocaleString('ru-RU')}
                        </span>
                      </>
                    )}
                  </div>
                  {showEta && meta && (
                    <div className="flex items-center gap-1 font-semibold text-[10px]">
                      <span className={meta.color}>{meta.icon}</span>
                      <span className="text-muted-foreground">≈ {formatEta(s.etaP50Seconds!)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible details toggle */}
              <details className="mt-1 group">
                <summary className="text-sky-600 hover:text-sky-800 cursor-pointer text-[10px] select-none list-none inline-flex items-center transition-colors font-semibold">
                  <span className="group-open:hidden">Показать детали</span>
                  <span className="hidden group-open:inline">Скрыть детали</span>
                </summary>
                <div className="mt-2 pt-2 border-t border-border/80 text-[11px] text-foreground space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground select-none">Провайдер:</span>
                    <span className="font-semibold text-foreground">{order.providerName || '—'}</span>
                  </div>
                  {canSeeRates && (
                    <>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground select-none">ID у провайдера:</span>
                        <span className="font-mono text-foreground">{order.externalId || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground select-none">Себестоимость:</span>
                        <span className="tabular-nums font-semibold text-foreground">
                          {(order.providerCost / 100).toFixed(2)} ₽
                        </span>
                      </div>
                    </>
                  )}
                  {order.error && (
                    <div className="flex flex-col mt-1 bg-destructive/5 border border-destructive/20 rounded p-2">
                      <span className="text-[9px] uppercase font-bold text-destructive select-none">Ошибка провайдера:</span>
                      <span className="text-destructive break-words font-mono mt-0.5 leading-tight text-[10px]">{order.error}</span>
                    </div>
                  )}
                  {order.isDripFeed && order.dripExternalIds && order.dripExternalIds.length > 0 && (
                    <div className="flex flex-col mt-1">
                      <span className="text-muted-foreground font-semibold text-[9px] select-none">Drip запуски:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {order.dripExternalIds.map((id, idx) => (
                          <span key={idx} className="bg-purple-100/60 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 px-1 py-0.5 rounded text-[9px] font-mono">
                            #{id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>

              {/* Card Footer: Prices & Margin */}
              <div className="flex justify-between items-center pt-2.5 border-t border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground select-none text-[10px] uppercase font-black tracking-wider block">Стоимость</span>
                  <span className="font-bold text-sm text-foreground tabular-nums">
                    {(order.charge / 100).toFixed(2)} ₽
                  </span>
                </div>
                {canSeeRates && (
                  <div className="text-right">
                    <span className="text-muted-foreground select-none text-[10px] uppercase font-black tracking-wider block">Чистая маржа</span>
                    <span className={`font-bold text-xs tabular-nums ${order.charge - order.providerCost >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {order.charge > 0 ? Math.round(((order.charge - order.providerCost) / order.charge) * 100) : 0}% 
                      {' '}({((order.charge - order.providerCost) / 100).toFixed(2)} ₽)
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative">
      <DataTable
        columns={memoColumns}
        data={optimisticData}
        searchKey="user_email"
        searchPlaceholder="Фильтр по email на этой странице..."
        hideClientPagination={true}
        initialColumnVisibility={{ select: true, user_email: false }}
        renderMobileView={renderMobileView}
        renderToolbar={(table) => {
          const selectedRows = table.getFilteredSelectedRowModel().rows;
          if (selectedRows.length === 0) return null;

          function handleCopyIds() {
            const ids = selectedRows.map(r => r.original.numericId ?? r.original.id).join(', ');
            navigator.clipboard.writeText(ids);
            toast.success(`ID заказов скопированы (${selectedRows.length} шт)`);
          }

          return (
            <div className="fixed bottom-6 inset-x-0 mx-auto w-max max-w-[90vw] z-50 animate-in slide-in-from-bottom-10 fade-in flex items-center gap-4 bg-card border border-border px-6 py-3 rounded-full shadow-2xl">
              <div className="flex items-center gap-2 border-r border-border pr-4">
                <Badge className="bg-primary text-primary-foreground font-bold px-2">
                  {selectedRows.length}
                </Badge>
                <span className="text-sm font-medium text-foreground">выбрано</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  intent="secondary"
                  onClick={handleCopyIds}
                  aria-label="Скопировать ID выбранных заказов"
                  className="transition-all duration-200 cursor-pointer shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Скопировать ID
                </Button>

                <Button
                  size="sm"
                  intent="ghost"
                  disabled={isPendingBulk}
                  onClick={() => handleBulkCancel(selectedRows)}
                  aria-label="Отменить выбранные заказы"
                  className="text-destructive hover:bg-destructive/10 transition-all duration-200 cursor-pointer"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  {isPendingBulk ? 'Отмена...' : 'Отменить'}
                </Button>

                <Button
                  size="sm"
                  intent="ghost"
                  onClick={() => table.toggleAllPageRowsSelected(false)}
                  aria-label="Сбросить выделение"
                  className="text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
                >
                  Сбросить
                </Button>
              </div>
            </div>
          );
        }}
      />

      {/* Order detail drawer */}
      <OrderDrawer 
        order={selectedOrder} 
        onClose={closeDrawer} 
        canSeeRates={canSeeRates} 
        addOptimisticUpdate={addOptimisticUpdate}
      />

      <ConfirmModal
        isOpen={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={executeBulkCancel}
        title="Пакетная отмена"
        isDanger={true}
        confirmText="Отменить заказы"
      >
        Вы действительно хотите отменить {bulkSelectedRows.length} выбранных заказов? Возврат будет рассчитан автоматически.
      </ConfirmModal>
    </div>
  );
}
