'use client';
// audit-disable STR-002

import * as React from 'react';
import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { XCircle, CheckCircle, RotateCcw, X, ExternalLink, Loader2 } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
  cancelOrderAction,
  restartOrderAction,
  setOrderStatusAction,
  forceCompleteOrderAction,
  getFailoverPreview,
  manualRerouteOrder,
  getOrderDetailsAction,
} from '@/actions/admin/orders';

// Define loose type that supports both full and partial orders
export interface OrderDrawerColumn {
  id: string;
  numericId: number;
  externalId?: string | null;
  link?: string;
  quantity?: number;
  remains?: number;
  status: string;
  charge: number | string;
  providerCost?: number | string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  isDripFeed?: boolean;
  dripExternalIds?: string[];
  runs?: number | null;
  interval?: number | null;
  currentRun?: number;
  error?: string | null;
  user?: { email: string };
  providerName?: string | null;
  service?: {
    name: string;
    category: {
      name: string;
      network: { name: string } | null;
    };
  };
}

interface OrderDrawerProps {
  order: OrderDrawerColumn | null;
  onClose: () => void;
  canSeeRates?: boolean;
  addOptimisticUpdate?: (update: { id: string; status: string; remains?: number }) => void;
  onSuccess?: () => void;
}

interface FailoverRoute {
  routeId: string;
  providerName: string;
  priceUnknown?: boolean;
  newCostCents: number | null;
  marginCents: number | null;
  marginPercent: number | null;
  isMarginPositive: boolean;
}

interface FailoverPreviewData {
  success: boolean;
  clientPaidCents: number;
  currentBalance: number;
  routes: FailoverRoute[];
}

const STATUS_OPTIONS = [
  { value: 'PENDING',           label: 'В очереди' },
  { value: 'IN_PROGRESS',       label: 'В работе' },
  { value: 'COMPLETED',         label: 'Выполнен' },
  { value: 'PARTIAL',           label: 'Частичный' },
  { value: 'CANCELED',          label: 'Отменён' },
  { value: 'ERROR',             label: 'Ошибка' },
  { value: 'AWAITING_PAYMENT',  label: 'Ожидает оплату' },
] as const;


function localizeProviderError(error: string | null): string | null {
  if (!error) return null;
  const errLower = error.toLowerCase();

  // Suppress internal/dev-only errors — these are config issues, not provider errors
  if (
    errLower.includes('fail-fast') ||
    errLower.includes('mock_') ||
    errLower.includes('.env') ||
    errLower.includes('err_internal_server') ||
    errLower.includes('configure it in')
  ) {
    return null;
  }

  if (errLower.includes('invalid link') || errLower.includes('bad link')) {
    return 'Неверная ссылка (профиль закрыт или неверный формат)';
  }
  if (errLower.includes('rate limit') || errLower.includes('too many requests')) {
    return 'Превышен лимит запросов у провайдера';
  }
  if (errLower.includes('not enough balance') || errLower.includes('low balance')) {
    return 'Недостаточный баланс у провайдера';
  }
  return error;
}

export function OrderDrawer({
  order,
  onClose,
  canSeeRates = true,
  addOptimisticUpdate,
  onSuccess,
}: OrderDrawerProps) {
  const [fullOrder, setFullOrder] = useState<OrderDrawerColumn | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState('');
  const [remains, setRemains] = useState(0);
  const [failoverPreview, setFailoverPreview] = useState<FailoverPreviewData | null>(null);
  const [isFailoverModalOpen, setIsFailoverModalOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [acknowledgeBlindReroute, setAcknowledgeBlindReroute] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Custom Confirmation Modal State (replacing native confirm)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'restart' | null>(null);

  const activeRoute = selectedRouteId
    ? failoverPreview?.routes.find(r => r.routeId === selectedRouteId)
    : null;

  // Hydrate order details if only partial order is provided (e.g. from tickets)
  useEffect(() => {
    if (!order) {
      setFullOrder(null);
      return;
    }

    const hasFullDetails = order.link !== undefined && order.service?.category !== undefined;

    if (hasFullDetails) {
      setFullOrder(order);
    } else {
      setIsLoadingDetails(true);
      getOrderDetailsAction(order.id)
        .then((res) => {
          if (res) {
            setFullOrder(res as unknown as OrderDrawerColumn);
          } else {
            toast.error('Не удалось загрузить подробности заказа');
            setFullOrder(order); // fallback to partial
          }
        })
        .catch((err) => {
          toast.error(`Ошибка загрузки: ${err.message}`);
          setFullOrder(order);
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    }
  }, [order]);

  // Synchronize status and values when fullOrder loads
  useEffect(() => {
    if (fullOrder) {
      setSelectedStatus(fullOrder.status);
      setRemains(fullOrder.remains ?? 0);
    }
    setIsFailoverModalOpen(false);
    setConfirmOpen(false);
    setConfirmAction(null);
  }, [fullOrder]);

  // Keyboard Shortcuts: Alt+C (Cancel), Alt+R (Restart), Alt+M (Failover)
  useEffect(() => {
    if (!order) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey) {
        if (e.code === 'KeyC') {
          e.preventDefault();
          setConfirmAction('cancel');
          setConfirmOpen(true);
        } else if (e.code === 'KeyR') {
          e.preventDefault();
          setConfirmAction('restart');
          setConfirmOpen(true);
        } else if (e.code === 'KeyM') {
          e.preventDefault();
          setIsFailoverModalOpen(prev => !prev);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order]);

  if (!order) return null;

  const currentOrder = fullOrder || order;

  // Price calculations
  const quantity = currentOrder.quantity ?? 0;
  const chargeRub = Number(BigInt(currentOrder.charge || 0)) / 100;
  const pricePerUnitRub = quantity > 0 ? chargeRub / quantity : 0;
  const pricePer1kRub = pricePerUnitRub * 1000;

  const costRub = Number(BigInt(currentOrder.providerCost ?? 0)) / 100;

  function handleSetStatus() {
    if (!currentOrder) return;
    startTransition(async () => {
      if (addOptimisticUpdate) {
        addOptimisticUpdate({
          id: currentOrder.id,
          status: selectedStatus,
          remains: selectedStatus === 'PARTIAL' ? remains : undefined,
        });
      }
      try {
        const r = await setOrderStatusAction(
          currentOrder.id,
          selectedStatus as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'CANCELED' | 'ERROR',
          selectedStatus === 'PARTIAL' ? remains : undefined
        );
        if (r.success) {
          const refund = r.refundCents > 0 ? ` Возврат: ${(r.refundCents / 100).toFixed(2)} ₽` : '';
          toast.success(`ОК: Статус #${r.numericId} изменен.${refund}`);
          if (onSuccess) onSuccess();
          onClose();
        } else {
          toast.error(r.error || 'Ошибка изменения статуса');
        }
      } catch (e) {
        toast.error((e as Error).message || 'Ошибка изменения статуса');
      }
    });
  }

  function handleForceComplete() {
    if (!currentOrder) return;
    startTransition(async () => {
      if (addOptimisticUpdate) {
        addOptimisticUpdate({ id: currentOrder.id, status: 'COMPLETED' });
      }
      try {
        const r = await forceCompleteOrderAction(currentOrder.id);
        if (r.success) {
          const refund = r.refundCents > 0 ? ` Возврат: ${(r.refundCents / 100).toFixed(2)} ₽` : '';
          toast.success(`ОК: Заказ #${r.numericId} завершен.${refund}`);
          if (onSuccess) onSuccess();
          onClose();
        } else {
          toast.error(r.error || 'Ошибка завершения');
        }
      } catch (e) {
        toast.error((e as Error).message || 'Ошибка завершения');
      }
    });
  }

  function handleCancel() {
    setConfirmAction('cancel');
    setConfirmOpen(true);
  }

  function handleRestart() {
    setConfirmAction('restart');
    setConfirmOpen(true);
  }

  function executeConfirm() {
    if (!currentOrder || !confirmAction) return;
    setConfirmOpen(false);
    const fd = new FormData();
    fd.append('orderId', currentOrder.id);

    if (confirmAction === 'cancel') {
      startTransition(async () => {
        if (addOptimisticUpdate) {
          addOptimisticUpdate({ id: currentOrder.id, status: 'CANCELED' });
        }
        try {
          const r = await cancelOrderAction(fd);
          if (r.success) {
            toast.success(`Успех: Заказ #${currentOrder.numericId} отменен`);
            if (onSuccess) onSuccess();
            onClose();
          } else {
            toast.error(r.error || 'Ошибка отмены');
          }
        } catch (e) {
          toast.error((e as Error).message ?? 'Ошибка');
        }
      });
    } else if (confirmAction === 'restart') {
      startTransition(async () => {
        if (addOptimisticUpdate) {
          addOptimisticUpdate({ id: currentOrder.id, status: 'PENDING' });
        }
        try {
          const r = await restartOrderAction(fd);
          if (r.success) {
            toast.success(`Успех: Заказ #${currentOrder.numericId} перезапущен`);
            if (onSuccess) onSuccess();
            onClose();
          } else {
            toast.error(r.error || 'Ошибка перезапуска');
          }
        } catch (e) {
          toast.error((e as Error).message ?? 'Ошибка');
        }
      });
    }
  }

  function handleFailoverClick() {
    if (!currentOrder) return;
    startTransition(async () => {
      try {
        const preview = await getFailoverPreview(currentOrder.id);
        if (preview.success) {
          if (preview.routes.length > 0) {
            setSelectedRouteId(preview.routes[0].routeId);
          }
          setFailoverPreview(preview);
          setIsFailoverModalOpen(true);
        } else {
          toast.error(('error' in preview ? preview.error : undefined) || 'Ошибка получения маршрутов');
        }
      } catch (e) {
        toast.error((e as Error).message ?? 'Ошибка загрузки маршрутов');
      }
    });
  }

  function handleConfirmFailover() {
    if (!currentOrder || !selectedRouteId) return;
    startTransition(async () => {
      try {
        const r = await manualRerouteOrder(currentOrder.id, selectedRouteId, acknowledgeBlindReroute);
        if (r.success) {
          toast.success(`Успех: Заказ #${currentOrder.numericId} переведен на резервный маршрут`);
          setIsFailoverModalOpen(false);
          setAcknowledgeBlindReroute(false);
          if (onSuccess) onSuccess();
          onClose();
        } else {
          toast.error(r.error || 'Ошибка перевода заказа');
        }
      } catch (e) {
        toast.error((e as Error).message ?? 'Ошибка при перезапуске');
      }
    });
  }

  const localizedError = localizeProviderError(currentOrder.error ?? null);

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
      <div className="relative w-full max-w-xl h-full bg-background/95 backdrop-blur-2xl border-l border-border/60 shadow-2xl overflow-y-auto ring-1 ring-border/10">
        {/* Header */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border/60 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Заказ <span className="text-muted-foreground font-mono tabular-nums tracking-tight">#{currentOrder.numericId}</span>
            </h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {currentOrder.user?.email || 'Загрузка email...'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть панель заказа"
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoadingDetails ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-medium">Загрузка деталей заказа...</span>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(() => {
                const networkName = currentOrder.service?.category.network?.name ?? null;
                // Strip redundant network prefix from service/category names to avoid repetition
                const stripNetwork = (str: string) => {
                  if (!networkName) return str;
                  return str.startsWith(networkName + ' ') ? str.slice(networkName.length + 1) : str;
                };
                return [
                  { label: 'Услуга', value: stripNetwork(currentOrder.service?.name || '') || '—' },
                  { label: 'Категория', value: stripNetwork(currentOrder.service?.category.name || '') || '—' },
                  { label: 'Соцсеть', value: networkName ?? '—' },
                  { label: 'Количество', value: quantity.toLocaleString('ru-RU') },
                  { label: 'Сумма', value: `${chargeRub.toFixed(2)} ₽` },
                  { label: 'Цена за 1 шт', value: `${pricePerUnitRub.toFixed(4)} ₽` },
                  { label: 'Цена за 1к', value: `${pricePer1kRub.toFixed(2)} ₽` },
                  { label: 'Остаток', value: (currentOrder.remains ?? 0).toLocaleString('ru-RU') },
                  { label: 'Провайдер', value: currentOrder.providerName ?? '—' },
                  { label: 'ID у провайдера', value: currentOrder.externalId ? `#${currentOrder.externalId}` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/40 border border-border/40 shadow-sm rounded-xl p-3 transition-colors hover:bg-muted/60">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">{label}</div>
                    <div className="text-sm font-semibold text-foreground truncate tabular-nums tracking-tight" title={value}>{value}</div>
                  </div>
                ));
              })()}
              
              {canSeeRates && currentOrder.providerCost !== undefined && (() => {
                const marginRub = chargeRub - costRub;
                const marginPct = chargeRub > 0 ? ((marginRub / chargeRub) * 100).toFixed(1) : '—';
                return (
                  <div className="col-span-2 bg-amber-500/10 border border-amber-500/20 shadow-sm rounded-xl p-3 transition-colors hover:bg-amber-500/15 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider mb-1">Себестоимость</div>
                      <div className="text-sm font-mono font-bold text-amber-700 dark:text-amber-300 tabular-nums tracking-tight">
                        {costRub.toFixed(2)} ₽
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider mb-1">Маржа</div>
                      <div className="text-sm font-mono font-bold text-amber-700 dark:text-amber-300 tabular-nums tracking-tight">
                        {marginRub.toFixed(2)} ₽ <span className="text-[10px] font-semibold opacity-70">({marginPct}%)</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Link */}
            {currentOrder.link && (
              <div className="bg-muted/40 border border-border/40 shadow-sm rounded-xl p-3 transition-colors hover:bg-muted/60">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Ссылка</div>
                <a href={currentOrder.link} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs font-mono break-all transition-colors font-semibold flex items-center gap-1.5 w-max max-w-full">
                  {currentOrder.link}
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            )}

            {/* Timeline / Dates */}
            <div className="bg-muted/40 border border-border/40 shadow-sm rounded-xl p-4 space-y-3 transition-colors hover:bg-muted/60">
              <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Хронология заказа</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground">Создан:</span>
                  <span className="font-mono font-medium text-foreground">
                    {currentOrder.createdAt ? new Date(currentOrder.createdAt).toLocaleString('ru-RU') : '—'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground">Изменен:</span>
                  <span className="font-mono font-medium text-foreground">
                    {currentOrder.updatedAt ? new Date(currentOrder.updatedAt).toLocaleString('ru-RU') : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Error / Provider Comment */}
            {currentOrder.error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                <div className="text-xs text-destructive font-bold uppercase tracking-wider mb-1">⚠️ Ошибка / Ответ провайдера</div>
                <div className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-1">
                  {localizedError}
                </div>
                {localizedError !== currentOrder.error && (
                  <div className="text-[10px] text-muted-foreground font-mono break-all mt-0.5">
                    Исходная ошибка: {currentOrder.error}
                  </div>
                )}
              </div>
            )}

            {/* Status control */}
            <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 space-y-4 shadow-sm ring-1 ring-border/5">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="bg-primary/10 text-primary p-1 rounded-md"><RotateCcw className="w-3.5 h-3.5" /></span>
                Управление статусом
              </h3>

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
                      max={quantity}
                      value={remains}
                      onChange={e => setRemains(parseInt(e.target.value) || 0)}
                      aria-label="Остаток недоставленных единиц"
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary transition-all duration-200"
                    />
                    {remains > 0 && (
                      <p className="text-xs text-warning mt-1 font-medium">
                        Возврат: {((remains / quantity) * chargeRub).toFixed(2)} ₽
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleSetStatus}
                  disabled={isPending || (selectedStatus === currentOrder.status && selectedStatus !== 'PARTIAL')}
                  aria-label="Применить новый статус"
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold shadow-sm bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:active:scale-100"
                >
                  {isPending ? 'Применяется...' : 'Применить статус'}
                </button>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleForceComplete}
                disabled={isPending || currentOrder.status === 'COMPLETED'}
                aria-label="Принудительно завершить заказ"
                className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium border border-emerald-500/30 bg-success/10 text-success hover:bg-success/20 transition-all duration-200 disabled:opacity-40 active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                Завершить
              </button>
              <button
                onClick={handleRestart}
                disabled={isPending || currentOrder.status !== 'ERROR'}
                aria-label="Перезапустить заказ"
                className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200 disabled:opacity-40 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                Перезапустить <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded text-muted-foreground">Alt+R</kbd>
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending || ['COMPLETED', 'CANCELED', 'PARTIAL', 'IN_PROGRESS', 'ERROR'].includes(currentOrder.status)}
                aria-label="Отменить заказ"
                className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all duration-200 disabled:opacity-40 active:scale-95"
              >
                <XCircle className="w-4 h-4" />
                Отменить заказ <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded text-muted-foreground">Alt+C</kbd>
              </button>
              {['ERROR', 'CANCELED'].includes(currentOrder.status) && (
                <button
                  onClick={handleFailoverClick}
                  disabled={isPending}
                  aria-label="Ручной перезапуск (Failover)"
                  className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 transition-all duration-200 disabled:opacity-40 active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  Failover (Сменить провайдера) <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded text-muted-foreground">Alt+M</kbd>
                </button>
              )}
            </div>

            {/* DripFeed info */}
            {currentOrder.isDripFeed && (
              <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40 rounded-xl p-3 text-xs">
                <div className="font-semibold text-violet-700 dark:text-violet-400 mb-1">📅 Drip-Feed</div>
                <div className="text-violet-600 dark:text-violet-300">
                  Запуски: {currentOrder.currentRun} / {currentOrder.runs} ·
                  Интервал: {currentOrder.interval} мин
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Failover Margin Preview Modal */}
      {isFailoverModalOpen && failoverPreview && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h3 className="font-bold text-lg flex items-center gap-2">
                ⚠️ Ручной перезапуск #{currentOrder.numericId}
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
                    onChange={e => { setSelectedRouteId(e.target.value); setAcknowledgeBlindReroute(false); }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:border-primary"
                  >
                    {failoverPreview.routes.map((r) => (
                      <option key={r.routeId} value={r.routeId}>
                        {r.providerName} {r.priceUnknown ? '(Цена неизвестна ⚠️)' : `(Закупка: ${((r.newCostCents || 0) / 100).toFixed(2)} ₽)`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {activeRoute && (
                <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-2 text-sm">
                  <div className="font-bold mb-2">📊 Анализ маржи:</div>
                  {activeRoute.priceUnknown ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-warning">⚠️ Цена провайдера неизвестна</div>
                      <div className="text-xs text-muted-foreground">
                        В теневом каталоге нет актуальной цены. Синхронизируйте каталог или подтвердите reroute вслепую.
                      </div>
                      <label className="flex items-center gap-2 pt-2 text-xs font-semibold text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acknowledgeBlindReroute}
                          onChange={e => setAcknowledgeBlindReroute(e.target.checked)}
                          className="rounded border-border"
                        />
                        <span>Подтверждаю Reroute вслепую (без известной цены)</span>
                      </label>
                    </div>
                  ) : (
                    <>
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
                        <span>{((activeRoute.newCostCents || 0) / 100).toFixed(2)} ₽</span>
                      </div>
                      <div className="h-px bg-border my-2" />
                      <div className="flex justify-between font-bold">
                        <span>Новая маржа:</span>
                        <span className={activeRoute.isMarginPositive ? 'text-success' : 'text-destructive'}>
                          {((activeRoute.marginCents || 0) / 100).toFixed(2)} ₽ 
                          ({activeRoute.marginPercent ?? 0}%) 
                          {activeRoute.isMarginPositive ? ' ✅' : ' 🔴'}
                        </span>
                      </div>
                    </>
                  )}
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

              {currentOrder.error && localizedError && !localizedError.includes('MOCK_') && !localizedError.toLowerCase().includes('fail-fast') && !localizedError.includes('.env') && (
                <div className="bg-warning/10 border border-warning/20 text-warning-foreground text-sm p-3 rounded-lg">
                  <span className="font-bold text-warning-foreground">⚠️ Причина ошибки:</span> {localizedError}<br/>
                  <span className="text-muted-foreground mt-1 block">Убедитесь, что ссылка корректна перед перезапуском.</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsFailoverModalOpen(false)}
                  className="flex-1 px-4 py-2 min-h-[44px] flex items-center justify-center border border-border bg-background rounded-lg text-sm font-medium hover:bg-muted active:scale-95 transition-all duration-200"
                >
                  Отменить
                </button>
                <button
                  onClick={handleConfirmFailover}
                  disabled={isPending || failoverPreview.routes.length === 0 || failoverPreview.currentBalance < failoverPreview.clientPaidCents}
                  className="flex-1 px-4 py-2 min-h-[44px] flex items-center justify-center bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
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
          <>Вы действительно хотите отменить заказ <strong>#{currentOrder.numericId}</strong>? При наличии остатка клиент получит возврат.</>
        ) : (
          <>Вы действительно хотите перезапустить заказ <strong>#{currentOrder.numericId}</strong>? Будет повторно списано <strong>{chargeRub.toFixed(2)} ₽</strong>.</>
        )}
      </ConfirmModal>
    </div>
  );
}
