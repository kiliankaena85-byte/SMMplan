'use client';

import * as React from 'react';
import { useState, useTransition, useOptimistic } from 'react';
import { toast } from 'sonner';
import { OrderColumn } from './columns';
import Link from 'next/link';
import { 
  Clock, 
  Hourglass, 
  Loader, 
  CheckCircle, 
  PieChart, 
  XCircle, 
  AlertTriangle, 
  Undo2, 
  Info, 
  RefreshCw, 
  CheckSquare, 
  Square 
} from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { OrderDrawer } from '@/components/admin/OrderDrawer';
import { BulkActionsPanel } from '@/components/admin/bulk-actions/BulkActionsPanel';
import { formatKopecks } from '@/utils/format-kopecks';
import { cancelOrderAction, restartOrderAction } from '@/actions/admin/orders';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface Props {
  data: OrderColumn[];
  canSeeRates?: boolean;
  userRole?: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; Icon: React.ReactNode }> = {
  AWAITING_PAYMENT: { label: 'Ожидает',   cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-slate-500/20', Icon: <Clock className="w-3 h-3" /> },
  PENDING:          { label: 'В очереди', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20', Icon: <Hourglass className="w-3 h-3" /> },
  IN_PROGRESS:      { label: 'В работе',  cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/20',           Icon: <Loader className="w-3 h-3 animate-spin" /> },
  COMPLETED:        { label: 'Выполнен',  cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20', Icon: <CheckCircle className="w-3 h-3" /> },
  PARTIAL:          { label: 'Частично',  cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20', Icon: <PieChart className="w-3 h-3" /> },
  CANCELED:         { label: 'Отменён',   cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20',        Icon: <XCircle className="w-3 h-3" /> },
  ERROR:            { label: 'Ошибка',    cls: 'bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20',           Icon: <AlertTriangle className="w-3 h-3" /> },
  REFUNDING:        { label: 'Возврат',   cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20', Icon: <Undo2 className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, cls: 'bg-muted text-muted-foreground ring-border', Icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ring-inset whitespace-nowrap ${config.cls}`}>
      {config.Icon}
      {config.label}
    </span>
  );
}

function InfoStack({ order, canSeeRates }: { order: OrderColumn; canSeeRates: boolean }) {
  const s = order.service;
  const progressPercent = order.quantity > 0 
    ? Math.min(100, Math.max(0, Math.round(((order.quantity - order.remains) / order.quantity) * 100))) 
    : 100;
  
  const marginKopecks = BigInt(order.charge) - BigInt(order.providerCost);
  const marginPercent = order.charge > 0 ? Math.round((Number(marginKopecks) / order.charge) * 100) : 0;

  return (
    <div className="flex flex-col space-y-0.5 text-xs min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
        <span className="font-bold text-foreground truncate">
          {s.category.network?.name ? `${s.category.network.name} · ` : ''}{s.category.name}
        </span>
      </div>

      <div className="font-semibold text-foreground truncate text-xs" title={s.name}>
        Сервис: {s.name}
      </div>

      <div className="flex items-center gap-1 text-[11px] truncate font-mono">
        <span className="text-muted-foreground shrink-0">🔗</span>
        <a 
          href={order.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sky-600 dark:text-sky-400 hover:underline truncate"
          title={order.link}
          onClick={(e) => e.stopPropagation()}
        >
          {order.link}
        </a>
      </div>

      <div className="flex items-center gap-2 text-[11px] tabular-nums text-foreground pt-0.5">
        <span>Кол-во: <strong>{order.quantity.toLocaleString('ru-RU')}</strong></span>
        <span>·</span>
        <span>Остаток: <strong>{order.remains.toLocaleString('ru-RU')}</strong></span>
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0 border border-border/40" title={`${progressPercent}% выполнено`}>
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {canSeeRates ? (
        <div className="text-[10px] text-muted-foreground tabular-nums pt-0.5 flex items-center gap-2">
          <span>Закупка: <strong>{formatKopecks(order.providerCost)}</strong></span>
          <span>·</span>
          <span>
            Маржа: <strong className={marginKopecks >= BigInt(0) ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
              {formatKopecks(marginKopecks)} ({marginPercent}%)
            </strong>
          </span>
        </div>
      ) : (
        <div className="text-[10px] text-muted-foreground pt-0.5">
          🔒 Себестоимость скрыта
        </div>
      )}

      {(order.isDripFeed || order.error) && (
        <div className="flex items-center gap-2 text-[10px] pt-0.5 flex-wrap">
          {order.isDripFeed && (
            <span className="text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-md font-bold">
              🔁 Drip ({order.currentRun}/{order.runs || '—'})
            </span>
          )}
          {order.error && (
            <span className="text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-md font-bold truncate max-w-[200px]" title={order.error}>
              ⚠️ {order.error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function timeRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} д назад`;
}

export function OrderClient({ data, canSeeRates = true, userRole = 'SUPPORT' }: Props) {
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

  // Selection mode & Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm Modals state for single row actions
  const [cancelModalOrder, setCancelModalOrder] = useState<OrderColumn | null>(null);
  const [, startTransition] = useTransition();

  const canCancel = ['OWNER', 'ADMIN'].includes(userRole);

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === optimisticData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(optimisticData.map(o => o.id)));
    }
  };

  function openDrawer(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('edit_order_id', id);
    router.push(`${pathname}?${params.toString()}`);
  }

  function closeDrawer() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('edit_order_id');
    router.replace(`${pathname}?${params.toString()}`);
  }

  const handleSingleCancel = (order: OrderColumn) => {
    setCancelModalOrder(order);
  };

  const executeSingleCancel = () => {
    if (!cancelModalOrder) return;
    const orderId = cancelModalOrder.id;
    setCancelModalOrder(null);

    startTransition(async () => {
      addOptimisticUpdate({ id: orderId, status: 'CANCELED' });
      try {
        const fd = new FormData();
        fd.set('orderId', orderId);
        const res = await cancelOrderAction(fd);
        if (res.success) {
          toast.success(`🚫 Заказ #${cancelModalOrder.numericId} отменён`);
        } else if (res.error) {
          toast.error(res.error);
        }
      } catch (err) {
        toast.error((err as Error).message || 'Ошибка при отмене заказа');
      }
    });
  };

  const handleSingleRestart = (order: OrderColumn) => {
    startTransition(async () => {
      addOptimisticUpdate({ id: order.id, status: 'IN_PROGRESS' });
      try {
        const fd = new FormData();
        fd.set('orderId', order.id);
        const res = await restartOrderAction(fd);
        if (res.success) {
          toast.success(`⟳ Заказ #${order.numericId} перезапущен`);
        } else if (res.error) {
          toast.error(res.error);
        }
      } catch (err) {
        toast.error((err as Error).message || 'Ошибка при перезапуске заказа');
      }
    });
  };

  const selectedOrdersList = React.useMemo(
    () => optimisticData.filter(o => selectedIds.has(o.id)),
    [optimisticData, selectedIds]
  );

  return (
    <div className="w-full space-y-4">
      {/* Top Toolbar: Selection Mode Toggle & Page Controls */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border/60 rounded-2xl p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedIds(new Set());
            }}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              selectionMode
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background hover:bg-muted text-foreground border-border/80'
            }`}
          >
            {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {selectionMode ? 'Выйти из выбора' : 'Режим выбора'}
          </button>

          {selectionMode && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-3 py-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 rounded-xl transition-all cursor-pointer"
            >
              {selectedIds.size === optimisticData.length ? 'Снять выделение' : `Выделить всё (${optimisticData.length})`}
            </button>
          )}
        </div>

        <div className="text-xs text-muted-foreground font-semibold">
          Показано: <strong className="text-foreground font-mono">{optimisticData.length}</strong> заказов
        </div>
      </div>

      {/* Desktop View: Grid (lg+) — Zero horizontal scroll */}
      <div className="hidden lg:block w-full bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Grid Header */}
        <div role="row" className="grid grid-cols-[96px_168px_minmax(0,1fr)_88px_120px_120px_116px] gap-3 items-center px-4 py-3 bg-muted/40 border-b border-border/60 font-bold text-[10px] uppercase tracking-wider text-muted-foreground select-none">
          <div>ID</div>
          <div>Пользователь</div>
          <div>Информация</div>
          <div className="text-right">Цена</div>
          <div>Статус</div>
          <div>Создана</div>
          <div className="text-right">Действия</div>
        </div>

        {/* Grid Rows */}
        <div className="divide-y divide-border/40">
          {optimisticData.map((order) => {
            const isSelected = selectedIds.has(order.id);

            return (
              <div
                key={order.id}
                role="row"
                onClick={() => {
                  if (selectionMode) {
                    toggleSelectRow(order.id);
                  } else {
                    openDrawer(order.id);
                  }
                }}
                className={`grid grid-cols-[96px_168px_minmax(0,1fr)_88px_120px_120px_116px] gap-3 items-start px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group ${
                  isSelected ? 'bg-primary/5' : ''
                }`}
              >
                {/* ID */}
                <div className="font-mono text-xs font-bold text-primary flex items-center gap-2">
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRow(order.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  )}
                  <span>#{order.numericId}</span>
                </div>

                {/* User Email */}
                <div className="min-w-0">
                  <Link
                    href={`/admin/clients?q=${encodeURIComponent(order.user.email)}`}
                    title={order.user.email}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline truncate block"
                  >
                    {order.user.email}
                  </Link>
                </div>

                {/* Information Stack */}
                <InfoStack order={order} canSeeRates={canSeeRates} />

                {/* Price */}
                <div className="text-xs font-bold tabular-nums text-right text-foreground whitespace-nowrap pt-0.5">
                  {formatKopecks(order.charge)}
                </div>

                {/* Status Badge */}
                <div className="pt-0.5">
                  <StatusBadge status={order.status} />
                </div>

                {/* Created At (Relative time + full tooltip) */}
                <div className="text-xs text-muted-foreground whitespace-nowrap pt-0.5" title={new Date(order.createdAt).toLocaleString('ru-RU')}>
                  {timeRelative(order.createdAt)}
                </div>

                {/* Row Actions */}
                <div className="flex items-center justify-end gap-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => openDrawer(order.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Подробнее"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSingleRestart(order)}
                    className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-500/10 transition-colors"
                    title="Перезапустить"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  {canCancel && !['COMPLETED', 'CANCELED'].includes(order.status) && (
                    <button
                      type="button"
                      onClick={() => handleSingleCancel(order)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10 transition-colors"
                      title="Отменить и вернуть"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Card Stack (< lg) — Zero horizontal scroll */}
      <div className="block lg:hidden space-y-3">
        {optimisticData.map((order) => {
          const isSelected = selectedIds.has(order.id);

          return (
            <article
              key={order.id}
              onClick={() => {
                if (selectionMode) {
                  toggleSelectRow(order.id);
                } else {
                  openDrawer(order.id);
                }
              }}
              className={`bg-card border border-border/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-3 cursor-pointer ${
                isSelected ? 'ring-2 ring-primary/40 bg-primary/5' : ''
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                <div className="flex items-center gap-2">
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRow(order.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-border text-primary"
                    />
                  )}
                  <span className="font-mono font-bold text-sm text-primary">#{order.numericId}</span>
                  <span className="text-xs text-muted-foreground" title={new Date(order.createdAt).toLocaleString('ru-RU')}>
                    {timeRelative(order.createdAt)}
                  </span>
                </div>

                <StatusBadge status={order.status} />
              </div>

              {/* User Email */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Клиент:</span>
                <Link
                  href={`/admin/clients?q=${encodeURIComponent(order.user.email)}`}
                  className="font-semibold text-sky-600 dark:text-sky-400 hover:underline truncate max-w-[200px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {order.user.email}
                </Link>
              </div>

              {/* Info Stack */}
              <InfoStack order={order} canSeeRates={canSeeRates} />

              {/* Footer */}
              <div className="flex items-center justify-between pt-2.5 border-t border-border/40 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Стоимость</span>
                  <span className="font-bold text-sm tabular-nums text-foreground">{formatKopecks(order.charge)}</span>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => openDrawer(order.id)}
                    className="p-2 rounded-xl bg-muted text-foreground font-semibold text-xs flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5" /> Детали
                  </button>
                  {canCancel && !['COMPLETED', 'CANCELED'].includes(order.status) && (
                    <button
                      type="button"
                      onClick={() => handleSingleCancel(order)}
                      className="p-2 rounded-xl bg-rose-500/10 text-rose-600 font-semibold text-xs flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Отмена
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Floating Bulk Actions Panel */}
      {selectionMode && (
        <BulkActionsPanel
          selectedOrders={selectedOrdersList}
          canSeeRates={canSeeRates}
          userRole={userRole}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      {/* Order Drawer Component */}
      <OrderDrawer
        order={selectedOrder}
        onClose={closeDrawer}
        canSeeRates={canSeeRates}
      />

      {/* Single Cancel Confirm Modal */}
      {cancelModalOrder && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setCancelModalOrder(null)}
          onConfirm={executeSingleCancel}
          title={`Отмена заказа #${cancelModalOrder.numericId}`}
          confirmText="Отменить и вернуть"
          isDanger={true}
        >
          <p className="text-xs text-muted-foreground">
            Вы уверены, что хотите отменить заказ #{cancelModalOrder.numericId} и произвести возврат средств клиенту ({cancelModalOrder.user.email})?
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}
