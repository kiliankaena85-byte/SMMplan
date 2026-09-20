'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Copy, Check, LifeBuoy, Trash2 } from 'lucide-react';
import type { ProviderListDTO } from '@/services/admin/provider.service';
import { ProviderBalanceCell } from '../provider-balance-cell';
import { SyncProviderButton } from '../sync-provider-button';

export interface ProvidersTableMobileCardProps {
  provider: ProviderListDTO;
  isPending: boolean;
  copiedId: string | null;
  onCopyUrl: (id: string, url: string) => void;
  onToggleActive: (provider: ProviderListDTO) => void;
  onResetErrors: (provider: ProviderListDTO) => void;
  onDeleteRequest: (providerId: string) => void;
  deleteDisabled: boolean;
}

export function ProvidersTableMobileCard({
  provider,
  isPending,
  copiedId,
  onCopyUrl,
  onToggleActive,
  onResetErrors,
  onDeleteRequest,
  deleteDisabled,
}: ProvidersTableMobileCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-xs space-y-3 flex flex-col justify-between">
      {/* Header: Name + Badge + Switch */}
      <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground text-sm truncate" title={provider.name}>
              {provider.name}
            </span>
            {provider.ticketUrl && (
              <a
                href={provider.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Открыть панель поддержки у провайдера"
                className="text-muted-foreground hover:text-primary transition-colors p-1 shrink-0 inline-flex items-center justify-center min-w-[28px] min-h-[28px]"
              >
                <LifeBuoy className="w-3.5 h-3.5 text-primary" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-muted-foreground/70 font-mono text-[10px] truncate max-w-[200px]" title={provider.apiUrl}>
              {provider.apiUrl}
            </span>
            <button
              type="button"
              onClick={() => onCopyUrl(provider.id, provider.apiUrl)}
              className="text-muted-foreground/60 hover:text-foreground p-1 shrink-0 cursor-pointer inline-flex items-center justify-center rounded-md"
              aria-label="Скопировать URL"
            >
              {copiedId === provider.id ? (
                <Check className="w-3 h-3 text-success" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            intent={
              !provider.isActive
                ? 'secondary'
                : provider.errorCount5m > 0
                ? 'destructive'
                : 'primary'
            }
            className="font-bold text-[9px] uppercase px-1.5 py-0.2"
          >
            {!provider.isActive ? 'ВЫКЛ' : provider.errorCount5m > 0 ? 'СБОЙ' : 'АКТИВ'}
          </Badge>
          <button
            type="button"
            onClick={() => onToggleActive(provider)}
            disabled={isPending}
            className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
              provider.isActive ? 'bg-success' : 'bg-muted-foreground/30'
            }`}
            aria-label={provider.isActive ? `Отключить ${provider.name}` : `Включить ${provider.name}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out ${
                provider.isActive ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 py-1 text-xs">
        {/* Services */}
        <div className="bg-muted/40 p-2 rounded-xl border border-border/30">
          <div className="text-[9px] font-bold uppercase text-muted-foreground">Услуги</div>
          <div className="font-bold text-foreground mt-0.5 tabular-nums">
            {provider.serviceCount.toLocaleString('ru-RU')}
          </div>
        </div>

        {/* Balance */}
        <div className="bg-muted/40 p-2 rounded-xl border border-border/30 col-span-2">
          <div className="text-[9px] font-bold uppercase text-muted-foreground">Баланс</div>
          <div className="mt-0.5">
            {provider.isActive ? (
              <ProviderBalanceCell providerId={provider.id} />
            ) : (
              <span className="text-[10px] font-mono text-muted-foreground">Отключён</span>
            )}
          </div>
        </div>
      </div>

      {/* Health & Ping Line */}
      <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
        <div className="flex items-center gap-1 font-mono">
          <span>Ping:</span>
          <span
            className={`font-bold ${
              provider.avgResponseMs > 2000
                ? 'text-destructive'
                : provider.avgResponseMs > 500
                ? 'text-warning'
                : 'text-success'
            }`}
          >
            {provider.avgResponseMs}ms
          </span>
        </div>

        {provider.errorCount5m > 0 ? (
          <div className="flex items-center gap-1 text-destructive font-bold">
            <span>⚠️ {provider.errorCount5m} сбоев</span>
            <button
              type="button"
              onClick={() => onResetErrors(provider)}
              disabled={isPending}
              className="underline text-[10px] p-1 cursor-pointer"
            >
              Сбросить
            </button>
          </div>
        ) : provider.lastSuccessAt ? (
          <span className="text-[10px] font-mono">
            Sync: {new Date(provider.lastSuccessAt).toLocaleTimeString('ru-RU')}
          </span>
        ) : null}
      </div>

      {/* Actions footer */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
        <div className="flex-1">
          <SyncProviderButton providerId={provider.id} />
        </div>
        <Link
          href={`/admin/providers/${provider.id}`}
          className="flex-1 py-2 px-3 text-center text-xs font-bold rounded-xl border border-border/60 bg-background/50 hover:bg-muted text-foreground transition-all duration-200 shadow-xs active:scale-95 inline-flex items-center justify-center min-h-[40px]"
        >
          Настроить
        </Link>
        <button
          type="button"
          onClick={() => onDeleteRequest(provider.id)}
          disabled={deleteDisabled}
          aria-label={`Удалить провайдера ${provider.name}`}
          className="p-2.5 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive transition-all duration-200 shadow-xs active:scale-95 disabled:opacity-50 inline-flex items-center justify-center min-w-[40px] min-h-[40px]"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
