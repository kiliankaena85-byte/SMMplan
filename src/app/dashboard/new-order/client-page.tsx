'use client';

import { UniversalOrderForm } from '@/components/orders/UniversalOrderForm';

export default function NewOrderPage({ 
  userEmail, 
  userBalanceCents = 0,
  initialReorderData
}: { 
  userEmail?: string; 
  userBalanceCents?: number;
  initialReorderData?: { serviceId: string; categoryId: string; link: string; quantity: number } | null;
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground text-balance">Новый заказ</h1>
        <p className="text-muted-foreground text-sm mt-1 text-pretty">
          Вставьте ссылку (или сразу несколько) — мы автоматически определим платформу и подберём тарифы
        </p>
      </div>

      <div className="mt-6">
        <UniversalOrderForm userBalanceCents={userBalanceCents} userEmail={userEmail} initialReorderData={initialReorderData} />
      </div>
    </div>
  );
}
