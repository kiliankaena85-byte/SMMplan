'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PaymentDTO } from '@/actions/admin/finance/payments';

const STATUS_LABELS: Record<string, string> = {
  SUCCEEDED: 'Успешно',
  PENDING:   'Ожидание',
  CANCELED:  'Отменено',
};

const STATUS_CLASSES: Record<string, string> = {
  SUCCEEDED: 'bg-success/15 text-success border-success/20',
  PENDING:   'bg-warning/15 text-warning border-warning/20',
  CANCELED:  'bg-destructive/15 text-destructive border-destructive/20',
};

const GATEWAY_LABELS: Record<string, string> = {
  yookassa: 'ЮKassa',
  cryptobot: 'CryptoBot',
  test:      'Тестовый',
};

function fmt(cents: number): string {
  return `${(cents / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

export const columns: ColumnDef<PaymentDTO>[] = [
  {
    accessorKey: 'userEmail',
    header: 'Клиент',
    cell: ({ row }) => (
      <Link
        href={`/admin/clients?q=${encodeURIComponent(row.original.userEmail)}`}
        className="text-primary hover:text-primary/80 hover:underline font-mono text-xs font-semibold transition-colors"
      >
        {row.original.userEmail}
      </Link>
    ),
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Сумма</div>,
    cell: ({ row }) => (
      <div className="text-right font-bold tabular-nums text-sm text-foreground">
        {fmt(row.original.amount)}
      </div>
    ),
  },
  {
    accessorKey: 'gateway',
    header: 'Шлюз',
    cell: ({ row }) => (
      <span className="text-xs font-semibold text-muted-foreground">
        {GATEWAY_LABELS[row.original.gateway] || row.original.gateway}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          className={cn(
            "uppercase font-bold tracking-wider text-xs",
            STATUS_CLASSES[status] || 'bg-muted text-muted-foreground border-border'
          )}
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
  {
    id: 'actions',
    header: () => <div className="text-center">Документы</div>,
    cell: ({ row }) => {
      const isSucceeded = row.original.status === 'SUCCEEDED';
      return (
        <div className="text-center">
          {isSucceeded ? (
            <Link
              href={`/admin/finance/payments/${row.original.id}/dispute-pack`}
              className={cn(
                buttonVariants({ intent: 'tint', size: 'sm' }),
                "text-xs font-bold uppercase tracking-wider py-1 h-8 rounded-xl"
              )}
            >
              📄 Оформить пакет
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground/45 italic">-</span>
          )}
        </div>
      );
    },
  },
];
