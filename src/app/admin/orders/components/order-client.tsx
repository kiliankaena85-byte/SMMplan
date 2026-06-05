'use client';

/**
 * OrderClient v2.1 — RBAC & Polish
 *
 * - canSeeRates support (hides provider cost for Support role)
 * - Memoized columns logic
 */

import * as React from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { columns, OrderColumn } from './columns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { XCircle, CheckCircle, RotateCcw, X } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
  cancelOrderAction,
  restartOrderAction,
  setOrderStatusAction,
  forceCompleteOrderAction,
  bulkCancelOrdersAction,
  getFailoverPreview,
  manualRerouteOrder,
} from '@/actions/admin/orders';


const STATUS_OPTIONS = [
  { value: 'PENDING',           label: 'В очереди' },
  { value: 'IN_PROGRESS',       label: 'В работе' },
  { value: 'COMPLETED',         label: 'Выполнен' },
  { value: 'PARTIAL',           label: 'Частичный' },
  { value: 'CANCELED',          label: 'Отменён' },
  { value: 'ERROR',             label: 'Ошибка' },
  { value: 'AWAITING_PAYMENT',  label: 'Ожидает оплату' },
] as const;

interface OrderClientProps {
  data: OrderColumn[];
  canSeeRates?: boolean;
}

interface FailoverRoute {
  routeId: string;
  providerName: string;
  newCostCents: number;
  marginCents: number;
  marginPercent: number;
  isMarginPositive: boolean;
}

interface FailoverPreviewData {
  success: boolean;
  clientPaidCents: number;
  currentBalance: number;
  routes: FailoverRoute[];
}

// ── Sub: Order Drawer ───────────────────────────────────────────────────────
function OrderDrawer({
  order,
  onClose,
  canSeeRates = true,
}: {
  order: OrderColumn | null;
  onClose: () => void;
  canSeeRates?: boolean;
}) {
  const [selectedStatus, setSelectedStatus] = useState(order?.status ?? '');
  const [remains, setRemains] = useState(order?.remains ?? 0);
  const [failoverPreview, setFailoverPreview] = useState<FailoverPreviewData | null>(null);
  const [isFailoverModalOpen, setIsFailoverModalOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'restart' | null>(null);

  const activeRoute = selectedRouteId
    ? failoverPreview?.routes.find(r => r.routeId === selectedRouteId)
    : null;

  React.useEffect(() => {
    setSelectedStatus(order?.status ?? '');
    setRemains(order?.remains ?? 0);
    setIsFailoverModalOpen(false);
    setConfirmOpen(false);
    setConfirmAction(null);
  }, [order]);

  if (!order) return null;

  function handleSetStatus() {
    if (!order) return;
    startTransition(async () => {
      const r = await setOrderStatusAction(
        order.id,
        selectedStatus as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'CANCELED' | 'ERROR',
        selectedStatus === 'PARTIAL' ? remains : undefined
      );
      if (r.success) {
        const refund = r.refundCents > 0 ? ` Возврат: ${(r.refundCents / 100).toFixed(2)} ₽` : '';
        toast.success(`✅ Статус #${r.numericId} изменён.${refund}`);
        onClose();
      } else {
        toast.error(r.error ?? 'Ошибка');
      }
    });
  }

  function handleForceComplete() {
    if (!order) return;
    startTransition(async () => {
      const r = await forceCompleteOrderAction(order.id);
      if (r.success) {
        const refund = r.refundCents > 0 ? ` Возврат: ${(r.refundCents / 100).toFixed(2)} ₽` : '';
        toast.success(`✅ Заказ #${r.numericId} завершён.${refund}`);
        onClose();
      } else {
        toast.error('Ошибка завершения');
      }
    });
  }

  function handleCancel() {
    if (!order) return;
    setConfirmAction('cancel');
    setConfirmOpen(true);
  }

  function handleRestart() {
    if (!order) return;
    setConfirmAction('restart');
    setConfirmOpen(true);
  }

  function executeConfirm() {
    if (!order || !confirmAction) return;
    setConfirmOpen(false);
    const fd = new FormData();
    fd.append('orderId', order.id);

    if (confirmAction === 'cancel') {
      startTransition(async () => {
        try {
          await cancelOrderAction(fd);
          toast.success(`🚫 Заказ #${order.numericId} отменён`);
          onClose();
        } catch (e) {
          toast.error((e as Error).message ?? 'Ошибка');
        }
      });
    } else if (confirmAction === 'restart') {
      startTransition(async () => {
        try {
          await restartOrderAction(fd);
          toast.success(`♻️ Заказ #${order.numericId} перезапущен`);
          onClose();
        } catch (e) {
          toast.error((e as Error).message ?? 'Ошибка');
        }
      });
    }
  }

  function handleFailoverClick() {
    if (!order) return;
    startTransition(async () => {
      try {
        const preview = await getFailoverPreview(order.id);
        if (preview.success) {
          setFailoverPreview(preview);
          if (preview.routes.length > 0) {
            setSelectedRouteId(preview.routes[0].routeId);
          }
          setIsFailoverModalOpen(true);
        }
      } catch (e) {
        toast.error((e as Error).message ?? 'Ошибка загрузки маршрутов');
      }
    });
  }

  function handleConfirmFailover() {
    if (!order || !selectedRouteId) return;
    startTransition(async () => {
      try {
        await manualRerouteOrder(order.id, selectedRouteId);
        toast.success(`♻️ Заказ #${order.numericId} перезапущен через нового провайдера`);
        setIsFailoverModalOpen(false);
        onClose();
      } catch (e) {
        toast.error((e as Error).message ?? 'Ошибка при перезапуске');
      }
    });
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-end transition-all duration-300 ${order ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl h-full bg-background border-l border-border shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Заказ <span className="text-muted-foreground">#{order.numericId}</span>
            </h2>
            <p className="text-xs text-muted-foreground">{order.user.email}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть панель заказа"
            className="p-2 rounded-full hover:bg-muted transition-all duration-200"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: 'Услуга', value: order.service.name },
              { label: 'Категория', value: order.service.category.name },
              { label: 'Соцсеть', value: order.service.category.network?.name ?? '—' },
              { label: 'Количество', value: order.quantity.toLocaleString('ru-RU') },
              { label: 'Сумма', value: `${(order.charge / 100).toFixed(2)} ₽` },
              { label: 'Остаток', value: order.remains.toLocaleString('ru-RU') },
              { label: 'Провайдер', value: order.providerName ?? '—' },
              { label: 'ID у провайдера', value: order.externalId ? `#${order.externalId}` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/30 rounded-xl p-3">
                <div className="text-xs text-muted-foreground mb-1">{label}</div>
                <div className="text-sm font-medium text-foreground truncate" title={value}>{value}</div>
              </div>
            ))}
            {canSeeRates && (
               <div className="bg-warning/10 border border-amber-100 rounded-xl p-3">
                 <div className="text-[10px] text-warning uppercase font-bold mb-1">Себестоимость</div>
                 <div className="text-sm font-mono font-bold text-amber-900">{(order.providerCost / 100).toFixed(2)} ₽</div>
               </div>
            )}
          </div>

          {/* Link */}
          <div className="bg-muted/30 rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1">Ссылка</div>
            <a href={order.link} target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline text-xs font-mono break-all transition-colors">
              {order.link}
            </a>
          </div>

          {/* Timeline / Dates */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Хронология заказа</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Создан:</span>
                <span className="font-mono font-medium text-foreground">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString('ru-RU') : '—'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Изменен:</span>
                <span className="font-mono font-medium text-foreground">
                  {order.updatedAt ? new Date(order.updatedAt).toLocaleString('ru-RU') : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Error / Provider Comment */}
          {order.error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
              <div className="text-xs text-destructive font-bold uppercase tracking-wider mb-1">⚠️ Ошибка / Ответ провайдера</div>
              <div className="text-xs text-rose-700 font-mono break-all">{order.error}</div>
            </div>
          )}

          {/* Status control */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">🎛️ Управление статусом</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Новый статус</label>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  aria-label="Выбор нового статуса заказа"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary transition-all duration-200"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {selectedStatus === 'PARTIAL' && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Остаток (remains) — сколько НЕ доставлено
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={order.quantity}
                    value={remains}
                    onChange={e => setRemains(parseInt(e.target.value) || 0)}
                    aria-label="Остаток недоставленных единиц"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary transition-all duration-200"
                  />
                  {remains > 0 && (
                    <p className="text-xs text-warning mt-1 font-medium">
                      Возврат: {((remains / order.quantity) * order.charge / 100).toFixed(2)} ₽
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleSetStatus}
                disabled={isPending || (selectedStatus === order.status && selectedStatus !== 'PARTIAL')}
                aria-label="Применить новый статус"
                className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 disabled:opacity-50"
              >
                {isPending ? 'Применяется...' : 'Применить статус'}
              </button>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleForceComplete}
              disabled={isPending || order.status === 'COMPLETED'}
              aria-label="Принудительно завершить заказ"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-300 bg-success/10 text-emerald-700 hover:bg-success/20 transition-all duration-200 disabled:opacity-40"
            >
              <CheckCircle className="w-4 h-4" />
              Завершить
            </button>
            <button
              onClick={handleRestart}
              disabled={isPending || order.status !== 'ERROR'}
              aria-label="Перезапустить заказ"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all duration-200 disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
              Перезапустить
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending || ['COMPLETED', 'CANCELED', 'PARTIAL'].includes(order.status)}
              aria-label="Отменить заказ"
              className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-rose-300 bg-destructive/10 text-rose-700 hover:bg-destructive/20 transition-all duration-200 disabled:opacity-40"
            >
              <XCircle className="w-4 h-4" />
              Отменить заказ
            </button>
            {['ERROR', 'CANCELED'].includes(order.status) && (
              <button
                onClick={handleFailoverClick}
                disabled={isPending}
                aria-label="Ручной перезапуск (Failover)"
                className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all duration-200 disabled:opacity-40"
              >
                <RotateCcw className="w-4 h-4" />
                Failover (Сменить провайдера)
              </button>
            )}
          </div>

          {/* DripFeed info */}
          {order.isDripFeed && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs">
              <div className="font-semibold text-violet-700 mb-1">📅 Drip-Feed</div>
              <div className="text-violet-600">
                Запуски: {order.currentRun} / {order.runs} ·
                Интервал: {order.interval} мин
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Failover Margin Preview Modal */}
      {isFailoverModalOpen && failoverPreview && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h3 className="font-bold text-lg flex items-center gap-2">
                ⚠️ Ручной перезапуск #{order.numericId}
              </h3>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Выберите резервного провайдера:</label>
                {failoverPreview.routes.length === 0 ? (
                  <div className="text-sm text-destructive font-medium">Нет доступных резервных маршрутов</div>
                ) : (
                  <select
                    value={selectedRouteId}
                    onChange={e => setSelectedRouteId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:border-primary"
                  >
                    {failoverPreview.routes.map((r) => (
                      <option key={r.routeId} value={r.routeId}>
                        {r.providerName} (Закупка: {(r.newCostCents / 100).toFixed(2)} ₽)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {activeRoute && (
                <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-2 text-sm">
                  <div className="font-bold mb-2">📊 Анализ маржи:</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Баланс клиента:</span>
                    <span className={failoverPreview.currentBalance < failoverPreview.clientPaidCents ? "text-destructive font-bold" : ""}>
                      {(failoverPreview.currentBalance / 100).toFixed(2)} ₽
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Клиент заплатил:</span>
                    <span>{(failoverPreview.clientPaidCents / 100).toFixed(2)} ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Резервный провайдер:</span>
                    <span>{(activeRoute.newCostCents / 100).toFixed(2)} ₽</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Новая маржа:</span>
                    <span className={activeRoute.isMarginPositive ? 'text-success' : 'text-destructive'}>
                      {(activeRoute.marginCents / 100).toFixed(2)} ₽ 
                      ({activeRoute.marginPercent}%) 
                      {activeRoute.isMarginPositive ? ' ✅' : ' 🔴'}
                    </span>
                  </div>
                </div>
              )}

              {failoverPreview.currentBalance < failoverPreview.clientPaidCents && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg flex items-start gap-2">
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    У клиента недостаточно средств на балансе для повторного списания (нужно {(failoverPreview.clientPaidCents / 100).toFixed(2)} ₽). Failover невозможен.
                  </div>
                </div>
              )}

              {order.error && (
                <div className="bg-warning/10 border border-warning/20 text-warning-foreground text-sm p-3 rounded-lg">
                  <span className="font-bold text-warning-foreground">⚠️ Причина ошибки:</span> "{order.error}"<br/>
                  <span className="text-muted-foreground mt-1 block">Убедитесь, что ссылка корректна перед перезапуском.</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsFailoverModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-border bg-background rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Отменить
                </button>
                <button
                  onClick={handleConfirmFailover}
                  disabled={isPending || failoverPreview.routes.length === 0 || failoverPreview.currentBalance < failoverPreview.clientPaidCents}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? 'Запуск...' : 'Подтвердить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeConfirm}
        title={confirmAction === 'cancel' ? 'Отмена заказа' : 'Перезапуск заказа'}
        isDanger={confirmAction === 'cancel'}
        confirmText={confirmAction === 'cancel' ? 'Отменить заказ' : 'Перезапустить'}
      >
        {confirmAction === 'cancel' ? (
          <>Вы действительно хотите отменить заказ <strong>#{order.numericId}</strong>? При наличии остатка клиент получит возврат.</>
        ) : (
          <>Вы действительно хотите перезапустить заказ <strong>#{order.numericId}</strong>? Будет повторно списано <strong>{(order.charge / 100).toFixed(2)} ₽</strong>.</>
        )}
      </ConfirmModal>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export function OrderClient({ data, canSeeRates = true }: OrderClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const editOrderId = searchParams.get('edit_order_id');
  const selectedOrder = React.useMemo(
    () => data.find(o => o.id === editOrderId) ?? null,
    [data, editOrderId]
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
      const r = await bulkCancelOrdersAction(ids);
      if (r.success) {
        const refund = r.totalRefundCents > 0
          ? `, возврат ${(r.totalRefundCents / 100).toFixed(2)} ₽`
          : '';
        toast.success(`🚫 Отменено ${r.cancelledCount} заказов${refund}`);
      } else {
        toast.error(r.error ?? 'Ошибка пакетной отмены');
      }
    });
  }

  return (
    <div className="relative">
      <DataTable
        columns={memoColumns}
        data={data}
        searchKey="user_email"
        searchPlaceholder="Фильтр по email на этой странице..."
        hideClientPagination={true}
        initialColumnVisibility={{ select: false, eta: false }}
        renderToolbar={(table) => {
          const selectedRows = table.getFilteredSelectedRowModel().rows;
          if (selectedRows.length === 0) return null;

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
                  intent="ghost"
                  disabled={isPendingBulk}
                  onClick={() => handleBulkCancel(selectedRows)}
                  aria-label="Отменить выбранные заказы"
                  className="text-destructive hover:bg-destructive/10 transition-all duration-200"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  {isPendingBulk ? 'Отмена...' : 'Отменить'}
                </Button>

                <Button
                  size="sm"
                  intent="ghost"
                  onClick={() => table.toggleAllPageRowsSelected(false)}
                  aria-label="Сбросить выделение"
                  className="text-muted-foreground hover:text-foreground transition-all duration-200"
                >
                  Сбросить
                </Button>
              </div>
            </div>
          );
        }}
      />

      {/* Order detail drawer */}
      <OrderDrawer order={selectedOrder} onClose={closeDrawer} canSeeRates={canSeeRates} />

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
