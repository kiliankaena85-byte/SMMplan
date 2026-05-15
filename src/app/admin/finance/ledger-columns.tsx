'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { LedgerEntryDTO } from '@/actions/admin/finance/ledger';

const STATUS_LABELS: Record<string, string> = {
  APPROVED:    'Одобрено',
  QUARANTINE:  'Карантин',
  REJECTED:      'Отклонено',
};

const STATUS_CLASSES: Record<string, string> = {
  APPROVED:   'bg-success/20 text-emerald-700 border-emerald-200',
  QUARANTINE: 'bg-warning/20 text-amber-700 border-amber-200',
  REJECTED:     'bg-destructive/20 text-rose-700 border-destructive/30',
};

function fmt(cents: number, showSign = false): string {
  const sign = showSign && cents > 0 ? '+' : '';
  return `${sign}${(Math.abs(cents) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

export const columns: ColumnDef<LedgerEntryDTO>[] = [
  {
    accessorKey: 'userEmail',
    header: 'Клиент',
    cell: ({ row }) => (
      <Link
        href={`/admin/clients?q=${encodeURIComponent(row.original.userEmail)}`}
        className="text-sky-600 hover:text-sky-800 hover:underline font-mono text-xs font-semibold"
      >
        {row.original.userEmail}
      </Link>
    ),
  },
  {
    accessorKey: 'reason',
    header: 'Причина',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]" title={row.original.reason}>
        {row.original.reason}
      </span>
    ),
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Сумма</div>,
    cell: ({ row }) => {
      const amount = row.original.amount;
      const isPositive = amount >= 0;
      return (
        <div className={`text-right font-bold tabular-nums text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {fmt(amount, true)}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          className={`uppercase font-bold tracking-wider text-[10px] ${STATUS_CLASSES[status] || 'bg-muted text-muted-foreground border-border'}`}
        >
          {STATUS_LABELS[status] || status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Дата',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {new Date(row.original.createdAt).toLocaleString('ru-RU', { 
          day: '2-digit', 
          month: 'short', 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </span>
    ),
  },
];
