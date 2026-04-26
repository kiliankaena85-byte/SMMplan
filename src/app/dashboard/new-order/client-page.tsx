'use client';

import { SmartOrderForm } from '@/components/orders/SmartOrderForm';

export default function NewOrderPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Новый заказ</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Вставьте ссылку — мы автоматически определим платформу и подберём тарифы
        </p>
      </div>
      <SmartOrderForm />
    </div>
  );
}
