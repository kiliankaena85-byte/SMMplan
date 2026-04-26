'use client';

/**
 * OrderClient v2 — Sprint 1.5
 *
 * - Batch action bar: bulk cancel с реальным Server Action
 * - Drawer с реальными действиями: setStatus, forceComplete, restart, cancel
 * - Partial delivery: поле remains при PARTIAL статусе
 * - Строгий тип OrderColumn (без any)
 */

import * as React from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { columns, OrderColumn } from './columns';
import { Button, Chip } from '@heroui/react';
import { XCircle, CheckCircle, RotateCcw, X } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  setOrderStatusAction,
  forceCompleteOrderAction,
  bulkCancelOrdersAction,
} from '@/actions/admin/orders-extended';
import {
  cancelOrderAction,
  restartOrderAction,
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
}

// ── Sub: Order Drawer ───────────────────────────────────────────────────────
function OrderDrawer({
  order,
  onClose,
}: {
  order: OrderColumn | null;
  onClose: () => void;
}) {
  const [selectedStatus, setSelectedStatus] = useState(order?.status ?? '');
  const [remains, setRemains] = useState(order?.remains ?? 0);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    setSelectedStatus(order?.status ?? '');
    setRemains(order?.remains ?? 0);
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
    if (!confirm(`Отменить заказ #${order.numericId}? При наличии остатка клиент получит возврат.`)) return;
    const fd = new FormData();
    fd.append('orderId', order.id);
    startTransition(async () => {
      try {
        await cancelOrderAction(fd);
        toast.success(`🚫 Заказ #${order.numericId} отменён`);
        onClose();
      } catch (e) {
        toast.error((e as Error).message ?? 'Ошибка');
      }
    });
  }

  function handleRestart() {
    if (!order) return;
    if (!confirm(`Перезапустить заказ #${order.numericId}? Будет повторно списано ${(order.charge / 100).toFixed(2)} ₽`)) return;
    const fd = new FormData();
    fd.append('orderId', order.id);
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

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-end transition-all duration-300 ${order ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
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
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Услуга', value: order.service.name },
              { label: 'Категория', value: order.service.category.name },
              { label: 'Соцсеть', value: order.service.category.network?.name ?? '—' },
              { label: 'Количество', value: order.quantity.toLocaleString('ru-RU') },
              { label: 'Сумма', value: `${(order.charge / 100).toFixed(2)} ₽` },
              { label: 'Остаток', value: order.remains.toLocaleString('ru-RU') },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/30 rounded-xl p-3">
                <div className="text-xs text-muted-foreground mb-1">{label}</div>
                <div className="text-sm font-medium text-foreground truncate" title={value}>{value}</div>
              </div>
            ))}
          </div>

          {/* Link */}
          <div className="bg-muted/30 rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1">Ссылка</div>
            <a href={order.link} target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline text-xs font-mono break-all transition-colors">
              {order.link}
            </a>
          </div>

          {/* Error if present */}
          {order.error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
              <div className="text-xs text-rose-500 font-medium mb-1">⚠️ Ошибка API</div>
              <div className="text-xs text-rose-700 font-mono break-all">{order.error}</div>
            </div>
          )}

          {/* Status control */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
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
                    <p className="text-xs text-amber-600 mt-1">
                      Возврат: {((remains / order.quantity) * order.charge / 100).toFixed(2)} ₽
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleSetStatus}
                disabled={isPending || selectedStatus === order.status}
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
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all duration-200 disabled:opacity-40"
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
              disabled={isPending || ['COMPLETED', 'CANCELED'].includes(order.status)}
              aria-label="Отменить заказ"
              className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all duration-200 disabled:opacity-40"
            >
              <XCircle className="w-4 h-4" />
              Отменить заказ
            </button>
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
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export function OrderClient({ data }: OrderClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const editOrderId = searchParams.get('edit_order_id');
  const selectedOrder = React.useMemo(
    () => data.find(o => o.id === editOrderId) ?? null,
    [data, editOrderId]
  );

  const [isPendingBulk, startBulkTransition] = useTransition();

  function closeDrawer() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('edit_order_id');
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleBulkCancel(selectedRows: { original: unknown }[]) {
    const ids = selectedRows.map(r => (r.original as OrderColumn).id);
    if (!confirm(`Отменить ${ids.length} заказов? Возврат будет рассчитан автоматически.`)) return;
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
        columns={columns}
        data={data}
        searchKey="user_email"
        searchPlaceholder="Фильтр по email на этой странице..."
        renderToolbar={(table) => {
          const selectedRows = table.getFilteredSelectedRowModel().rows;
          if (selectedRows.length === 0) return null;

          return (
            <div className="fixed bottom-6 inset-x-0 mx-auto w-max max-w-[90vw] z-50 animate-in slide-in-from-bottom-10 fade-in flex items-center gap-4 bg-card border border-border px-6 py-3 rounded-full shadow-2xl">
              <div className="flex items-center gap-2 border-r border-border pr-4">
                <Chip size="sm" className="bg-primary text-primary-foreground font-bold px-2">
                  {selectedRows.length}
                </Chip>
                <span className="text-sm font-medium text-foreground">выбрано</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  isDisabled={isPendingBulk}
                  onPress={() => handleBulkCancel(selectedRows)}
                  aria-label="Отменить выбранные заказы"
                  className="text-rose-600 hover:bg-rose-50 transition-all duration-200"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  {isPendingBulk ? 'Отмена...' : 'Отменить'}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => table.toggleAllPageRowsSelected(false)}
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
      <OrderDrawer order={selectedOrder} onClose={closeDrawer} />
    </div>
  );
}
