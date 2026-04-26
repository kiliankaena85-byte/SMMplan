'use client';

import { useState, useTransition } from 'react';
import { approveQuarantinedService, rejectQuarantinedService, approveAllQuarantined } from '@/actions/admin/providers/sync-action';
import { toast } from 'sonner';

interface QuarantineItem {
  id: string;
  name: string;
  categoryName: string;
  networkSlug: string;
  providerName: string;
  currentRate: number;
  pendingRate: number | null;
  quarantineReason: string;
  quarantinedAt: string;
  externalId: string;
}

interface Props {
  initialItems: QuarantineItem[];
}

const NETWORK_EMOJI: Record<string, string> = {
  instagram: '📸', telegram: '✈️', youtube: '▶️',
  tiktok: '🎵', vk: '🔵', twitter: '🐦', unknown: '🌐',
};

export function QuarantineClient({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();

  function remove(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function handleApprove(item: QuarantineItem) {
    startTransition(async () => {
      const result = await approveQuarantinedService(item.id);
      if (result.success) {
        toast.success(`✅ Принято: ${item.name}`);
        remove(item.id);
      } else {
        toast.error(result.error ?? 'Ошибка');
      }
    });
  }

  function handleReject(item: QuarantineItem) {
    startTransition(async () => {
      const result = await rejectQuarantinedService(item.id);
      if (result.success) {
        toast.success(`🔄 Отклонено, цена сохранена: ${item.name}`);
        remove(item.id);
      } else {
        toast.error('Ошибка');
      }
    });
  }

  function handleApproveAll() {
    startTransition(async () => {
      const result = await approveAllQuarantined();
      if (result.success) {
        toast.success(`✅ Принято ${result.count} услуг`);
        setItems([]);
      } else {
        toast.error('Ошибка массового одобрения');
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-16 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-foreground font-medium">Карантин пуст</p>
        <p className="text-sm text-muted-foreground mt-1">Все ценовые изменения в норме</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} услуг ожидают решения</p>
        <button
          onClick={handleApproveAll}
          disabled={isPending}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-all duration-200 disabled:opacity-50"
          aria-label="Принять все изменения цен"
        >
          ✅ Принять все
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full" aria-label="Услуги в карантине">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Услуга</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Причина</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Текущая</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Новая</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map(item => {
              const emoji = NETWORK_EMOJI[item.networkSlug] ?? '🌐';
              const priceDiff = item.pendingRate !== null
                ? ((item.pendingRate - item.currentRate) / item.currentRate * 100).toFixed(1)
                : '—';
              const isRise = item.pendingRate !== null && item.pendingRate > item.currentRate;

              return (
                <tr key={item.id} className="hover:bg-muted/20 transition-all duration-200">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="text-base">{emoji}</span>
                      <div>
                        <div className="text-sm font-medium text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.categoryName} · {item.providerName}</div>
                        <div className="text-xs text-muted-foreground font-mono">#{item.externalId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20">
                      {item.quarantineReason}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-mono text-muted-foreground">
                      ${item.currentRate.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={`text-sm font-mono font-semibold ${isRise ? 'text-rose-500' : 'text-emerald-500'}`}>
                        ${item.pendingRate?.toFixed(4) ?? '—'}
                      </span>
                      <span className={`text-xs ${isRise ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isRise ? '▲' : '▼'} {priceDiff}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={isPending}
                        aria-label={`Принять новую цену для ${item.name}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all duration-200 disabled:opacity-50"
                      >
                        ✅ Принять
                      </button>
                      <button
                        onClick={() => handleReject(item)}
                        disabled={isPending}
                        aria-label={`Отклонить новую цену для ${item.name}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300 transition-all duration-200 disabled:opacity-50"
                      >
                        ✕ Отклонить
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
