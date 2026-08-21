'use client';

import { useTransition } from 'react';
import { CheckCircle, Clock, FileText, RefreshCw, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { changeTicketStatus } from '@/actions/support/ticket';
import { Template } from './TemplateManagerModal';

export default function TicketActionsDropdown({ 
  ticketId, 
  currentStatus,
  templates,
  supportLimitCents,
  onOpenRefill,
  onOpenTemplates,
}: { 
  ticketId: string; 
  currentStatus: string;
  templates: Template[];
  supportLimitCents?: number;
  onOpenRefill?: () => void;
  onOpenTemplates?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

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
      <DropdownMenu>
        <DropdownMenuTrigger 
          disabled={isPending}
          className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 shadow-xs rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-bold text-primary transition-all outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer shrink-0 active:scale-95"
        >
          <span>Действия</span>
          {isPending ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 mt-2 rounded-xl border-border shadow-xl p-1 bg-card text-card-foreground">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground font-bold px-2 py-1.5 flex items-center justify-between">
              <span>Статус диалога</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                currentStatus === 'OPEN' ? 'bg-destructive/15 text-destructive-text' :
                currentStatus === 'PENDING' ? 'bg-warning/15 text-warning-text' :
                'bg-success/15 text-success-text'
              }`}>
                {currentStatus === 'OPEN' ? 'В работе' : currentStatus === 'PENDING' ? 'Ожидание' : 'Закрыт'}
              </span>
            </DropdownMenuLabel>
            
            <DropdownMenuItem 
              className={`cursor-pointer rounded-lg mb-1 flex items-center gap-2 text-xs font-medium ${currentStatus === 'OPEN' ? 'bg-muted font-bold text-destructive-text' : ''}`}
              onClick={() => handleStatusChange('OPEN')}
            >
              <RefreshCw className="w-4 h-4 text-destructive" />
              Взять в работу
            </DropdownMenuItem>

            <DropdownMenuItem 
              className={`cursor-pointer rounded-lg mb-1 flex items-center gap-2 text-xs font-medium ${currentStatus === 'PENDING' ? 'bg-muted font-bold text-warning-text' : ''}`}
              onClick={() => handleStatusChange('PENDING')}
            >
              <Clock className="w-4 h-4 text-warning" />
              Перевести в ожидание
            </DropdownMenuItem>

            <DropdownMenuItem 
              className={`cursor-pointer rounded-lg mb-1 flex items-center gap-2 text-xs font-medium ${currentStatus === 'CLOSED' ? 'bg-muted font-bold text-success-text' : ''}`}
              onClick={() => handleStatusChange('CLOSED')}
            >
              <CheckCircle className="w-4 h-4 text-success" />
              Закрыть тикет
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1 bg-border" />
          
          <DropdownMenuItem 
            className="cursor-pointer rounded-lg flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive-text text-xs font-medium mb-1"
            onClick={() => onOpenRefill?.()}
          >
            <RefreshCw className="w-4 h-4 text-destructive" />
            Запрос докрутки заказа
          </DropdownMenuItem>

          <DropdownMenuItem 
            className="cursor-pointer rounded-lg flex items-center gap-2 hover:bg-primary/10 hover:text-primary text-xs font-medium"
            onClick={() => onOpenTemplates?.()}
          >
            <FileText className="w-4 h-4 text-primary" />
            Шаблоны быстрых ответов
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
