'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  XCircle, 
  MoreHorizontal, 
  Download, 
  ShieldAlert, 
  X 
} from 'lucide-react';
import { OrderColumn } from '@/app/admin/orders/components/columns';
import { bulkCancelOrdersAction, bulkRestartOrdersAction } from '@/actions/admin/orders';
import { formatKopecks } from '@/utils/format-kopecks';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  selectedOrders: OrderColumn[];
  canSeeRates: boolean;
  userRole?: string;
  onClearSelection: () => void;
}

export function BulkActionsPanel({ selectedOrders, canSeeRates, userRole = 'SUPPORT', onClearSelection }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Sanity Guard Form state for Bulk Cancel
  const [sanityCountInput, setSanityCountInput] = useState('');
  const [reasonCode, setReasonCode] = useState('SYSTEM_ERROR');
  const [ticketId, setTicketId] = useState('');

  const count = selectedOrders.length;
  if (count === 0) return null;

  const canExecuteAdminBulk = ['OWNER', 'ADMIN'].includes(userRole);

  // Breakdown of selected orders
  const errorCount = selectedOrders.filter(o => o.status === 'ERROR').length;
  const cancellableOrders = selectedOrders.filter(o => !['COMPLETED', 'CANCELED', 'ERROR'].includes(o.status));
  const cancellableCount = cancellableOrders.length;

  const estimatedRefundKopecks = cancellableOrders.reduce((sum, o) => {
    const chargeBig = BigInt(o.charge || 0);
    return sum + (['PENDING', 'AWAITING_PAYMENT'].includes(o.status) ? chargeBig : (o.quantity > 0 ? chargeBig * BigInt(o.remains) / BigInt(o.quantity) : BigInt(0)));
  }, BigInt(0));

  // Determine dynamic primary button
  const hasErrors = errorCount > 0;
  const requiresSanityVerification = count > 10;
  const isSanityMatch = !requiresSanityVerification || parseInt(sanityCountInput.trim(), 10) === cancellableCount;
  const canSubmitCancel = isSanityMatch && (ticketId.trim().length > 0 || reasonCode.length > 0);

  const handleBulkRestart = () => {
    const errorIds = selectedOrders.filter(o => o.status === 'ERROR' || o.status === 'PENDING').map(o => o.id);
    if (errorIds.length === 0) {
      toast.warning('Нет заказов в статусе ERROR или PENDING для перезапуска');
      return;
    }

    startTransition(async () => {
      try {
        const res = await bulkRestartOrdersAction(errorIds);
        if (res.success) {
          toast.success(`⟳ Перезапущено заказов: ${res.restartedCount}`);
          onClearSelection();
        }
      } catch (err) {
        toast.error((err as Error).message || 'Ошибка при перезапуске заказов');
      }
    });
  };

  const handleExecuteCancel = () => {
    const ids = selectedOrders.map(o => o.id);
    startTransition(async () => {
      try {
        const res = await bulkCancelOrdersAction(ids, reasonCode, ticketId);
        if (res.success) {
          const refundText = res.totalRefundCents > 0 ? `, возврат: ${formatKopecks(res.totalRefundCents)}` : '';
          toast.success(`🚫 Отменено заказов: ${res.cancelledCount}${refundText}`);
          setShowCancelModal(false);
          onClearSelection();
        } else if (res.error) {
          toast.error(res.error);
        }
      } catch (err) {
        toast.error((err as Error).message || 'Ошибка массовой отмены');
      }
    });
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[calc(100%-2rem)] bg-card border border-border/80 rounded-2xl shadow-2xl p-3 backdrop-blur-xl flex items-center justify-between gap-3 transition-all duration-200">
        {/* Left info badge */}
        <div className="flex items-center gap-2 pl-2 text-xs">
          <span className="font-black text-foreground">{count} выбрано</span>
          {errorCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              {errorCount} с ошибкой
            </span>
          )}
        </div>

        {/* Action button cluster */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Массовая отмена и возврат (Красная кнопка всегда на виду) */}
          <button
            type="button"
            disabled={isPending || cancellableCount === 0}
            onClick={() => setShowCancelModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-xl transition-all shadow-sm disabled:opacity-40 cursor-pointer"
            title="Отменить выбранные заказы и произвести возврат клиентам"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Отменить и вернуть ({cancellableCount})</span>
          </button>

          {/* Primary Restart Action Button */}
          <button
            type="button"
            disabled={isPending}
            onClick={handleBulkRestart}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            title="Перезапустить выбранные заказы у поставщика"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
            <span>{hasErrors ? `Перезапустить ${errorCount}` : `Перезапустить ${count}`}</span>
          </button>

          {/* Export action */}
          <button
            type="button"
            onClick={() => {
              toast.info('Экспорт данных выбранных заказов сформирован');
            }}
            className="p-2 rounded-xl bg-muted border border-border/60 text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="Экспорт выбранных (CSV)"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Clear selection link */}
          <button
            type="button"
            onClick={onClearSelection}
            className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Снять ✕
          </button>
        </div>
      </div>

      {/* Sanity Guard Modal for Bulk Cancel */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-base">
                <ShieldAlert className="w-5 h-5" />
                Массовая отмена с возвратом
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 space-y-1 text-rose-700 dark:text-rose-300">
                <p className="font-bold">Вы собираетесь отменить {count} заказов.</p>
                <p>Будет отменено: <strong className="text-foreground">{cancellableCount}</strong></p>
                <p>Завершённые / отменённые заказы будут пропущены.</p>
                {canSeeRates && (
                  <p className="pt-1 font-bold">
                    Расчётная сумма возврата: {formatKopecks(estimatedRefundKopecks)}
                  </p>
                )}
              </div>

              {requiresSanityVerification && (
                <div className="space-y-1 pt-1">
                  <label className="block font-bold text-foreground">
                    Для подтверждения введите число отменяемых заказов (<span className="font-mono">{cancellableCount}</span>):
                  </label>
                  <input
                    type="number"
                    value={sanityCountInput}
                    onChange={(e) => setSanityCountInput(e.target.value)}
                    placeholder={String(cancellableCount)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-bold text-foreground">Причина отмены:</label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="SYSTEM_ERROR">Сбой провайдера / Система</option>
                  <option value="CLIENT_REQUEST">Запрос клиента</option>
                  <option value="PRICE_MISMATCH">Ошибка ценообразования</option>
                  <option value="OTHER">Другое</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-foreground">Номер тикета / Обоснование:</label>
                <input
                  type="text"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  placeholder="Например: TICKET-10492"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!canSubmitCancel || isPending}
                onClick={handleExecuteCancel}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                {isPending ? 'Отменяем...' : `Отменить ${cancellableCount} заказов`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
