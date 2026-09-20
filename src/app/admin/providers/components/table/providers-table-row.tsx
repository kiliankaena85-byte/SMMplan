'use client';

import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Copy, Check, LifeBuoy, Trash2 } from 'lucide-react';
import type { ProviderListDTO } from '@/services/admin/provider.service';
import { ProviderBalanceCell } from '../provider-balance-cell';
import { SyncProviderButton } from '../sync-provider-button';

export interface ProvidersTableRowProps {
  provider: ProviderListDTO;
  isPending: boolean;
  copiedId: string | null;
  onCopyUrl: (id: string, url: string) => void;
  onToggleActive: (provider: ProviderListDTO) => void;
  onResetErrors: (provider: ProviderListDTO) => void;
  onDeleteRequest: (providerId: string) => void;
  deleteDisabled: boolean;
}

export function ProvidersTableRow({
  provider,
  isPending,
  copiedId,
  onCopyUrl,
  onToggleActive,
  onResetErrors,
  onDeleteRequest,
  deleteDisabled,
}: ProvidersTableRowProps) {
  const pingColor = provider.avgResponseMs > 2000 ? 'text-destructive' : provider.avgResponseMs > 500 ? 'text-warning' : 'text-success';
  const badgeIntent = !provider.isActive ? 'secondary' : provider.errorCount5m > 0 ? 'destructive' : 'primary';
  const badgeText = !provider.isActive ? 'ВЫКЛ' : provider.errorCount5m > 0 ? 'СБОЙ' : 'АКТИВ';

  return (
    <TableRow className="hover:bg-muted/40 transition-colors duration-150 group">
      {/* 1. Name & URL + Copy */}
      <TableCell className="py-2.5 px-4">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors text-xs truncate max-w-[220px]" title={provider.name}>
            {provider.name}
          </span>
          {provider.ticketUrl && (
            <a href={provider.ticketUrl} target="_blank" rel="noopener noreferrer" title="Открыть панель поддержки" className="text-muted-foreground hover:text-primary p-0.5 shrink-0 inline-flex items-center justify-center min-w-[24px] min-h-[24px]">
              <LifeBuoy className="w-3 h-3 text-primary" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-muted-foreground/70 font-mono text-[10px] truncate max-w-[180px]" title={provider.apiUrl}>
            {provider.apiUrl}
          </span>
          <button type="button" onClick={() => onCopyUrl(provider.id, provider.apiUrl)} title="Скопировать URL" className="text-muted-foreground/50 hover:text-foreground p-1 cursor-pointer shrink-0 inline-flex items-center justify-center rounded-md" aria-label="Скопировать URL">
            {copiedId === provider.id ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </TableCell>

      {/* 2. Service count */}
      <TableCell className="py-2.5 px-3">
        <div className="font-bold text-foreground tabular-nums text-xs">{provider.serviceCount.toLocaleString('ru-RU')}</div>
        <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">услуг</div>
      </TableCell>

      {/* 3. Balance & Health */}
      <TableCell className="py-2.5 px-3">
        {provider.isActive ? (
          <ProviderBalanceCell providerId={provider.id} />
        ) : (
          <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50 select-none">
            Отключён
          </span>
        )}
      </TableCell>

      {/* 4. SLA & Ping */}
      <TableCell className="py-2.5 px-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-muted-foreground/70">Ping:</span>
            <span className={`text-[11px] font-mono font-bold ${pingColor}`}>{provider.avgResponseMs}ms</span>
          </div>
          {provider.errorCount5m > 0 ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-destructive">⚠️ {provider.errorCount5m} errs</span>
              <button type="button" onClick={() => onResetErrors(provider)} disabled={isPending} title="Сбросить счётчик ошибок" className="text-[9px] text-muted-foreground hover:text-foreground underline transition-colors cursor-pointer disabled:opacity-50">
                сброс
              </button>
            </div>
          ) : provider.lastSuccessAt ? (
            <div className="text-[9px] text-muted-foreground/70 font-medium font-mono">
              Sync: {new Date(provider.lastSuccessAt).toLocaleTimeString('ru-RU')}
            </div>
          ) : null}
        </div>
      </TableCell>

      {/* 5. Status & Quick Toggle */}
      <TableCell className="py-2.5 px-3">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <button
            type="button"
            onClick={() => onToggleActive(provider)}
            disabled={isPending}
            title={provider.isActive ? 'Отключить шлюз' : 'Включить шлюз'}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
              provider.isActive ? 'bg-success' : 'bg-muted-foreground/30'
            }`}
            aria-label={provider.isActive ? `Отключить ${provider.name}` : `Включить ${provider.name}`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out ${provider.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <Badge intent={badgeIntent} className="font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.2 whitespace-nowrap">
            {badgeText}
          </Badge>
        </div>
      </TableCell>

      {/* 6. Actions */}
      <TableCell className="py-2.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <SyncProviderButton providerId={provider.id} />
          <Link href={`/admin/providers/${provider.id}`} className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-border/60 bg-background/50 hover:bg-muted text-foreground transition-all duration-200 shadow-xs inline-flex items-center justify-center min-h-[32px] active:scale-95 whitespace-nowrap">
            Настроить
          </Link>
          <button
            type="button"
            onClick={() => onDeleteRequest(provider.id)}
            disabled={deleteDisabled}
            title="Удалить провайдера"
            aria-label={`Удалить провайдера ${provider.name}`}
            className="p-1.5 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive transition-all duration-200 shadow-xs active:scale-95 disabled:opacity-50 inline-flex items-center justify-center min-w-[32px] min-h-[32px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
