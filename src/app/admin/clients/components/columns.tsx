'use client';


import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export type ClientColumn = {
  id: string;
  email: string;
  role: string;
  balance: number;
  quarantineBalance: number;
  totalSpent: number;
  _count: { orders: number };
  tier: { name: string; color: string };
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:   { label: 'Владелец', color: 'bg-warning/15 text-warning border-transparent hover:bg-warning/20' },
  ADMIN:   { label: 'Админ',   color: 'bg-primary/10 text-primary border-transparent hover:bg-primary/20' },
  MANAGER: { label: 'Менеджер', color: 'bg-success/15 text-success border-transparent hover:bg-success/20' },
  SUPPORT: { label: 'Саппорт', color: 'bg-muted text-muted-foreground border-transparent hover:bg-muted' },
  USER:    { label: 'Клиент',  color: 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary' },
  BANNED:  { label: 'Забанен', color: 'bg-destructive/15 text-destructive border-transparent hover:bg-destructive/20' },
};

export const columns: ColumnDef<ClientColumn>[] = [
  {
    accessorKey: 'email',
    header: 'Email / Клиент',
    cell: ({ row }) => {
      const u = row.original;
      return (
        <Link
          href={`/admin/clients/${u.id}`}
          className="text-primary hover:underline font-mono font-medium text-xs transition-colors"
        >
          {u.email}
        </Link>
      );
    },
  },
  {
    accessorKey: 'role',
    header: 'Роль',
    cell: ({ row }) => {
      const u = row.original;
      const roleInfo = ROLE_LABELS[u.role] || { label: u.role, color: 'bg-muted text-foreground border-transparent' };
      return (
        <Badge intent="outline" className={`shadow-none font-medium px-2 py-0.5 text-xs uppercase tracking-wider ${roleInfo.color}`}>
          {roleInfo.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'balance',
    header: () => <div className="text-right">Баланс</div>,
    cell: ({ row }) => {
      const u = row.original;
      return (
        <div className="font-semibold text-xs tabular-nums tracking-tight text-right">
          {(Number(u.balance) / 100).toFixed(2)} ₽
          {Number(u.quarantineBalance) > 0 && (
            <span className="block text-xs text-warning font-medium whitespace-nowrap mt-0.5">
              🔒 {(Number(u.quarantineBalance) / 100).toFixed(2)} ₽
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'totalSpent',
    header: () => <div className="text-right">LTV (Прибыль)</div>,
    cell: ({ row }) => {
      return <div className="text-xs font-medium tabular-nums tracking-tight text-right">{(Number(row.original.totalSpent) / 100).toLocaleString('ru-RU')} ₽</div>;
    },
  },
  {
    accessorKey: '_count.orders',
    header: () => <div className="text-right">Заказы</div>,
    cell: ({ row }) => {
      return <div className="text-xs tabular-nums tracking-tight text-right">{row.original._count.orders.toLocaleString('ru-RU')}</div>;
    },
  },
  {
    accessorKey: 'tier',
    header: 'Уровень',
    cell: ({ row }) => {
      const tier = row.original.tier;
      return (
        <Badge intent="outline" className={`shadow-none px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${tier.color}`}>
          {tier.name}
        </Badge>
      );
    },
  },
];
