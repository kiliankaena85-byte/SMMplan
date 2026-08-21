'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { 
  Copy, 
  Check, 
  RotateCcw, 
  XCircle, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  Layers, 
  TrendingUp, 
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
  cancelOrderAction,
  restartOrderAction,
  setOrderStatusAction,
  forceCompleteOrderAction,
} from '@/actions/admin/orders';
import { formatKopecks } from '@/utils/format-kopecks';
import { OrderModalColumn } from '@/components/admin/OrderDetailsModal';

const STATUS_CONFIG: Record<string, { label: string; cls: string; borderCls: string }> = {
  AWAITING_PAYMENT: { label: 'Ожидает оплаты', cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400', borderCls: 'border-slate-500/30' },
  PENDING:          { label: 'В очереди',       cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', borderCls: 'border-amber-500/30' },
  IN_PROGRESS:      { label: 'В работе',        cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',       borderCls: 'border-sky-500/30' },
  COMPLETED:        { label: 'Выполнен',        cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', borderCls: 'border-emerald-500/30' },
  PARTIAL:          { label: 'Частично',        cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', borderCls: 'border-orange-500/30' },
  CANCELED:         { label: 'Отменён',         cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',        borderCls: 'border-rose-500/30' },
  ERROR:            { label: 'Ошибка',          cls: 'bg-red-500/10 text-red-600 dark:text-red-400',           borderCls: 'border-red-500/30' },
  REFUNDING:        { label: 'Возврат средств', cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', borderCls: 'border-violet-500/30' },
};

export function OrderStandaloneView({
  order,
  canSeeRates = true,
}: {
  order: OrderModalColumn;
  canSeeRates?: boolean;
}) {
  const [currentOrder, setCurrentOrder] = useState<OrderModalColumn>(order);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [manualStatus, setManualStatus] = useState(order.status);
  const [isPending, startTransition] = useTransition();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'restart' | 'complete' | null>(null);

  const statusInfo = STATUS_CONFIG[currentOrder.status] || { label: currentOrder.status, cls: 'bg-muted text-muted-foreground', borderCls: 'border-border' };

  const chargeBig = BigInt(currentOrder.charge || '0');
  const costBig = BigInt(currentOrder.providerCost || '0');
  const marginBig = chargeBig - costBig;

  const chargeRub = Number(chargeBig) / 100;
  const costRub = Number(costBig) / 100;
  const marginRub = Number(marginBig) / 100;
  const marginPercent = chargeRub > 0 ? Math.round((marginRub / chargeRub) * 100) : 0;

  const handleCopy = (text: string, isLink: boolean) => {
    navigator.clipboard.writeText(text);
    if (isLink) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
    toast.success('Скопировано в буфер');
  };

  const handleManualStatusChange = () => {
    if (manualStatus === currentOrder.status) return;
    startTransition(async () => {
      try {
        const res = await setOrderStatusAction(currentOrder.id, manualStatus as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'CANCELED' | 'ERROR');
        if (res.success) {
          toast.success(`Статус заказа #${currentOrder.numericId} изменен на ${STATUS_CONFIG[manualStatus]?.label || manualStatus}`);
          setCurrentOrder(prev => ({ ...prev, status: manualStatus }));
        } else {
          toast.error(res.error || 'Ошибка смены статуса');
        }
      } catch (e) {
        toast.error((e as Error).message || 'Ошибка');
      }
    });
  };

  const executeConfirm = () => {
    setConfirmOpen(false);
    const fd = new FormData();
    fd.append('orderId', currentOrder.id);

    if (confirmAction === 'cancel') {
      startTransition(async () => {
        try {
          const r = await cancelOrderAction(fd);
          if (r.success) {
            toast.success(`Заказ #${currentOrder.numericId} отменен и произведен возврат`);
            setCurrentOrder(prev => ({ ...prev, status: 'CANCELED' }));
          } else {
            toast.error(r.error || 'Ошибка отмены заказа');
          }
        } catch (e) {
          toast.error((e as Error).message || 'Ошибка отмены');
        }
      });
    } else if (confirmAction === 'restart') {
      startTransition(async () => {
        try {
          const r = await restartOrderAction(fd);
          if (r.success) {
            toast.success(`Заказ #${currentOrder.numericId} перезапущен`);
            setCurrentOrder(prev => ({ ...prev, status: 'IN_PROGRESS' }));
          } else {
            toast.error(r.error || 'Ошибка перезапуска');
          }
        } catch (e) {
          toast.error((e as Error).message || 'Ошибка перезапуска');
        }
      });
    } else if (confirmAction === 'complete') {
      startTransition(async () => {
        try {
          const r = await forceCompleteOrderAction(currentOrder.id);
          if (r.success) {
            toast.success(`Заказ #${currentOrder.numericId} принудительно выполнен`);
            setCurrentOrder(prev => ({ ...prev, status: 'COMPLETED' }));
          } else {
            toast.error(r.error || 'Ошибка завершения');
          }
        } catch (e) {
          toast.error((e as Error).message || 'Ошибка');
        }
      });
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Main Banner Card */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-mono font-black text-base shrink-0">
            #{currentOrder.numericId}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                Заказ #{currentOrder.numericId}
              </h2>
              <button
                onClick={() => handleCopy(String(currentOrder.numericId), false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Скопировать номер заказа"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold border ${statusInfo.cls} ${statusInfo.borderCls}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground mt-1">
              {currentOrder.service?.category.network?.name ? `${currentOrder.service.category.network.name} · ` : ''}
              {currentOrder.service?.category.name} → <span className="text-foreground font-bold">{currentOrder.service?.name}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setConfirmAction('restart');
              setConfirmOpen(true);
            }}
            disabled={isPending || ['COMPLETED', 'CANCELED'].includes(currentOrder.status)}
            className="px-3.5 py-2 rounded-xl bg-muted/80 hover:bg-muted text-foreground font-bold text-xs transition-all border border-border/60 shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Перезапустить</span>
          </button>
          <button
            onClick={() => {
              setConfirmAction('complete');
              setConfirmOpen(true);
            }}
            disabled={isPending || currentOrder.status === 'COMPLETED'}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Завершить</span>
          </button>
          <button
            onClick={() => {
              setConfirmAction('cancel');
              setConfirmOpen(true);
            }}
            disabled={isPending || currentOrder.status === 'CANCELED'}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Отменить и вернуть</span>
          </button>
        </div>
      </div>

      {/* 3-Column Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CARD 1: Client & Target Link */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2.5">
            <User className="w-4 h-4 text-primary" />
            <span>Клиент & Ссылка</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground block">Email клиента</span>
              <span className="font-mono font-bold text-foreground">{currentOrder.user?.email || 'Гость / Аноним'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground block">Целевая ссылка</span>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={currentOrder.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-primary hover:underline break-all truncate font-semibold"
                  title={currentOrder.link}
                >
                  {currentOrder.link || '—'}
                </a>
                {currentOrder.link && (
                  <button
                    onClick={() => handleCopy(currentOrder.link!, true)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                    title="Скопировать ссылку"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground block">Количество</span>
                <span className="font-extrabold text-sm text-foreground tabular-nums">{currentOrder.quantity?.toLocaleString() ?? 0} шт</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground block">Остаток</span>
                <span className="font-extrabold text-sm text-foreground tabular-nums">{currentOrder.remains?.toLocaleString() ?? 0} шт</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Execution & Provider */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2.5">
            <Layers className="w-4 h-4 text-primary" />
            <span>Исполнение</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground block">Провайдер</span>
                <span className="font-bold text-foreground">{currentOrder.providerName || 'Прямой запуск'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground block">ID Провайдера</span>
                <span className="font-mono text-xs text-muted-foreground font-semibold">{currentOrder.externalId || '—'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground block">Ручная смена статуса</span>
              <div className="flex items-center gap-2">
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                  className="flex-1 h-8.5 px-2.5 text-xs rounded-xl border border-border bg-background text-foreground font-semibold outline-none"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleManualStatusChange}
                  disabled={isPending || manualStatus === currentOrder.status}
                  className="px-3 h-8.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs disabled:opacity-40 hover:bg-primary/90 transition-all cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Создан:</span>
              <span className="font-mono font-medium">{new Date(currentOrder.createdAt).toLocaleString('ru-RU')}</span>
            </div>
          </div>
        </div>

        {/* CARD 3: Unit Economics */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Юнит-Экономика</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Сумма заказа</span>
              <span className="font-black text-base text-foreground tabular-nums">{formatKopecks(currentOrder.charge)}</span>
            </div>

            {canSeeRates && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Себестоимость</span>
                  <span className="font-bold text-xs text-muted-foreground tabular-nums">{costRub.toFixed(2)} ₽</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Чистая маржа</span>
                  <span className={`font-black text-sm tabular-nums ${marginRub >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {marginRub >= 0 ? `+${marginRub.toFixed(2)} ₽` : `${marginRub.toFixed(2)} ₽`} ({marginPercent}%)
                  </span>
                </div>
              </>
            )}

            {currentOrder.error && (
              <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-mono break-all">{currentOrder.error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Single Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
        onConfirm={executeConfirm}
        title={
          confirmAction === 'cancel'
            ? `Отменить заказ #${currentOrder.numericId}?`
            : confirmAction === 'restart'
            ? `Перезапустить заказ #${currentOrder.numericId}?`
            : `Принудительно завершить заказ #${currentOrder.numericId}?`
        }
        confirmText={confirmAction === 'cancel' ? 'Отменить заказ' : 'Подтвердить'}
        isDanger={confirmAction === 'cancel'}
      >
        <p className="text-xs text-muted-foreground">
          {confirmAction === 'cancel'
            ? `Средства (${chargeRub.toFixed(2)} ₽) будут автоматически возвращены на баланс клиента.`
            : confirmAction === 'restart'
            ? `Заказ будет повторно отправлен текущему провайдеру с новыми параметрами.`
            : `Статус заказа будет переведен в "Выполнен".`}
        </p>
      </ConfirmModal>
    </div>
  );
}