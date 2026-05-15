'use client';

/**
 * Feature Flags Client Component
 * 
 * Renders interactive toggle table for feature flags.
 * Uses optimistic updates for instant UI feedback.
 * 
 * Design decisions:
 * - Three-state toggle: OFF → TEST → ON (click cycles through)
 * - Toast notification on every state change
 * - Badge colors: green=ON, yellow=TEST, gray=OFF
 * - Grouped by category for better readability
 */

import { useOptimistic, useTransition, useState } from 'react';
import { setFeatureFlagState } from '@/actions/admin/feature-flags';
import type { FeatureFlagDTO, FlagState } from '@/services/system/feature-flag.service';
import { toast } from 'sonner';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/admin/hero-ui';

interface Props {
  initialFlags: FeatureFlagDTO[];
}

const STATE_CONFIG: Record<FlagState, { label: string; badge: string; next: FlagState }> = {
  ON:   { label: 'Включён', badge: 'bg-emerald-500/15 text-success border border-emerald-500/30', next: 'OFF' },
  TEST: { label: 'Тест',    badge: 'bg-amber-500/15 text-warning border border-amber-500/30', next: 'ON' },
  OFF:  { label: 'Выключен', badge: 'bg-muted text-muted-foreground border border-border', next: 'TEST' },
};

const GROUPS = [
  { label: '📦 Заказы',       keys: ['drip_feed', 'refills', 'order_cancel'] },
  { label: '💳 Оплата',       keys: ['maintenance_mode'] },
  { label: '📢 Маркетинг',    keys: ['referral_program', 'promo_codes', 'loyalty_program', 'email_campaigns', 'push_notifications', 'live_activity_feed'] },
  { label: '🤖 Интеграции',   keys: ['telegram_bot', 'email_notifications', 'client_api'] },
  { label: '🚀 Продвинутое',  keys: ['service_packages', 'smart_upsell'] },
] as const;

export function FeatureFlagsClient({ initialFlags }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFlags, setOptimisticFlags] = useOptimistic(
    initialFlags,
    (state, { key, newState }: { key: string; newState: FlagState }) =>
      state.map(f => f.key === key ? { ...f, state: newState } : f)
  );

  const flagMap = new Map(optimisticFlags.map(f => [f.key, f]));

  function handleToggle(flag: FeatureFlagDTO) {
    const nextState = STATE_CONFIG[flag.state].next;
    startTransition(async () => {
      setOptimisticFlags({ key: flag.key, newState: nextState });
      const result = await setFeatureFlagState(flag.key as Parameters<typeof setFeatureFlagState>[0], nextState);
      if (!result.success) {
        toast.error('Ошибка при изменении флага');
      } else {
        toast.success(`${flag.label}: ${STATE_CONFIG[nextState].label}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground bg-card border border-border rounded-xl p-4">
        <span className="font-medium text-foreground">Состояния:</span>
        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/15 text-success border border-emerald-500/30">Включён</span>
        <span>— работает для всех клиентов</span>
        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-warning border border-amber-500/30">Тест</span>
        <span>— только для тестовых аккаунтов</span>
        <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border">Выключен</span>
        <span>— полностью отключён</span>
      </div>

      {/* Groups */}
      {GROUPS.map(group => {
        const groupFlags = group.keys.map(k => flagMap.get(k)).filter(Boolean) as FeatureFlagDTO[];
        if (!groupFlags.length) return null;

        return (
          <div key={group.label} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-3 border-b border-border bg-muted/30">
              <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
            </div>
            <Table aria-label={`Группа флагов: ${group.label}`}>
              <TableHeader>
                <TableColumn>ОПИСАНИЕ</TableColumn>
                <TableColumn>КЛЮЧ</TableColumn>
                <TableColumn>ИЗМЕНЕНО</TableColumn>
                <TableColumn>ДЕЙСТВИЕ</TableColumn>
              </TableHeader>
              <TableBody>
                {groupFlags.map(flag => {
                  const config = STATE_CONFIG[flag.state];
                  return (
                    <TableRow key={flag.key}>
                      <TableCell>
                        <div className="font-medium text-foreground text-sm">{flag.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{flag.description}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono">{flag.key}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {flag.updatedBy
                            ? <span title={`Изменено: ${flag.updatedAt.toLocaleString('ru')}`}>{flag.updatedBy}</span>
                            : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleToggle(flag)}
                          disabled={isPending}
                          aria-label={`Изменить флаг ${flag.label}: текущее состояние ${config.label}`}
                          className={`
                            px-3 py-1 rounded-full text-xs font-medium
                            transition-all duration-200
                            ${config.badge}
                            hover:opacity-80 active:scale-95
                            disabled:opacity-50 disabled:cursor-not-allowed
                            cursor-pointer
                          `}
                        >
                          {config.label}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground text-center">
        Нажмите на статус для переключения: Выключен → Тест → Включён → Выключен
      </p>
    </div>
  );
}
