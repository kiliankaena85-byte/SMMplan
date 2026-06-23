'use client';

import { UniversalOrderForm } from '@/components/orders/UniversalOrderForm';

export default function NewOrderPage({ userEmail, userBalanceCents = 0 }: { userEmail?: string; userBalanceCents?: number }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Новый заказ</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Вставьте ссылку (или сразу несколько) — мы автоматически определим платформу и подберём тарифы
        </p>
      </div>

      <div className="mt-6">
        <UniversalOrderForm userBalanceCents={userBalanceCents} userEmail={userEmail} />
      </div>
    </div>
  );
}
