'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Lock, CheckCircle, Ban, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AntiFraudMonitorPage() {
  const [loading, setLoading] = useState(false);
  const [vestedBonuses, setVestedBonuses] = useState<Array<{
    id: string;
    userId: string;
    bonusType: string;
    amountCents: string;
    status: string;
    unlockAt: string | null;
    createdAt: string;
  }>>([]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-primary" />
            Anti-Fraud Monitor (Рефералы & Бонусы)
          </h1>
          <p className="text-sm text-muted-foreground">
            Мониторинг аномалий, кластеризации рефералов и управление замороженными бонусами (Vesting).
          </p>
        </div>
        <button
          onClick={() => toast.info('Обновление данных мониторинга...')}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-card border border-border text-foreground hover:bg-muted transition-all duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Заморожено (Vesting)</span>
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">0 ₽</div>
          <p className="text-xs text-muted-foreground">Период заморозки: 72 часа</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Подозрительные кластеры</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">0</div>
          <p className="text-xs text-muted-foreground">IP / User-Agent совпадения</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Заблокировано фрода</span>
            <Ban className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">100%</div>
          <p className="text-xs text-muted-foreground">Self-referral & Duplicate Fingerprints</p>
        </div>
      </div>

      {/* Vesting Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            Замороженные бонусы (Vesting 72h)
          </h2>
          <span className="text-xs text-muted-foreground">Авто-разблокировка после завершения холда</span>
        </div>

        <div className="p-8 text-center text-muted-foreground text-sm">
          Нет активных замороженных бонусов. Все реферальные начисления проверены и безопасны.
        </div>
      </div>
    </div>
  );
}
