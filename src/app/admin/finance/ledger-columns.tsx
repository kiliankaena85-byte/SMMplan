'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { LedgerEntryDTO } from '@/actions/admin/finance/ledger';
import { Copy, Check } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  APPROVED:    'Одобрено',
  QUARANTINE:  'Карантин',
  REJECTED:    'Отклонено',
};

const STATUS_CLASSES: Record<string, string> = {
  APPROVED:   'bg-success/15 text-success border-success/20',
  QUARANTINE: 'bg-warning/15 text-warning border-warning/20',
  REJECTED:   'bg-destructive/15 text-destructive border-destructive/20',
};

export function getTypeBadge(type: string, amount: number, adminId: string | null) {
  if (adminId) {
    return (
      <Badge intent="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px] font-bold">
        ⚙️ Корректировка
      </Badge>
    );
  }
  if (type === 'REFUND') {
    return (
      <Badge intent="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-bold">
        ↩️ Возврат
      </Badge>
    );
  }
  if (type === 'COMPENSATION') {
    return (
      <Badge intent="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px] font-bold">
        🎁 Бонус
      </Badge>
    );
  }
  if (amount > 0) {
    return (
      <Badge intent="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
        💳 Пополнение
      </Badge>
    );
  }
  return (
    <Badge intent="outline" className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20 text-[10px] font-bold">
      🔻 Списание
    </Badge>
  );
}

function fmt(cents: number, showSign = false): string {
  const sign = showSign && cents > 0 ? '+' : '';
  return `${sign}${(Math.abs(cents) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-all duration-200 cursor-pointer shrink-0"
      title="Копировать ID проводки"
      type="button"
    >
      {copied ? (
        <Check className="w-3 h-3 text-success animate-in fade-in zoom-in-50 duration-200" />
      ) : (
        <Copy className="w-3 h-3 transition-transform active:scale-90" />
      )}
    </button>
  );
}

export const columns: ColumnDef<LedgerEntryDTO>[] = [
  {
    accessorKey: 'userEmail',
    header: 'Клиент',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1 min-w-0 max-w-[200px]">
        <Link
          href={`/admin/clients?q=${encodeURIComponent(row.original.userEmail)}`}
          className="text-primary hover:text-primary/80 hover:underline font-mono text-xs font-semibold truncate transition-colors"
        >
          {row.original.userEmail}
        </Link>
        <div className="flex items-center gap-1">
          <span 
            className="text-[10px] text-muted-foreground font-mono truncate"
            title={row.original.id}
          >
            ID: {row.original.id.slice(0, 8)}...
          </span>
          <CopyButton value={row.original.id} />
        </div>
      </div>
    ),
    filterFn: (row, columnId, filterValue) => {
      const val = String(filterValue).toLowerCase();
      const email = String(row.original.userEmail).toLowerCase();
      const id = String(row.original.id).toLowerCase();
      return email.includes(val) || id.includes(val);
    },
  },
  {
    accessorKey: 'tenantId',
    header: 'Бренд',
    cell: ({ row }) => {
      const u = row.original;
      const isSmmplan = u.tenantId === 'smmplan';
      const bg = isSmmplan 
        ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' 
        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20';
      return (
        <Badge intent="outline" className={`shadow-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${bg}`}>
          {isSmmplan ? 'SMMplan' : 'SMMflux'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'transactionType',
    header: 'Тип операции',
    cell: ({ row }) => {
      const { transactionType, amount, adminId } = row.original;
      return getTypeBadge(transactionType, amount, adminId);
    },
  },
  {
    accessorKey: 'reason',
    header: 'Причина',
    cell: ({ row }) => {
      const adminId = row.original.adminId;
      return (
        <div className="flex flex-col items-start gap-0.5 max-w-xs">
          <span className="text-xs text-foreground font-medium line-clamp-2 leading-relaxed" title={row.original.reason}>
            {row.original.reason}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {adminId ? `👤 Оператор (${adminId.slice(0, 6)})` : '⚙️ Система'}
          </span>
        </div>
      );
    },
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
    accessorKey: 'createdAt',
    header: 'Дата',
    cell: ({ row }) => {
      const status = row.original.status;
      const showStatusLabel = status !== 'APPROVED';
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleString('ru-RU', { 
              day: '2-digit', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          {showStatusLabel && (
            <Badge
              className={`uppercase font-bold tracking-wider text-[8px] py-0 px-1 h-4 rounded ${STATUS_CLASSES[status] || 'bg-muted text-muted-foreground'}`}
            >
              {STATUS_LABELS[status] || status}
            </Badge>
          )}
        </div>
      );
    },
  },
];
