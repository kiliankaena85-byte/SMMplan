import { adminTicketService } from '@/services/admin/ticket.service';
import { adminReplyTicket, editTicketMessage } from '@/actions/support/ticket';
import Link from 'next/link';
import { MessageSquare, Mail, Wallet, Search } from 'lucide-react';
import ChatWindow from '@/components/support/ChatWindow';
import TicketActionsDropdown from '@/components/support/TicketActionsDropdown';
import ClientProfileSidebar from '@/components/support/ClientProfileSidebar';
import { getTemplates } from '@/actions/support/template';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const STATUS_CLASSES: Record<string, string> = {
  OPEN:    'bg-rose-100 text-rose-800 border-rose-200',
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  CLOSED:  'bg-muted text-muted-foreground border-border',
};

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    source?: string;
    chatId?: string;
    page?: string;
  }>;
};

export default async function AdminTicketsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search       = params.q || '';
  const statusFilter = params.status || 'ALL';
  const chatId       = params.chatId || null;
  const currentPage  = Math.max(1, parseInt(params.page || '1', 10));

  const [{ items: tickets, totalPages }, stats, templates] = await Promise.all([
    adminTicketService.listTickets({
      search: search || undefined,
      status: statusFilter,
      pageSize: 50,
      page: currentPage,
    }),
    adminTicketService.getTicketStats(),
    getTemplates(),
  ]);

  // Fetch admin support limit
  const session = await verifySession();
  let supportLimitCents = 0;
  if (session?.userId) {
    const admin = await db.user.findUnique({
      where: { id: session.userId },
      select: { supportLimitCents: true },
    });
    if (admin) supportLimitCents = admin.supportLimitCents;
  }

  // Fetch active ticket via service (no raw db in page)
  const activeTicket = chatId ? await adminTicketService.getTicketDetails(chatId) : null;

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4 animate-in fade-in duration-500 ease-out">

      {/* ── Left panel: Ticket list ── */}
      <div className="w-[380px] flex flex-col shrink-0 bg-card border border-border rounded-xl overflow-hidden shadow-sm">

        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <h2 className="font-bold text-base text-foreground mb-3 flex items-center justify-between">
            Список диалогов
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-semibold">
              {stats.total}
            </span>
          </h2>

          {/* Status tabs */}
          <div className="flex gap-1.5 text-[10px] mb-3 overflow-x-auto pb-1">
            {[
              { value: 'ALL',     label: 'Все',         count: stats.total   },
              { value: 'OPEN',    label: 'Открытые',    count: stats.open    },
              { value: 'PENDING', label: 'В ожидании',  count: stats.pending },
              { value: 'CLOSED',  label: 'Закрытые',    count: stats.closed  },
            ].map(tab => (
              <Link
                key={tab.value}
                href={`/admin/tickets?status=${tab.value}&q=${encodeURIComponent(search)}`}
                className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap border transition-all duration-200 ${
                  statusFilter === tab.value
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab.label} <span className="opacity-60 ml-0.5">{tab.count}</span>
              </Link>
            ))}
          </div>

          {/* Search */}
          <form className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Поиск по теме или email..."
              aria-label="Поиск тикетов"
              className="w-full pl-8 pr-4 py-2 text-xs bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground text-foreground"
            />
            <input type="hidden" name="status" value={statusFilter} />
          </form>
        </div>

        {/* Ticket list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {tickets.map(ticket => {
            const isActive = ticket.id === chatId;
            const lastMsg  = ticket.messages[0];
            const minutesSince = Math.floor((Date.now() - new Date(ticket.updatedAt).getTime()) / 60000);
            const isUrgent = ticket.status === 'OPEN' && minutesSince > 60;

            return (
              <Link
                key={ticket.id}
                href={`/admin/tickets?chatId=${ticket.id}&status=${statusFilter}&q=${encodeURIComponent(search)}`}
                className={`block relative p-4 transition-all duration-200 ${
                  isActive ? 'bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r" />
                )}

                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-2.5 max-w-[70%]">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold uppercase">
                      {ticket.user.email.substring(0, 2)}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-foreground text-xs truncate">
                        {ticket.user.email}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        {ticket.source === 'TELEGRAM' && '✈️ Telegram'}
                        {ticket.source === 'EMAIL'    && '📧 Email'}
                        {ticket.source === 'WEB'      && '🌐 Сайт'}
                        {ticket._count.messages > 0 && (
                          <span className="bg-muted text-muted-foreground font-bold rounded-full px-1.5 text-[9px]">
                            {ticket._count.messages}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(ticket.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {isUrgent && (
                      <div className="text-[9px] text-rose-500 font-bold mt-1">🔥 &gt;1ч</div>
                    )}
                  </div>
                </div>

                <div className="pl-11">
                  <div className="text-xs font-semibold text-foreground truncate">{ticket.subject}</div>
                  {lastMsg && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {lastMsg.sender !== 'USER' && (
                        <span className="text-primary font-medium">Вы: </span>
                      )}
                      {lastMsg.text}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}

          {tickets.length === 0 && (
            <div className="py-16 text-center">
              <span className="text-4xl mb-2 block">📭</span>
              <p className="text-sm text-muted-foreground">Диалоги не найдены</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs">
            <Link
              href={`/admin/tickets?status=${statusFilter}&q=${encodeURIComponent(search)}${currentPage > 1 ? `&page=${currentPage - 1}` : ''}`}
              className={`px-3 py-1 rounded-lg font-semibold border transition-all duration-200 ${
                currentPage > 1
                  ? 'bg-card border-border text-foreground hover:bg-muted'
                  : 'opacity-40 pointer-events-none border-transparent text-muted-foreground'
              }`}
            >
              ← Пред
            </Link>
            <span className="text-muted-foreground font-medium">
              {currentPage} / {totalPages}
            </span>
            <Link
              href={`/admin/tickets?status=${statusFilter}&q=${encodeURIComponent(search)}&page=${currentPage + 1}`}
              className={`px-3 py-1 rounded-lg font-semibold border transition-all duration-200 ${
                currentPage < totalPages
                  ? 'bg-card border-border text-foreground hover:bg-muted'
                  : 'opacity-40 pointer-events-none border-transparent text-muted-foreground'
              }`}
            >
              След →
            </Link>
          </div>
        )}
      </div>

      {/* ── Center panel: Chat window ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-card border border-border rounded-xl shadow-sm relative">
        {activeTicket ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-border flex justify-between items-start shrink-0">
              <div className="flex items-start gap-3 min-w-0 pr-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold uppercase text-sm mt-0.5">
                  {activeTicket.user.email.substring(0, 2)}
                </div>
                <div className="min-w-0">
                  <h2
                    className="font-bold text-base text-foreground leading-tight mb-1.5 line-clamp-2"
                    title={activeTicket.subject}
                  >
                    {activeTicket.subject}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1 truncate" title={activeTicket.user.email}>
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{activeTicket.user.email}</span>
                    </span>
                    <span className="text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg whitespace-nowrap">
                      <Wallet className="w-3.5 h-3.5" />
                      {(activeTicket.user.balance / 100).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>
              </div>

              <TicketActionsDropdown
                ticketId={activeTicket.id}
                currentStatus={activeTicket.status}
                templates={templates}
                supportLimitCents={supportLimitCents}
              />
            </div>

            {/* Chat body */}
            <div className="flex-1 bg-muted/20 relative overflow-hidden flex flex-col">
              <ChatWindow
                ticketId={activeTicket.id}
                initialMessages={activeTicket.messages}
                isStaff={true}
                initialTemplates={templates}
                onSendMessage={adminReplyTicket}
                editTicketMessage={editTicketMessage}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-5 relative">
              <MessageSquare className="w-9 h-9 text-primary/30" />
              {stats.open > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-card">
                  {stats.open}
                </div>
              )}
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1.5">Общение с клиентами</h2>
            <p className="text-sm max-w-sm text-center">
              Выберите диалог слева для просмотра истории и ответа.
            </p>
          </div>
        )}
      </div>

      {/* ── Right panel: Client profile sidebar ── */}
      {activeTicket && (
        <ClientProfileSidebar user={activeTicket.user} />
      )}
    </div>
  );
}
