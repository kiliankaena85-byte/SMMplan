'use client';

import * as React from 'react';
import { useState, useTransition, useOptimistic } from 'react';
import { toast } from 'sonner';
import { OrderColumn, TenantBrandBadge } from './columns';
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
  Square,
  Copy,
  Check
} from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { OrderDetailsModal } from '@/components/admin/OrderDetailsModal';
import { BulkActionsPanel } from '@/components/admin/bulk-actions/BulkActionsPanel';
import { formatKopecks } from '@/utils/format-kopecks';
import { cancelOrderAction, restartOrderAction } from '@/actions/admin/orders';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface Props {
  data: OrderColumn[];
  canSeeRates?: boolean;
  userRole?: string;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  AWAITING_PAYMENT: { label: 'Ожидает оплаты', dot: 'bg-zinc-400',                   bg: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' },
  PENDING:          { label: 'В очереди',      dot: 'bg-amber-500',                  bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' },
  IN_PROGRESS:      { label: 'В работе',       dot: 'bg-sky-500 animate-pulse',      bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20' },
  COMPLETED:        { label: 'Выполнен',       dot: 'bg-emerald-500',                bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  PARTIAL:          { label: 'Частично',       dot: 'bg-orange-500',                 bg: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20' },
  CANCELED:         { label: 'Отменён',        dot: 'bg-rose-500',                   bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20' },
  ERROR:            { label: 'Ошибка',         dot: 'bg-red-500',                    bg: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20' },
  REFUNDING:        { label: 'Возврат',        dot: 'bg-purple-500',                 bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, dot: 'bg-muted-foreground', bg: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function InfoStack({ order }: { order: OrderColumn }) {
  const s = order.service;
  const [copied, setCopied] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const netName = s?.category?.network?.name || 'Платформа';
  const catName = s?.category?.name || '—';
  const srvName = s?.name || 'Услуга';
  
  // Format Date: 2026-08-21 01:53:06
  const dateObj = new Date(order.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateFormatted = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(order.link);
      setCopied(true);
      toast.success('Ссылка скопирована');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  return (
    <div className="flex flex-col space-y-1 text-xs min-w-0 py-0.5 leading-snug">
      {/* Соцсеть */}
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-foreground/70 shrink-0 font-normal">Соцсеть:</span>
        <span className="text-sky-600 dark:text-sky-400 font-medium truncate" title={netName}>
          {netName}
        </span>
      </div>

      {/* Категория */}
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-foreground/70 shrink-0 font-normal">Категория:</span>
        <span className="text-sky-600 dark:text-sky-400 font-medium truncate" title={catName}>
          {catName}
        </span>
      </div>

      {/* Услуга */}
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-foreground/70 shrink-0 font-normal">Услуга:</span>
        <span className="text-sky-600 dark:text-sky-400 font-medium break-words">
          {srvName}
        </span>
      </div>

      {/* Ссылка */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-foreground/70 shrink-0 font-normal">Ссылка:</span>
        <div className="flex items-center gap-1 min-w-0 max-w-[280px] sm:max-w-[400px]">
          <a 
            href={order.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sky-600 dark:text-sky-400 hover:underline truncate font-mono text-[11px]"
            title={order.link}
            onClick={(e) => e.stopPropagation()}
          >
            {order.link}
          </a>
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-all cursor-pointer shrink-0"
            title="Скопировать ссылку"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Кол-во */}
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-foreground/70 shrink-0 font-normal">Кол-во:</span>
        <span className="text-foreground font-semibold tabular-nums">
          {order.quantity.toLocaleString('ru-RU')}
          {order.remains > 0 && (
            <span className="text-amber-600 dark:text-amber-400 ml-1 font-normal text-[11px]">
              (остаток: {order.remains.toLocaleString('ru-RU')})
            </span>
          )}
        </span>
      </div>

      {/* Дата создания */}
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-foreground/70 shrink-0 font-normal">Дата создания:</span>
        <span className="text-foreground font-mono text-[11px] tabular-nums">
          {dateFormatted}
        </span>
      </div>

      {/* Скрыть / Показать детали */}
      <div className="pt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDetailsOpen(!detailsOpen);
          }}
          className="text-sky-600 dark:text-sky-400 hover:underline text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
        >
          {detailsOpen ? 'Скрыть детали' : 'Показать детали'}
        </button>

        {detailsOpen && (
          <div className="mt-1.5 space-y-1 text-xs pt-1 border-t border-border/40">
            <div className="flex items-baseline gap-1.5">
              <span className="text-foreground/70 shrink-0">Провайдер:</span>
              <span className="text-sky-600 dark:text-sky-400 font-medium">
                {order.providerName || '—'} {order.externalId ? `(${order.externalId})` : ''}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-foreground/70 shrink-0">ID заказа у провайдера:</span>
              <span className="text-foreground font-mono">
                {order.externalId || '-'}
              </span>
            </div>

            <div className="flex items-start gap-1.5">
              <span className="text-foreground/70 shrink-0">Комментарий провайдера:</span>
              <span className="text-muted-foreground break-all">
                {order.error || '-'}
              </span>
            </div>
          </div>
        )}
      </div>
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
      <div className="flex items-center justify-between gap-3 bg-muted/20 border border-border/60 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedIds(new Set());
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer ${
              selectionMode
                ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                : 'bg-background hover:bg-muted text-foreground border-border/80'
            }`}
          >
            {selectionMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            {selectionMode ? 'Выйти из выбора' : 'Выбрать заказы'}
          </button>

          {selectionMode && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-2.5 py-1 text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border/60 rounded-md transition-all cursor-pointer"
            >
              {selectedIds.size === optimisticData.length ? 'Снять всё' : `Выбрать все (${optimisticData.length})`}
            </button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Показано: <strong className="text-foreground font-mono">{optimisticData.length}</strong>
        </div>
      </div>

      {/* Desktop View: Grid (lg+) — Zero horizontal scroll */}
      <div className="hidden lg:block w-full bg-card border border-border/80 rounded-xl shadow-2xs overflow-hidden">
        {/* Grid Header */}
        <div role="row" className="grid grid-cols-[60px_180px_minmax(0,1fr)_100px_110px_80px] gap-3 items-center px-4 py-2.5 bg-muted/40 border-b border-border/60 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground select-none">
          <div>ID</div>
          <div>Клиент</div>
          <div>Информация о заказе</div>
          <div className="text-right">Сумма</div>
          <div>Статус</div>
          <div className="text-right">Действия</div>
        </div>

        {/* Grid Rows */}
        <div className="divide-y divide-border/40">
          {optimisticData.map((order) => {
            const isSelected = selectedIds.has(order.id);
            const chargeBig = BigInt(order.charge || '0');
            const costBig = BigInt(order.providerCost || '0');
            const marginKopecks = chargeBig - costBig;
            const marginPercent = chargeBig > BigInt(0) ? Math.round((Number(marginKopecks) / Number(chargeBig)) * 100) : 0;

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
                className={`grid grid-cols-[60px_180px_minmax(0,1fr)_100px_110px_80px] gap-3 items-start px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group ${
                  isSelected ? 'bg-primary/5' : ''
                }`}
              >
                {/* ID */}
                <div className="font-mono text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 min-w-0">
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRow(order.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
                    />
                  )}
                  <span className="truncate">#{order.numericId}</span>
                </div>

                {/* User Email */}
                <div className="min-w-0">
                  <Link
                    href={`/admin/clients?q=${encodeURIComponent(order.user.email)}`}
                    title={order.user.email}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-medium text-foreground/90 hover:text-primary hover:underline truncate block"
                  >
                    {order.user.email}
                  </Link>
                </div>

                {/* Information Stack */}
                <InfoStack order={order} />

                {/* Price & Margin */}
                <div className="flex flex-col items-end text-xs leading-tight font-medium text-right min-w-0 font-mono">
                  <div className="font-bold text-foreground tabular-nums text-xs">
                    {formatKopecks(order.charge)}
                  </div>
                  {canSeeRates && (
                    <div className="text-muted-foreground/70 text-[10px] select-none tabular-nums font-mono">
                      закуп: {formatKopecks(order.providerCost)}
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Row Actions */}
                <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => openDrawer(order.id)}
                    className="p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Подробнее о заказе"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSingleRestart(order)}
                    className="p-1 rounded text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    title="Перезапустить"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  {canCancel && !['COMPLETED', 'CANCELED'].includes(order.status) && (
                    <button
                      type="button"
                      onClick={() => handleSingleCancel(order)}
                      className="p-1 rounded text-muted-foreground/60 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Отменить и вернуть"
                    >
                      <XCircle className="w-3.5 h-3.5" />
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
                <div className="flex items-center gap-2 flex-wrap">
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
              <InfoStack order={order} />

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

      {/* Order Details Modal (Wide Bento Window) */}
      <OrderDetailsModal
        order={selectedOrder}
        onClose={closeDrawer}
        canSeeRates={canSeeRates}
        onSuccess={() => router.refresh()}
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
