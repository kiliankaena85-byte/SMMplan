import React from 'react';
import { Headphones, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';

const formatTicketDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return '';
  }
};

const renderSourceBadge = (source: string) => {
  const s = source?.toUpperCase();
  if (s === 'TELEGRAM') {
    return (
      <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-2 border-card bg-background flex items-center justify-center shadow-xs" title="Telegram">
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-[#24A1DE] fill-current">
          <path d="M9.78 18.65c-.23 0-.38-.1-.47-.3L7.1 14.15l8.63-7.55c.1-.08.2-.08.26-.01.06.07.05.18-.03.26l-6.84 6.17-.02 4.69c.01.42.27.73.68.73.23 0 .42-.1.58-.26l2.19-2.1 4.22 3.12c.57.42 1.12.21 1.29-.48l3.15-14.85c.19-.79-.31-1.15-.99-.87L2.1 10.3c-.76.3-.75.73-.13.92l4.66 1.45 10.79-6.8c.51-.31.98-.14.6.2l-8.75 7.89-.34 4.29c-.04.26-.2.4-.45.4z" />
        </svg>
      </span>
    );
  }
  if (s === 'EMAIL') {
    return (
      <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-2 border-card bg-background flex items-center justify-center shadow-xs" title="Email">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-rose-500">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </span>
    );
  }
  if (s === 'VK') {
    return (
      <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-2 border-card bg-background flex items-center justify-center shadow-xs" title="VK">
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-[#0077FF] fill-current">
          <path d="M15.63 21.6c.15-.31.3-.61.4-.92.35-1.07.67-2.14 1-3.21.13-.42.34-.63.78-.65 1.16-.04 2.32-.01 3.48-.03.54-.01.9-.3.94-.78.06-.72-.11-1.39-.51-2.01-.84-1.28-1.75-2.52-2.61-3.79-.14-.2-.14-.37 0-.58.74-1.06 1.49-2.12 2.21-3.2.56-.84.81-1.76.43-2.75-.24-.63-.73-.91-1.42-.91-1.44.01-2.88 0-4.32.01-.4. 0-.66.19-.81.56-.6 1.46-1.26 2.89-1.95 4.31-.13.26-.29.38-.58.33-.29-.05-.44-.22-.44-.52 0-1.57-.01-3.14.01-4.71 0-.68-.31-1.06-.96-1.12-.55-.05-1.11-.02-1.66-.02-1.47 0-2.64.49-3.22 1.62-.09.18-.08.38.16.48.24.1.48.13.7.27.42.27.56.67.57 1.16.03 1.58.01 3.16.02 4.74 0 .34-.14.54-.42.61-.26.06-.45-.04-.61-.24-.87-1.1-1.63-2.29-2.39-3.48-.25-.39-.5-.78-.77-1.15-.22-.31-.5-.46-.89-.45-1.28.01-2.56 0-3.84.01-.48 0-.81.25-.86.69-.07.63.15 1.18.49 1.7.94 1.44 1.88 2.88 2.84 4.31.95 1.42 1.94 2.82 2.94 4.2.82 1.12 1.81 1.98 3.11 2.37.58.17 1.18.23 1.79.23 1.34-.01 2.68-.01 4.02-.01.44 0 .72-.2.8-.62z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-2 border-card bg-background flex items-center justify-center shadow-xs" title="Web">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-indigo-500">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    </span>
  );
};

export interface TicketsSidebarProps {
  isMobile: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeTicket: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any;
  searchVal: string;
  setSearchVal: (val: string) => void;
  handleSearchSubmit: (e: React.FormEvent) => void;
  currentStatus: string;
  handleStatusFilter: (status: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tickets: any[];
  handleSelectTicket: (id: string) => void;
  totalPages: number;
  currentPage: number;
  handlePageChange: (page: number) => void;
}

export function TicketsSidebar({
  isMobile,
  activeTicket,
  stats,
  searchVal,
  setSearchVal,
  handleSearchSubmit,
  currentStatus,
  handleStatusFilter,
  tickets,
  handleSelectTicket,
  totalPages,
  currentPage,
  handlePageChange
}: TicketsSidebarProps) {
  if (isMobile && activeTicket) {
    return null;
  }

  return (
    <div 
      className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-r border-border flex flex-col h-full select-none bg-background/50"
    >
      {/* List Header */}
      <div className="p-4 border-b border-border space-y-3 bg-card text-card-foreground">
        <div className="flex items-center justify-between">
          <h1 className="font-black text-base flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            <span>Обращения</span>
          </h1>
          <div className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
            {stats.open} открытых
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Поиск по теме, почте, ID..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-border rounded-xl text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all bg-muted"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/60" />
        </form>

        {/* Status Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {[
            { label: 'Все', value: 'ALL' },
            { label: 'Открытые', value: 'OPEN' },
            { label: 'Ожидают', value: 'PENDING' },
            { label: 'Закрытые', value: 'CLOSED' }
          ].map((pill) => {
            const isActive = currentStatus === pill.value;
            return (
              <button
                key={pill.value}
                type="button"
                onClick={() => handleStatusFilter(pill.value)}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer ${
                  isActive 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'bg-muted text-foreground hover:bg-muted-foreground/10'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards List container */}
      <div className="flex-grow overflow-y-auto flex flex-col gap-1 p-2 custom-scrollbar bg-background/50">
        {tickets.map((ticket) => {
          const isActive = activeTicket?.id === ticket.id;
          const lastMsg = ticket.messages?.[0]?.text || "Нет сообщений";
          const croppedMsg = lastMsg.length > 55 ? `${lastMsg.substring(0, 55)}...` : lastMsg;

          return (
            <div 
              key={ticket.id}
              onClick={() => handleSelectTicket(ticket.id)}
              className={`mx-1 my-0.5 p-3 rounded-xl cursor-pointer transition-all duration-200 flex flex-col select-none border-l-4 ${
                isActive 
                  ? 'bg-secondary/40 text-secondary-foreground border-l-primary' 
                  : 'bg-card text-foreground border-l-transparent hover:bg-muted/40'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Premium Circular Avatar */}
                <div className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-xs shrink-0 select-none">
                  {ticket.user.email.substring(0, 2).toUpperCase()}
                  {/* Social Network Icon Badge based on ticket source */}
                  {renderSourceBadge(ticket.source)}
                </div>
                
                {/* Content Block */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-bold text-foreground truncate max-w-[100px] sm:max-w-[145px]" title={ticket.user.email}>
                        {ticket.user.email}
                      </span>
                      {ticket.user.b2bConfig?.isB2b && (
                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[8px] font-black uppercase shrink-0 select-none">
                          Priority B2B
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={ticket.status} className="h-4 px-1.5 text-[8px]" />
                      <span className="text-[9px] font-medium text-muted-foreground">
                        {formatTicketDate(ticket.updatedAt)}
                      </span>
                    </div>
                  </div>
                  
                  <span className="block text-xs font-bold text-foreground truncate mb-0.5" title={ticket.subject}>
                    {ticket.subject}
                  </span>
                  
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[11px] text-muted-foreground truncate leading-normal flex-1">
                      {croppedMsg}
                    </p>
                    
                    {/* Circular Unread Badge */}
                    {ticket.status === 'OPEN' && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-black shrink-0 shadow-sm animate-pulse" title="Ожидает ответа оператора">
                        !
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {tickets.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Диалоги не найдены
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-border flex items-center justify-between shrink-0 bg-card select-none">
          <Button
            intent="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="h-8 min-h-[44px] min-w-[44px] touch-target-expand"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">
            {currentPage} / {totalPages}
          </span>
          <Button
            intent="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="h-8 min-h-[44px] min-w-[44px] touch-target-expand"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
