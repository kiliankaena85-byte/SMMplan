import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { DashboardBreadcrumbs } from '@/components/dashboard/DashboardBreadcrumbs';
import type { SupportSlaInfo } from '@/utils/support-sla';

export interface TicketChatHeaderTicket {
  id: string;
  subject: string;
  status: string;
}

interface TicketChatHeaderProps {
  ticket: TicketChatHeaderTicket;
  sla: SupportSlaInfo;
}

export function TicketChatHeader({ ticket, sla }: TicketChatHeaderProps) {
  const statusBadge =
    ticket.status === 'OPEN'
      ? { label: 'Открыт', className: 'text-status-error bg-status-error-bg border-status-error/20' }
      : ticket.status === 'PENDING'
      ? { label: 'Ожидает вас', className: 'text-status-warning bg-status-warning-bg border-status-warning/20' }
      : { label: 'Закрыт', className: 'text-muted-foreground bg-muted border-border' };

  return (
    <>
      {/* Header / breadcrumb */}
      <div className="flex flex-col gap-2 shrink-0">
        <DashboardBreadcrumbs
          items={[
            { label: 'Поддержка', href: '/dashboard/tickets' },
            { label: `Тикет #${ticket.id.slice(-6)}` },
          ]}
          className="mb-1"
        />
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tickets"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 min-h-[44px]"
            aria-label="Назад к списку тикетов"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>К списку тикетов</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground leading-tight truncate">
            {ticket.subject}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${sla.bgClass} ${sla.borderClass} ${sla.colorClass}`}
            >
              <Clock className="w-3 h-3" />
              {sla.badgeLabel}
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">• Работаем 24/7</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/api/support/telegram"
            className="inline-flex items-center gap-2 text-xs font-semibold bg-brand-telegram hover:opacity-90 text-primary-foreground px-4 h-11 rounded-xl shadow-sm transition-all duration-200 active:scale-95 touch-manipulation min-h-[44px]"
            aria-label="Перейти в Telegram-бот"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-2 .12-5.63 2.57-.53.36-1 .54-1.43.53-.47-.01-1.37-.27-2.04-.49-.82-.27-1.47-.41-1.42-.87.03-.24.37-.49 1.02-.74 3.99-1.73 6.66-2.88 8-3.43 3.8-1.56 4.59-1.83 5.11-1.84.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.16-.02.22z" />
            </svg>
            Написать в Telegram
          </a>
          <span
            className={`shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border uppercase ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        </div>
      </div>
    </>
  );
}
