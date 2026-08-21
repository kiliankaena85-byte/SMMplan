'use client';

import { useState, useTransition } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button } from '@/components/ui/button';
import { MoreVertical, CheckCircle, Clock, FileText, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { changeTicketStatus } from '@/actions/support/ticket';
import TemplateManagerModal, { Template } from './TemplateManagerModal';
import ManualRefillModal from './ManualRefillModal';

export default function TicketActionsDropdown({ 
  ticketId, 
  currentStatus,
  templates,
  supportLimitCents
}: { 
  ticketId: string; 
  currentStatus: string;
  templates: Template[];
  supportLimitCents?: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);

  const handleStatusChange = (status: 'OPEN' | 'PENDING' | 'CLOSED') => {
    if (status === currentStatus) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('ticketId', ticketId);
      fd.set('status', status);
      await changeTicketStatus(fd);
    });
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* 1-Click Direct Status Pills for Ultra-wide screens */}
      <div className="hidden 2xl:flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border shrink-0">
        <button
          type="button"
          onClick={() => handleStatusChange('OPEN')}
          disabled={isPending || currentStatus === 'OPEN'}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
            currentStatus === 'OPEN'
              ? 'bg-destructive/15 text-destructive-text border border-destructive/25 shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-background'
          }`}
          title="Взять в работу"
        >
          <RefreshCw className={`w-3 h-3 ${isPending && currentStatus === 'OPEN' ? 'animate-spin' : ''}`} />
          <span>В работу</span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange('PENDING')}
          disabled={isPending || currentStatus === 'PENDING'}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
            currentStatus === 'PENDING'
              ? 'bg-warning/15 text-warning-text border border-warning/25 shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-background'
          }`}
          title="Ожидает ответа клиента"
        >
          <Clock className={`w-3 h-3 ${isPending && currentStatus === 'PENDING' ? 'animate-spin' : ''}`} />
          <span>Ожидание</span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange('CLOSED')}
          disabled={isPending || currentStatus === 'CLOSED'}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
            currentStatus === 'CLOSED'
              ? 'bg-success/15 text-success-text border border-success/25 shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-background'
          }`}
          title="Закрыть тикет"
        >
          <CheckCircle className={`w-3 h-3 ${isPending && currentStatus === 'CLOSED' ? 'animate-spin' : ''}`} />
          <span>Закрыт</span>
        </button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger 
          disabled={isPending}
          className="min-h-[44px] min-w-[44px] lg:min-w-[100px] px-3 inline-flex items-center justify-center gap-2 shadow-sm rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium transition-colors outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-foreground"
        >
          <span className="hidden lg:inline font-medium text-foreground">Меню</span>
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl border-border shadow-xl p-1 bg-card text-card-foreground">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground font-bold px-2 py-1.5 flex items-center gap-2">
              Сменить статус
              {isPending && <RefreshCw className="w-3 h-3 animate-spin"/>}
            </DropdownMenuLabel>
            
            <DropdownMenuItem 
              className={`cursor-pointer rounded-lg mb-1 flex items-center gap-2 ${currentStatus === 'OPEN' ? 'bg-muted font-bold' : ''}`}
              onClick={() => handleStatusChange('OPEN')}
            >
              <RefreshCw className="w-4 h-4 text-destructive" />
              В работу (Открыт)
            </DropdownMenuItem>

            <DropdownMenuItem 
              className={`cursor-pointer rounded-lg mb-1 flex items-center gap-2 ${currentStatus === 'PENDING' ? 'bg-muted font-bold' : ''}`}
              onClick={() => handleStatusChange('PENDING')}
            >
              <Clock className="w-4 h-4 text-warning" />
              В ожидании (Ответ дан)
            </DropdownMenuItem>

            <DropdownMenuItem 
              className={`cursor-pointer rounded-lg mb-1 flex items-center gap-2 ${currentStatus === 'CLOSED' ? 'bg-muted font-bold' : ''}`}
              onClick={() => handleStatusChange('CLOSED')}
            >
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
              Закрыть тикет
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1 bg-border" />
          
          <DropdownMenuItem 
            className="cursor-pointer rounded-lg flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive-text font-medium mb-1"
            onClick={() => setIsRefillModalOpen(true)}
          >
            <RefreshCw className="w-4 h-4 text-destructive" />
            Ручное пополнение баланса
          </DropdownMenuItem>

          <DropdownMenuItem 
            className="cursor-pointer rounded-lg flex items-center gap-2 hover:bg-primary/10 hover:text-primary"
            onClick={() => setIsTemplateModalOpen(true)}
          >
            <FileText className="w-4 h-4" />
            Управление шаблонами
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TemplateManagerModal 
        open={isTemplateModalOpen} 
        onClose={() => setIsTemplateModalOpen(false)} 
        templates={templates}
      />
      
      <ManualRefillModal
        open={isRefillModalOpen}
        onClose={() => setIsRefillModalOpen(false)}
        ticketId={ticketId}
        supportLimitCents={supportLimitCents}
      />
    </div>
  );
}
