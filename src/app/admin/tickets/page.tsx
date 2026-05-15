import { adminTicketService } from '@/services/admin/ticket.service';
import { TicketClient } from './components/ticket-client';
import { AdminPageHeader } from '@/components/admin/page-header';
import { TicketColumn } from './components/columns';
import { HeadphonesIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    source?: string;
    page?: string;
  }>;
};

export default async function AdminTicketsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search       = params.q || '';
  const statusFilter = params.status || 'ALL';
  const sourceFilter = params.source || 'ALL';
  const currentPage  = Math.max(1, parseInt(params.page || '1', 10));

  const [{ items: tickets, totalPages }, stats] = await Promise.all([
    adminTicketService.listTickets({
      search: search || undefined,
      status: statusFilter,
      source: sourceFilter,
      pageSize: 50,
      page: currentPage,
    }),
    adminTicketService.getTicketStats(),
  ]);

  const tableData: TicketColumn[] = tickets.map(t => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    source: t.source,
    updatedAt: t.updatedAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    user: t.user,
    _count: t._count,
    lastMessage: t.messages?.[0]?.text || null,
    lastMessageSender: t.messages?.[0]?.sender || null,
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 animate-in fade-in duration-500 ease-out">
      <AdminPageHeader 
        title="Тикеты поддержки" 
        description="Управление обращениями клиентов и приоритезация проблем"
        icon={HeadphonesIcon}
      />

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Всего тикетов</div>
          <div className="text-2xl font-black">{stats.total}</div>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <HeadphonesIcon className="w-12 h-12 text-destructive" />
          </div>
          <div className="text-xs font-bold text-destructive uppercase tracking-widest mb-1">Открытые (SLA)</div>
          <div className="text-2xl font-black text-destructive">{stats.open}</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl shadow-sm">
          <div className="text-xs font-bold text-warning uppercase tracking-widest mb-1">Ожидают</div>
          <div className="text-2xl font-black text-warning">{stats.pending}</div>
        </div>
        <div className="bg-muted/50 border border-border p-4 rounded-xl shadow-sm">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Закрытые</div>
          <div className="text-2xl font-black text-foreground">{stats.closed}</div>
        </div>
      </div>

      <TicketClient 
        data={tableData} 
        totalPages={totalPages} 
        currentPage={currentPage} 
      />
    </div>
  );
}
