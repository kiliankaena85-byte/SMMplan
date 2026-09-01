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
  ShieldAlert,
  Zap,
  Globe,
  Clock,
  ArrowRight
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
import { classifyOrderError } from '@/lib/order-error-classifier';

const STATUS_CONFIG: Record<string, { label: string; cls: string; borderCls: string }> = {
  AWAITING_PAYMENT: { label: 'Ожидает оплаты', cls: 'bg-muted text-muted-foreground', borderCls: 'border-border' },
  PENDING:          { label: 'В очереди',       cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', borderCls: 'border-amber-500/30' },
  PENDING_CHECK:    { label: 'Проверка ссылки', cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-300', borderCls: 'border-sky-500/30' },
  IN_PROGRESS:      { label: 'В работе',        cls: 'bg-primary/10 text-primary',       borderCls: 'border-primary/30' },
  COMPLETED:        { label: 'Выполнен',        cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', borderCls: 'border-emerald-500/30' },
  PARTIAL:          { label: 'Частично',        cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-300', borderCls: 'border-orange-500/30' },
  CANCELED:         { label: 'Отменён',         cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',        borderCls: 'border-rose-500/30' },
  ERROR:            { label: 'Ошибка',          cls: 'bg-red-500/10 text-red-700 dark:text-red-300',           borderCls: 'border-red-500/30' },
  REFUNDING:        { label: 'Возврат средств', cls: 'bg-purple-500/10 text-purple-700 dark:text-purple-300', borderCls: 'border-purple-500/30' },
};

export function OrderStandaloneView({
  order,
  canSeeRates = true,
  userRole = 'SUPPORT',
}: {
  order: OrderModalColumn;
  canSeeRates?: boolean;
  userRole?: string;
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
  const quantity = currentOrder.quantity ?? 0;
  const pricePerUnitRub = quantity > 0 ? chargeRub / quantity : 0;

  const classified = classifyOrderError(currentOrder.error);

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
          const res = await cancelOrderAction(fd);
          if (res.success) {
            toast.success(`Заказ #${currentOrder.numericId} отменён, средства возвращены`);
            setCurrentOrder(prev => ({ ...prev, status: 'CANCELED', remains: 0 }));
          } else {
            toast.error(res.error || 'Ошибка отмены');
          }
        } catch (e) {
          toast.error((e as Error).message || 'Ошибка');
        }
      });
    } else if (confirmAction === 'restart') {
      startTransition(async () => {
        try {
          const res = await restartOrderAction(fd);
          if (res.success) {
            toast.success(`Заказ #${currentOrder.numericId} отправлен на перезапуск`);
            setCurrentOrder(prev => ({ ...prev, status: 'PENDING', error: null }));
          } else {
            toast.error(res.error || 'Ошибка перезапуска');
          }
        } catch (e) {
          toast.error((e as Error).message || 'Ошибка');
        }
      });
    } else if (confirmAction === 'complete') {
      startTransition(async () => {
        try {
          const res = await forceCompleteOrderAction(currentOrder.id);
          if (res.success) {
            toast.success(`Заказ #${currentOrder.numericId} завершён`);
            setCurrentOrder(prev => ({ ...prev, status: 'COMPLETED', remains: 0 }));
          } else {
            toast.error(res.error || 'Ошибка завершения');
          }
        } catch (e) {
          toast.error((e as Error).message || 'Ошибка');
        }
      });
    }
  };

  return (
    <div className="w-full space-y-5 pb-16">
      {/* ── 1. ГЛАВНАЯ ШАПКА ЗАКАЗА (Номер, Услуга, Статус и Действия) ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-mono font-black text-base shrink-0">
            #{currentOrder.numericId}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-foreground tracking-tight">
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
            <p className="text-xs font-semibold text-muted-foreground mt-1 truncate">
              {currentOrder.service?.category.network?.name ? `${currentOrder.service.category.network.name} · ` : ''}
              {currentOrder.service?.category.name} → <span className="text-foreground font-bold">{currentOrder.service?.name}</span>
            </p>
          </div>
        </div>

        {/* Быстрые действия оператора */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
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
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Завершить</span>
          </button>
          {(() => {
            const isPendingState = ['PENDING', 'PENDING_CHECK', 'AWAITING_PAYMENT'].includes(currentOrder.status);
            const isCancelAllowed = userRole !== 'SUPPORT' || isPendingState || currentOrder.service?.isCancelEnabled === true;
            const canCancel = isCancelAllowed && !['COMPLETED', 'CANCELED'].includes(currentOrder.status);

            if (!canCancel) return null;
            return (
              <button
                onClick={() => {
                  setConfirmAction('cancel');
                  setConfirmOpen(true);
                }}
                disabled={isPending}
                className="px-3.5 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40 font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Отменить и вернуть</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* ── 2. БАННЕР ВНИМАНИЯ: ОШИБКА / ЗАЩИТА ОТ УБЫТКА (Сверху, в фокусе) ── */}
      {currentOrder.error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              <ShieldAlert className="w-4.5 h-4.5" />
              <span>
                {currentOrder.error.includes('PRICE_DRIFT_HOLD') 
                  ? 'Защита от убытка платформы (Отрицательная маржа)' 
                  : 'Ответ / Ошибка провайдера'}
              </span>
            </div>
            {classified && (
              <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${classified.badgeBg} ${classified.badgeText} ${classified.badgeBorder}`}>
                {classified.code}
              </span>
            )}
          </div>

          <div className="text-sm font-bold text-rose-700 dark:text-rose-300">
            {classified ? classified.titleRu : currentOrder.error}
          </div>

          {classified && (
            <div className="text-xs text-foreground/90 leading-relaxed bg-card/70 p-3 rounded-xl border border-border/50 space-y-1.5">
              <p>{classified.descriptionRu}</p>
              <div className="pt-2 border-t border-border/40 text-[11px] text-primary font-medium flex items-center gap-1.5">
                <span>💡 <strong>Что делать оператору:</strong> {classified.recommendedAction}</span>
              </div>
            </div>
          )}

          <div className="text-[10px] text-muted-foreground font-mono break-all pt-0.5">
            Сырой код ответа: {currentOrder.error}
          </div>
        </div>
      )}

      {/* ── 3. ЦЕНТРАЛИЗОВАННАЯ КАРТОЧКА: ДЕТАЛИ ЗАКАЗА & ЮНИТ-ЭКОНОМИКА (Сверху вниз) ── */}
      <div className="bg-card border border-border/80 rounded-2xl divide-y divide-border/60 shadow-xs overflow-hidden">
        
        {/* Секция 1: Клиент и Ссылка */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <User className="w-4 h-4 text-primary" />
            <span>1. Клиент и Целевая ссылка</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground block">Email клиента</span>
              <span className="font-mono font-bold text-foreground mt-0.5 block break-all">
                {currentOrder.user?.email || 'Гость / Аноним'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground block">Целевая ссылка</span>
              <div className="flex items-center gap-2 mt-0.5">
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
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    title="Скопировать ссылку"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Количество</span>
              <span className="font-extrabold text-sm text-foreground tabular-nums">{quantity.toLocaleString('ru-RU')} шт</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Остаток</span>
              <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400 tabular-nums">{(currentOrder.remains ?? 0).toLocaleString('ru-RU')} шт</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Создан</span>
              <span className="font-mono text-xs text-foreground font-medium">{new Date(currentOrder.createdAt).toLocaleDateString('ru-RU')} {new Date(currentOrder.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Обновлен</span>
              <span className="font-mono text-xs text-foreground font-medium">{new Date(currentOrder.updatedAt || currentOrder.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Секция 2: Финансы & Юнит-экономика */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>2. Финансы и Расчет маржи</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Оплата клиента</span>
              <div className="text-base font-black text-foreground tabular-nums">
                {chargeRub.toFixed(2)} ₽
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {pricePerUnitRub.toFixed(4)} ₽ / шт
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Себестоимость провайдера</span>
              <div className="text-base font-black text-foreground tabular-nums">
                {costRub.toFixed(2)} ₽
              </div>
              <div className="text-[10px] text-muted-foreground">
                Закупочная цена
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border space-y-1 ${
              marginRub >= 0 
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Чистая маржа</span>
              <div className="text-base font-black tabular-nums">
                {marginRub >= 0 ? `+${marginRub.toFixed(2)} ₽` : `${marginRub.toFixed(2)} ₽`}
              </div>
              <div className="text-[10px] font-bold">
                {marginRub >= 0 ? `Рентабельность +${marginPercent}%` : `Убыток ${marginPercent}%`}
              </div>
            </div>
          </div>
        </div>

        {/* Секция 3: Исполнение и Управление провайдером */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <Layers className="w-4 h-4 text-sky-500" />
            <span>3. Исполнение и Провайдер</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Провайдер</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block">{currentOrder.providerName || 'Прямой запуск'}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">ID у провайдера</span>
                <span className="font-mono text-xs font-bold text-muted-foreground mt-0.5 block">{currentOrder.externalId ? `#${currentOrder.externalId}` : '—'}</span>
              </div>
            </div>

            {/* Ручная смена статуса */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Сменить статус вручную</span>
                <span className="text-[11px] text-muted-foreground truncate block">Для оператора поддержки</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                  className="h-8 px-2 text-xs rounded-lg border border-border bg-card text-foreground font-semibold outline-none cursor-pointer"
                >
                  <option value="PENDING">⏳ В очереди</option>
                  <option value="PENDING_CHECK">🔍 Проверка ссылки</option>
                  <option value="IN_PROGRESS">⚡ В работе</option>
                  <option value="COMPLETED">🟢 Выполнен</option>
                  <option value="PARTIAL">🟠 Частично</option>
                  <option value="CANCELED">❌ Отменён</option>
                  <option value="ERROR">🔴 Ошибка</option>
                  <option value="AWAITING_PAYMENT">⚪ Ожидает оплаты</option>
                </select>
                <button
                  onClick={handleManualStatusChange}
                  disabled={isPending || manualStatus === currentOrder.status}
                  className="px-3 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-xs disabled:opacity-40 hover:bg-primary/90 transition-all cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
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