import { adminTicketService } from '@/services/admin/ticket.service';
import { getTemplates } from '@/actions/support/template';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { UnifiedTicketsWorkspace } from './components/unified-workspace';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    ticketId?: string;
  }>;
};

export default async function AdminTicketsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.q || '';
  const statusFilter = params.status || 'ALL';
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const activeTicketId = params.ticketId || null;

  // 1. Fetch tickets matching current filter and page sizes
  const [ticketsResult, stats, templatesResult, session] = await Promise.all([
    adminTicketService.listTickets({
      search: search || undefined,
      status: statusFilter,
      pageSize: 20, // compact size for two-panel scrollbars
      page: currentPage,
    }),
    adminTicketService.getTicketStats(),
    getTemplates(),
    verifySession()
  ]);

  // 2. Fetch full active ticket chat details if ticketId query parameter exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let activeTicket: any = null;
  let supportLimitCents = 0;
  let supportSpentTodayCents = 0;

  if (activeTicketId) {
    activeTicket = await adminTicketService.getTicketDetails(activeTicketId);
  }

  if (session?.userId) {
    const admin = await db.user.findUnique({
      where: { id: session.userId },
      select: { supportLimitCents: true },
    });
    if (admin) {
      supportLimitCents = admin.supportLimitCents;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const ledgerCompensations = await db.ledgerEntry.findMany({
      where: {
        adminId: session.userId,
        createdAt: { gte: todayStart },
        reason: {
          contains: 'Компенсация'
        }
      },
      select: {
        amount: true
      }
    });

    supportSpentTodayCents = ledgerCompensations.reduce((acc, entry) => {
      const amt = Number(entry.amount);
      return acc + Math.abs(amt);
    }, 0);
  }

  const templates = Array.isArray(templatesResult) ? templatesResult : [];

  return (
    <div className="flex-grow flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <UnifiedTicketsWorkspace 
        tickets={ticketsResult.items}
        totalPages={ticketsResult.totalPages}
        currentPage={currentPage}
        stats={stats}
        activeTicket={activeTicket}
        templates={templates}
        supportLimitCents={supportLimitCents}
        supportSpentTodayCents={supportSpentTodayCents}
        currentStatus={statusFilter}
        currentSearch={search}
      />
    </div>
  );
}
