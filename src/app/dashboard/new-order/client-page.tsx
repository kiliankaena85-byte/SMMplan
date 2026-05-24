'use client';

import { useState } from 'react';
import { SmartOrderForm } from '@/components/orders/SmartOrderForm';
import { MassOrderForm } from '@/components/orders/MassOrderForm';
import { Link2, LayoutList } from 'lucide-react';

export default function NewOrderPage({ userEmail, userBalanceCents = 0 }: { userEmail?: string; userBalanceCents?: number }) {
  const [tab, setTab] = useState<'single' | 'mass'>('single');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Новый заказ</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Вставьте ссылку — мы автоматически определим платформу и подберём тарифы
        </p>
      </div>

      <div className="flex w-full sm:w-max gap-1 p-1 bg-muted/50 rounded-xl border border-border/50">
        <button
          onClick={() => setTab('single')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            tab === 'single' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">Одиночный заказ</span>
        </button>
        <button
          onClick={() => setTab('mass')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            tab === 'mass' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <LayoutList className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">Массовый заказ</span>
        </button>
      </div>

      <div className="mt-6">
        {tab === 'single' ? <SmartOrderForm userBalanceCents={userBalanceCents} userEmail={userEmail} /> : <MassOrderForm userEmail={userEmail} />}
      </div>
    </div>
  );
}
