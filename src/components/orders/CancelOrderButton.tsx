'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cancelOrderCoolingOffAction } from '@/actions/order/cancel';
import { Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface CancelOrderButtonProps {
  orderId: string;
  createdAt: Date;
  status: string;
}

export function CancelOrderButton({ orderId, createdAt, status }: CancelOrderButtonProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    if (status !== 'PENDING') return;

    // 3 minutes (180 seconds) from createdAt
    const deadline = new Date(createdAt).getTime() + 3 * 60 * 1000;
    
    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
      setTimeLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [createdAt, status]);

  if (status !== 'PENDING' || timeLeft <= 0) return null;

  async function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm('Вы уверены, что хотите отменить этот заказ? Средства будут возвращены на ваш баланс.')) {
      setIsCanceling(true);
      const res = await cancelOrderCoolingOffAction(orderId);
      if (res.success) {
        toast.success('Заказ успешно отменен. Деньги на балансе!');
        router.refresh();
      } else {
        toast.error(res.error || 'Ошибка при отмене');
      }
      setIsCanceling(false);
    }
  }

  // MM:SS formatting
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const timeString = `${m}:${s.toString().padStart(2, '0')}`;

  return (
    <Button 
      intent="destructive" 
      size="sm" 
      onClick={handleCancel}
      disabled={isCanceling}
      className="mt-2 text-xs h-8 px-2 w-full font-semibold shadow-sm sm:w-auto"
    >
      {isCanceling ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <XCircle className="w-3 h-3 mr-1.5" />}
      Отменить ({timeString})
    </Button>
  );
}
