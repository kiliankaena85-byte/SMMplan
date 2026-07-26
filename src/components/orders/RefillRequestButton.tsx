'use client';

import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface RefillRequestButtonProps {
  orderId: string;
  isRefillEnabled?: boolean;
  orderStatus: string;
  refills?: Array<{
    id: string;
    status: string;
    createdAt: Date | string;
  }>;
  className?: string;
}

export function RefillRequestButton({
  orderId,
  isRefillEnabled = false,
  orderStatus,
  refills,
  className,
}: RefillRequestButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const initialStatus = refills && refills.length > 0 ? refills[0].status : null;
  const [refillStatus, setRefillStatus] = useState<string | null>(initialStatus);

  if (!isRefillEnabled) {
    return null;
  }

  // Refill is strictly only allowed for COMPLETED or PARTIAL orders
  if (orderStatus !== 'COMPLETED' && orderStatus !== 'PARTIAL') {
    return null;
  }

  if (refillStatus === 'PENDING' || refillStatus === 'IN_PROGRESS') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg whitespace-nowrap',
          className
        )}
        title="Заявка на докрутку принята и находится в обработке"
      >
        <RefreshCw className="w-3 h-3 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
        🔄 Докрутка: В процессе
      </span>
    );
  }

  if (refillStatus === 'COMPLETED') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg whitespace-nowrap',
          className
        )}
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        Докрутка выполнена
      </span>
    );
  }

  const handleRequestRefill = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPending) return;

    try {
      setIsPending(true);
      const { requestClientRefillAction } = await import('@/actions/order/refill');
      const res = await requestClientRefillAction(orderId);

      if (res.success) {
        toast.success(res.message || 'Заявка на докрутку принята!');
        setRefillStatus('PENDING');
        router.refresh();
      } else {
        if (res.refill) {
          setRefillStatus(res.refill.status);
        }
        toast.error(res.error || 'Не удалось отправить заявку на докрутку');
      }
    } catch {
      toast.error('Ошибка сети. Попробуйте снова через несколько минут.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleRequestRefill}
      className={cn(
        'h-7 px-2.5 text-[10px] font-bold rounded-lg transition-all inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 active:scale-95 disabled:opacity-50 whitespace-nowrap cursor-pointer',
        className
      )}
      title="Запросить бесплатную повторную докрутку (Refill)"
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
      ) : (
        <RefreshCw className="w-3 h-3 shrink-0" />
      )}
      🔄 Запросить докрутку
    </button>
  );
}

