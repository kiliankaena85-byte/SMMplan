'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Mail, MessageCircle, MessageSquare } from 'lucide-react';

export type TicketColumn = {
  id: string;
  subject: string;
  status: string;
  source: string;
  updatedAt: string;
  createdAt: string;
  user: { id: string; email: string };
  _count: { messages: number };
  lastMessage: string | null;
  lastMessageSender: string | null;
};

const STATUS_MAP: Record<string, { intent: 'default' | 'primary' | 'secondary' | 'outline' | 'destructive' | 'gradient', label: string, extraClasses: string }> = {
  OPEN: { intent: 'destructive', label: 'Открыт', extraClasses: 'bg-destructive/20 text-destructive border-destructive/30' },
  PENDING: { intent: 'outline', label: 'Ожидает', extraClasses: 'bg-warning/20 text-warning border-warning/30' },
  CLOSED: { intent: 'secondary', label: 'Закрыт', extraClasses: 'bg-muted text-muted-foreground' },
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  TELEGRAM: <span title="Telegram">✈️</span>,
  WEB: <span title="Web">🌐</span>,
  EMAIL: <span title="Email"><Mail className="w-3.5 h-3.5 text-muted-foreground" /></span>,
};

export const columns: ColumnDef<TicketColumn>[] = [
  {
    accessorKey: 'user.email',
    id: 'user.email',
    header: 'Клиент',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
          {row.original.user.email.substring(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <Link href={`/admin/clients?q=${encodeURIComponent(row.original.user.email)}`} className="text-xs font-semibold text-foreground hover:text-primary transition-colors truncate block max-w-[150px]">
            {row.original.user.email}
          </Link>
          <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5 uppercase tracking-tighter">
            {SOURCE_ICONS[row.original.source] || '❓'} {row.original.source}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'subject',
    header: 'Тема и последнее сообщение',
    cell: ({ row }) => (
      <Link href={`/admin/tickets/${row.original.id}`} className="block min-w-0 group">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[250px]">
            {row.original.subject}
          </span>
          {row.original._count.messages > 0 && (
            <span className="bg-muted text-muted-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> {row.original._count.messages}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate max-w-[300px]">
          {row.original.lastMessageSender === 'INTERNAL' || row.original.lastMessageSender === 'ADMIN' ? (
            <span className="text-primary font-bold mr-1">ВЫ:</span>
          ) : null}
          {row.original.lastMessage || <span className="italic">Нет сообщений</span>}
        </div>
      </Link>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const config = STATUS_MAP[row.original.status] || { intent: 'default', label: row.original.status, extraClasses: '' };
      return (
        <Badge intent={config.intent as any} className={`font-bold text-[10px] uppercase tracking-wider ${config.extraClasses}`}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'updatedAt',
    header: 'Обновлено',
    cell: ({ row }) => {
      const date = new Date(row.original.updatedAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      const isUrgent = row.original.status === 'OPEN' && diffMins > 60;
      
      return (
        <div>
          <div className="text-[11px] font-bold text-foreground tabular-nums">
            {date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </div>
          {isUrgent && (
            <div className="text-[9px] bg-destructive/20 text-destructive font-black px-1.5 py-0.5 rounded-sm inline-block mt-1 uppercase tracking-tighter">
              SLA 🔥
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: 'Действия',
    enableSorting: false,
    cell: ({ row }) => (
      <Link href={`/admin/tickets/${row.original.id}`} className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-all inline-flex items-center justify-center shadow-sm">
        <MessageCircle className="w-4 h-4" />
      </Link>
    ),
  },
];
