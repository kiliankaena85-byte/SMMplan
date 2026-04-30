'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { AdminAuditLog } from '@prisma/client';

export const columns: ColumnDef<AdminAuditLog>[] = [
  {
    accessorKey: 'action',
    header: 'Действие',
    cell: ({ row }) => (
      <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
        {row.original.action}
      </span>
    ),
  },
  {
    accessorKey: 'targetType',
    header: 'Тип',
    cell: ({ row }) => (
      <Badge className="font-bold text-[10px] bg-slate-100 text-slate-600 border-slate-200 uppercase">
        {row.original.targetType}
      </Badge>
    ),
  },
  {
    accessorKey: 'adminEmail',
    header: 'Админ',
    cell: ({ row }) => (
      <span className="text-xs text-slate-600 font-mono">
        {row.original.adminEmail}
      </span>
    ),
  },
  {
    accessorKey: 'newValue',
    header: 'Детали',
    cell: ({ row }) => (
      <div className="max-w-[400px] truncate text-[11px] text-slate-500 font-medium" title={row.original.newValue || row.original.oldValue || ''}>
        {row.original.newValue || row.original.oldValue || '—'}
      </div>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Дата',
    cell: ({ row }) => (
      <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
        {new Date(row.original.createdAt).toLocaleString('ru-RU')}
      </span>
    ),
  },
];
