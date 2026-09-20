import React from 'react';
import { Calendar, CreditCard, TrendingUp, Star } from 'lucide-react';
import { formatBalance } from '@/lib/utils';

export interface ProfileSummaryCardProps {
  email: string;
  balance: bigint | number;
  totalSpent: bigint | number;
  createdAt: Date;
  orderCount: number;
  referralCount: number;
}

export function ProfileSummaryCard({
  email,
  balance,
  totalSpent,
  createdAt,
  orderCount,
  referralCount,
}: ProfileSummaryCardProps) {
  const balanceFormatted = formatBalance(balance);
  const memberSince = new Date(createdAt).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const spent = Math.max(0, Number(totalSpent || 0) / 100);
  const initials = (email ? email.split('@')[0].slice(0, 2) : 'US').toUpperCase();
  const tier = spent >= 50000
    ? { name: 'Платиновый', color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20', icon: '💎' }
    : spent >= 10000
    ? { name: 'Золотой', color: 'text-amber-600 dark:text-amber-400 bg-warning/10 border-amber-500/20', icon: '🏆' }
    : spent >= 2000
    ? { name: 'Серебряный', color: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20', icon: '⭐' }
    : { name: 'Базовый', color: 'text-muted-foreground bg-muted border-border/60', icon: '🌱' };

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4 text-left w-full md:w-auto">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-black uppercase shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-none min-w-0" title={email}>
              {email}
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase shrink-0 ${tier.color}`}>
              {tier.icon} {tier.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>На платформе с {memberSince}</span>
          </div>
        </div>
      </div>

      {/* Compact Quick Stats */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <div className="flex-1 md:flex-initial bg-muted/40 border border-border/50 rounded-xl px-3.5 py-2">
          <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-primary shrink-0" /> Баланс
          </div>
          <div className="text-sm font-black text-foreground tabular-nums">{balanceFormatted}</div>
        </div>
        <div className="flex-1 md:flex-initial bg-muted/40 border border-border/50 rounded-xl px-3.5 py-2">
          <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" /> Заказов
          </div>
          <div className="text-sm font-black text-foreground tabular-nums">{orderCount}</div>
        </div>
        <div className="flex-1 md:flex-initial bg-muted/40 border border-border/50 rounded-xl px-3.5 py-2">
          <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500 shrink-0" /> Рефералов
          </div>
          <div className="text-sm font-black text-foreground tabular-nums">{referralCount}</div>
        </div>
      </div>
    </div>
  );
}
