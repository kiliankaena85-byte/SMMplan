'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { processReferralPayout } from '@/actions/admin/marketing';
import { useTransition } from 'react';
import { toast } from 'sonner';

interface PayoutButtonProps {
  userId: string;
  amount: number;
}

export function PayoutButton({ userId, amount }: PayoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handlePayout = () => {
    if (!confirm(`Выплатить ${(amount / 100).toFixed(2)} ₽ на баланс клиента?`)) return;

    startTransition(async () => {
      const res = await processReferralPayout(userId, amount);
      if (res.success) {
        toast.success('Выплата произведена успешно');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Button
      size="sm"
      intent="secondary"
      onClick={handlePayout}
      disabled={isPending}
      className="h-8 text-[10px] font-bold uppercase tracking-wider"
    >
      {isPending ? 'Загрузка...' : 'На баланс'}
    </Button>
  );
}
