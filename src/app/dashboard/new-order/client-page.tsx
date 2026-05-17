'use client';

import { useState } from 'react';
import { SmartOrderForm } from '@/components/orders/SmartOrderForm';
import { MassOrderForm } from '@/components/orders/MassOrderForm';
import { Link2, LayoutList } from 'lucide-react';

export default function NewOrderPage() {
  const [tab, setTab] = useState<'single' | 'mass'>('single');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Новый заказ</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Вставьте ссылку — мы автоматически определим платформу и подберём тарифы
        </p>
      </div>

      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl w-max border border-border/50">
        <button
          onClick={() => setTab('single')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'single' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Link2 className="w-4 h-4" />
          Одиночный заказ
        </button>
        <button
          onClick={() => setTab('mass')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'mass' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <LayoutList className="w-4 h-4" />
          Массовый заказ
        </button>
      </div>

      <div className="mt-6">
        {tab === 'single' ? <SmartOrderForm /> : <MassOrderForm />}
      </div>
    </div>
  );
}
