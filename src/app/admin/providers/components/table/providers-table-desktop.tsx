'use client';

import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ProviderListDTO } from '@/services/admin/provider.service';
import { ProvidersTableRow } from './providers-table-row';

export interface ProvidersTableDesktopProps {
  providers: ProviderListDTO[];
  pendingIds: Set<string>;
  copiedId: string | null;
  onCopyUrl: (id: string, url: string) => void;
  onToggleActive: (provider: ProviderListDTO) => void;
  onResetErrors: (provider: ProviderListDTO) => void;
  onDeleteRequest: (providerId: string) => void;
  deleteDisabled: boolean;
}

export function ProvidersTableDesktop({
  providers,
  pendingIds,
  copiedId,
  onCopyUrl,
  onToggleActive,
  onResetErrors,
  onDeleteRequest,
  deleteDisabled,
}: ProvidersTableDesktopProps) {
  return (
    <div className="hidden lg:block w-full">
      <Table className="w-full text-left" aria-label="Список SMM-провайдеров">
        <TableHeader>
          <TableRow className="border-b border-border/60 hover:bg-transparent">
            <TableHead className="w-[30%] bg-muted/40 py-3 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Провайдер / API</TableHead>
            <TableHead className="w-[10%] bg-muted/40 py-3 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Услуги</TableHead>
            <TableHead className="w-[18%] bg-muted/40 py-3 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Баланс (Sync)</TableHead>
            <TableHead className="w-[16%] bg-muted/40 py-3 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">SLA & Пинг</TableHead>
            <TableHead className="w-[10%] bg-muted/40 py-3 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Статус</TableHead>
            <TableHead className="w-[16%] bg-muted/40 py-3 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/40">
          {providers.map((p) => (
            <ProvidersTableRow
              key={p.id}
              provider={p}
              isPending={pendingIds.has(p.id)}
              copiedId={copiedId}
              onCopyUrl={onCopyUrl}
              onToggleActive={onToggleActive}
              onResetErrors={onResetErrors}
              onDeleteRequest={onDeleteRequest}
              deleteDisabled={deleteDisabled}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
