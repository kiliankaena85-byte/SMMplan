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
  const sourceFilter = params.source || 'ALL';
  const chatId       = params.chatId || null;
  const currentPage  = Math.max(1, parseInt(params.page || '1', 10));

  const [{ items: tickets, totalPages }, stats, templates] = await Promise.all([
    adminTicketService.listTickets({
      search: search || undefined,
      status: statusFilter,
      source: sourceFilter,
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
      <div className="w-[400px] flex flex-col shrink-0 bg-card border border-border rounded-xl overflow-hidden shadow-sm">

        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <h2 className="font-bold text-base text-foreground mb-3 flex items-center justify-between">
            Поддержка
            <div className="flex gap-2">
               {stats.open > 0 && <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse">{stats.open} НОВЫХ</span>}
               <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-semibold">{stats.total}</span>
            </div>
          </h2>

          {/* Status tabs */}
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1 no-scrollbar">
            {[
              { value: 'ALL',     label: 'Все' },
              { value: 'OPEN',    label: 'Открытые' },
              { value: 'PENDING', label: 'Ожидают' },
              { value: 'CLOSED',  label: 'Архив' },
            ].map(tab => (
              <Link
                key={tab.value}
                href={`/admin/tickets?status=${tab.value}&q=${encodeURIComponent(search)}&source=${sourceFilter}`}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all duration-200 ${
                  statusFilter === tab.value
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Source filters */}
          <div className="flex gap-1 mb-4">
             {[
               { value: 'ALL',      label: 'Все каналы' },
               { value: 'TELEGRAM', label: '✈️ TG' },
               { value: 'WEB',      label: '🌐 WEB' },
               { value: 'EMAIL',    label: '📧 Email' },
             ].map(s => (
               <Link
                 key={s.value}
                 href={`/admin/tickets?status=${statusFilter}&q=${encodeURIComponent(search)}&source=${s.value}`}
                 className={`flex-1 text-center py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                   sourceFilter === s.value
                     ? 'bg-slate-800 text-white'
                     : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                 }`}
               >
                 {s.label}
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
              placeholder="Поиск по email или теме..."
              className="w-full pl-8 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 text-slate-900 font-medium"
            />
            <input type="hidden" name="status" value={statusFilter} />
            <input type="hidden" name="source" value={sourceFilter} />
          </form>
        </div>

        {/* Ticket list */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {tickets.map(ticket => {
            const isActive = ticket.id === chatId;
            const lastMsg  = ticket.messages[0];
            const minutesSince = Math.floor((Date.now() - new Date(ticket.updatedAt).getTime()) / 60000);
            const isUrgent = ticket.status === 'OPEN' && minutesSince > 60;
            
            const sourceIcons = { 'TELEGRAM': '✈️', 'WEB': '🌐', 'EMAIL': '📧' };

            return (
              <Link
                key={ticket.id}
                href={`/admin/tickets?chatId=${ticket.id}&status=${statusFilter}&q=${encodeURIComponent(search)}&source=${sourceFilter}`}
                className={`block relative p-4 border-b border-white transition-all duration-200 ${
                  isActive ? 'bg-white shadow-md z-10 scale-[1.02] rounded-xl mx-2 my-1 border-indigo-100' : 'hover:bg-white/60'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black shadow-sm ${
                      isActive ? 'bg-indigo-600 text-white rotate-3' : 'bg-white border border-slate-100 text-slate-400'
                    }`}>
                      {ticket.user.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className={`font-bold text-[11px] truncate ${isActive ? 'text-indigo-600' : 'text-slate-700'}`}>
                        {ticket.user.email}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5 uppercase tracking-tighter">
                        <span>{sourceIcons[ticket.source as keyof typeof sourceIcons] || '❓'} {ticket.source}</span>
                        {ticket._count.messages > 0 && (
                          <span className="bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5">
                            {ticket._count.messages}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold text-slate-400 tabular-nums">
                      {minutesSince < 60 ? `${minutesSince}м` : new Date(ticket.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {isUrgent && (
                      <div className="text-[9px] text-white bg-rose-500 px-1.5 rounded-sm font-black mt-1 uppercase">SLA 🔥</div>
                    )}
                    {ticket.status === 'CLOSED' && (
                       <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Архив</div>
                    )}
                  </div>
                </div>

                <div className="pl-12">
                  <div className="text-[11px] font-bold text-slate-900 truncate mb-0.5">{ticket.subject}</div>
                  {lastMsg && (
                    <p className={`text-[10px] truncate leading-normal ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                      {lastMsg.sender !== 'USER' && (
                        <span className="text-indigo-500 font-black uppercase text-[8px] mr-1">ВЫ:</span>
                      )}
                      {lastMsg.text}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}

          {tickets.length === 0 && (
            <div className="py-24 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl opacity-50 grayscale">📭</div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Диалоги не найдены</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
            <Link
              href={`/admin/tickets?status=${statusFilter}&q=${encodeURIComponent(search)}&source=${sourceFilter}${currentPage > 1 ? `&page=${currentPage - 1}` : ''}`}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                currentPage > 1
                  ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95'
                  : 'opacity-20 pointer-events-none'
              }`}
            >
              ← Назад
            </Link>
            <span className="text-slate-400">
              Стр {currentPage} из {totalPages}
            </span>
            <Link
              href={`/admin/tickets?status=${statusFilter}&q=${encodeURIComponent(search)}&source=${sourceFilter}&page=${currentPage + 1}`}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                currentPage < totalPages
                  ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95'
                  : 'opacity-20 pointer-events-none'
              }`}
            >
              Вперед →
            </Link>
          </div>
        )}
      </div>

      {/* ── Center panel: Chat window ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-card border border-border rounded-xl shadow-sm relative">
        {activeTicket ? (
          <>
            {/* Chat header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-black text-sm shadow-inner border border-indigo-100">
                  {activeTicket.user.email.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="font-black text-sm text-slate-900 leading-tight mb-1 truncate" title={activeTicket.subject}>
                    {activeTicket.subject}
                  </h2>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {activeTicket.user.email}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <span className="text-emerald-600 flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 rounded-md">
                      <Wallet className="w-3 h-3" /> {(Number(activeTicket.user.balance) / 100).toLocaleString('ru-RU')} ₽
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
            <div className="flex-1 bg-slate-50/30 relative overflow-hidden flex flex-col">
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
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/20">
            <div className="w-24 h-24 bg-white border border-slate-100 shadow-xl shadow-indigo-500/5 rounded-[2rem] flex items-center justify-center mb-6 relative rotate-3">
              <MessageSquare className="w-10 h-10 text-indigo-200" />
              {stats.open > 0 && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-4 border-slate-50 animate-bounce">
                  {stats.open}
                </div>
              )}
            </div>
            <h2 className="text-lg font-black text-slate-800 mb-2 uppercase tracking-tight">Центр поддержки</h2>
            <p className="text-xs font-bold text-slate-400 max-w-xs text-center uppercase tracking-widest leading-relaxed">
              Выберите диалог в левой панели для начала работы с клиентом
            </p>
          </div>
        )}
      </div>

      {/* ── Right panel: Client profile sidebar ── */}
      {activeTicket && (
        <ClientProfileSidebar user={{ ...activeTicket.user, balance: Number(activeTicket.user.balance), totalSpent: Number(activeTicket.user.totalSpent), orders: activeTicket.user.orders.map(o => ({ ...o, charge: Number(o.charge) })), payments: activeTicket.user.payments.map(p => ({ ...p, amount: Number(p.amount) })) }} />
      )}
    </div>
  );
}
