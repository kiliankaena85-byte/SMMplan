import re

with open('src/components/admin/order-details/OrderBottomActions.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the entire component with the smarter logic
new_content = """'use client';

import * as React from 'react';
import { RefreshCw, Zap, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderModalColumn } from './types';

interface OrderBottomActionsProps {
  order: OrderModalColumn;
  userRole: string;
  isPending: boolean;
  isFailoverOpen: boolean;
  onSyncStatus: () => void;
  onToggleFailover: () => void;
  onTriggerConfirm: (action: 'cancel' | 'restart' | 'force_complete') => void;
}

export function OrderBottomActions({
  order,
  userRole,
  isPending,
  isFailoverOpen,
  onSyncStatus,
  onToggleFailover,
  onTriggerConfirm,
}: OrderBottomActionsProps) {
  const isPendingState = ['PENDING', 'PENDING_CHECK', 'AWAITING_PAYMENT'].includes(order.status);
  
  const isCancelAllowed = userRole !== 'SUPPORT' || isPendingState || order.service?.isCancelEnabled === true;
  
  const isFinished = ['COMPLETED', 'CANCELED', 'REFUNDING'].includes(order.status);
  
  const isMissingExternalId = Boolean(order.providerName) && !order.externalId;

  // 1. Sync
  // Имеет смысл только если заказ в процессе работы у провайдера и у нас есть его ID.
  const showSync = Boolean(order.externalId) && ['PENDING_CHECK', 'IN_PROGRESS', 'PARTIAL'].includes(order.status);

  // 2. Failover (Сменить провайдера)
  // Имеет смысл, если заказ завис или выпал в ошибку. Завершенные/отмененные заказы нельзя перенаправлять (они уже закрыты).
  const showFailover = ['ERROR', 'PARTIAL', 'PENDING', 'PENDING_CHECK', 'IN_PROGRESS'].includes(order.status);

  // 3. Restart (Перезапустить)
  // Разрешаем только для проблемных заказов. Перезапуск отмененного заказа заново спишет средства.
  const showRestart = ['ERROR', 'CANCELED', 'PENDING_CHECK'].includes(order.status);

  // 4. Force Complete (Завершить)
  // Разрешаем только для активных/зависших заказов. Отмененный или уже завершенный заказ нельзя "завершить".
  // Скрываем, если нет externalId (так как завершение требует ID провайдера для синхронизации остатков).
  const showComplete = !isFinished && !isMissingExternalId && ['ERROR', 'PARTIAL', 'PENDING_CHECK', 'IN_PROGRESS'].includes(order.status);

  // 5. Cancel (Отменить и вернуть)
  const showCancel = !isFinished && isCancelAllowed;

  // Если нет ни одной доступной кнопки (например, для CANCELED заказа без прав на рестарт), можно скрыть подвал.
  if (!showSync && !showFailover && !showRestart && !showComplete && !showCancel) {
    return null;
  }

  return (
    <div className="px-6 py-4 border-t border-border/70 bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        <span className="font-semibold text-foreground">Действия с заказом #{order.numericId}:</span>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
        {showSync && (
          <button
            type="button"
            onClick={onSyncStatus}
            disabled={isPending}
            className="px-3.5 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Синхронизировать статус с провайдером"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isPending && "animate-spin")} />
            <span>Обновить</span>
          </button>
        )}

        {showFailover && (
          <button
            type="button"
            onClick={onToggleFailover}
            disabled={isPending}
            className="px-3.5 py-2 rounded-xl border border-warning/30 bg-warning/10 hover:bg-warning/20 text-warning font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Передать заказ резервному провайдеру (Alt+M)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isFailoverOpen ? 'Отмена' : 'Сменить провайдера'}</span>
          </button>
        )}

        {showRestart && (
          <button
            type="button"
            onClick={() => onTriggerConfirm('restart')}
            disabled={isPending}
            className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted font-bold text-xs text-foreground transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Отправить заказ провайдеру заново (Alt+R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Перезапустить</span>
          </button>
        )}

        {showComplete && (
          <button
            type="button"
            onClick={() => onTriggerConfirm('force_complete')}
            disabled={isPending}
            title="Отметить заказ как выполненный"
            className="px-3.5 py-2 rounded-xl border border-success/30 bg-success/10 hover:bg-success/20 text-success font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Завершить</span>
          </button>
        )}

        {showCancel && (
          <button
            type="button"
            onClick={() => onTriggerConfirm('cancel')}
            disabled={isPending}
            className="px-3.5 py-2 rounded-xl bg-destructive hover:bg-destructive/90 disabled:opacity-40 text-destructive-foreground font-bold text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Отменить заказ и вернуть средства на баланс (Alt+C)"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Отменить и вернуть</span>
          </button>
        )}
      </div>
    </div>
  );
}
"""

with open('src/components/admin/order-details/OrderBottomActions.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Updated OrderBottomActions")
