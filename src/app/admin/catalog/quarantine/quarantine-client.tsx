'use client';

import { useState, useTransition } from 'react';
import { approveQuarantinedService, rejectQuarantinedService, approveAllQuarantined } from '@/actions/admin/providers/sync-action';
import { toast } from 'sonner';
import { Table } from '@/components/admin/hero-ui';

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
      <div className="bg-card border border-border rounded-xl overflow-hidden w-full">
        <Table aria-label="Услуги в карантине">
          <Table.ScrollContainer>
            <Table.Content>
              <Table.Header>
                <Table.Column isRowHeader>УСЛУГА</Table.Column>
                <Table.Column>ПРИЧИНА</Table.Column>
                <Table.Column className="text-right">ТЕКУЩАЯ</Table.Column>
                <Table.Column className="text-right">НОВАЯ</Table.Column>
                <Table.Column className="text-right">ДЕЙСТВИЕ</Table.Column>
              </Table.Header>
              <Table.Body>
                {items.map(item => {
                  const emoji = NETWORK_EMOJI[item.networkSlug] ?? '🌐';
                  const priceDiff = item.pendingRate !== null
                    ? ((item.pendingRate - item.currentRate) / item.currentRate * 100).toFixed(1)
                    : '—';
                  const isRise = item.pendingRate !== null && item.pendingRate > item.currentRate;

                  return (
                    <Table.Row key={item.id}>
                      <Table.Cell>
                        <div className="flex items-start gap-2">
                          <span className="text-base">{emoji}</span>
                          <div>
                            <div className="text-sm font-medium text-foreground">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.categoryName} · {item.providerName}</div>
                            <div className="text-xs text-muted-foreground font-mono">#{item.externalId}</div>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-xs px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20">
                          {item.quarantineReason}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <span className="text-sm font-mono text-muted-foreground">
                          ${item.currentRate.toFixed(4)}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-sm font-mono font-semibold ${isRise ? 'text-destructive' : 'text-success'}`}>
                            ${item.pendingRate?.toFixed(4) ?? '—'}
                          </span>
                          <span className={`text-xs ${isRise ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isRise ? '▲' : '▼'} {priceDiff}%
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleApprove(item)}
                            disabled={isPending}
                            aria-label={`Принять новую цену для ${item.name}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-success border border-emerald-500/30 hover:bg-emerald-500/25 transition-all duration-200 disabled:opacity-50"
                          >
                            ✅ Принять
                          </button>
                          <button
                            onClick={() => handleReject(item)}
                            disabled={isPending}
                            aria-label={`Отклонить новую цену для ${item.name}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground border border-border hover:bg-slate-300 transition-all duration-200 disabled:opacity-50"
                          >
                            ✕ Отклонить
                          </button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>
    </div>
  );
}

