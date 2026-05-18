import { adminTicketService } from '@/services/admin/ticket.service';
import { adminReplyTicket, editTicketMessage } from '@/actions/support/ticket';
import { getTemplates } from '@/actions/support/template';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Wallet, HeadphonesIcon } from 'lucide-react';
import ChatWindow from '@/components/support/ChatWindow';
import TicketActionsDropdown from '@/components/support/TicketActionsDropdown';
import ClientProfileSidebar from '@/components/support/ClientProfileSidebar';
import { AdminPageHeader } from '@/components/admin/page-header';
import { formatBalance } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminTicketChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [activeTicket, templatesResult, session] = await Promise.all([
    adminTicketService.getTicketDetails(id),
    getTemplates(),
    verifySession(),
  ]);

  const templates = Array.isArray(templatesResult) ? templatesResult : [];

  if (!activeTicket) return notFound();

  // Fetch admin support limit
  let supportLimitCents = 0;
  if (session?.userId) {
    const admin = await db.user.findUnique({
      where: { id: session.userId },
      select: { supportLimitCents: true },
    });
    if (admin) supportLimitCents = admin.supportLimitCents;
  }

  return (
    <div className="flex-1 animate-in fade-in duration-500 ease-out flex flex-col h-[calc(100vh-7rem)] min-h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <AdminPageHeader 
          title="Диалог с клиентом" 
          description="Управление тикетом и компенсациями"
          icon={HeadphonesIcon}
        />
        <Link 
          href="/admin/tickets" 
          className="text-xs font-bold bg-background text-muted-foreground px-4 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-2 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Вернуться к списку
        </Link>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* ── Left panel: Chat window ── */}
        <div className="flex-1 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Chat header */}
          <div className="p-5 border-b border-border flex justify-between items-center bg-card shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-sm shadow-inner border border-primary/20">
                {activeTicket.user.email.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-sm text-foreground leading-tight mb-1 truncate" title={activeTicket.subject}>
                  {activeTicket.subject}
                </h2>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {activeTicket.user.email}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-success flex items-center gap-1 px-1.5 py-0.5 bg-success/10 rounded-md">
                    <Wallet className="w-3 h-3" /> {formatBalance(activeTicket.user.balance)}
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
          <div className="flex-1 bg-muted/50/30 relative overflow-hidden flex flex-col">
            <ChatWindow
              ticketId={activeTicket.id}
              initialMessages={activeTicket.messages}
              isStaff={true}
              initialTemplates={templates}
              onSendMessage={adminReplyTicket}
              editTicketMessage={editTicketMessage}
              initialNextCursor={activeTicket.nextCursor}
            />
          </div>
        </div>

        {/* ── Right panel: Client profile sidebar ── */}
        <div className="w-[350px] shrink-0 overflow-y-auto bg-card border border-border rounded-xl shadow-sm">
          <ClientProfileSidebar 
            ticketId={activeTicket.id}
            user={{ 
              ...activeTicket.user, 
              balance: Number(activeTicket.user.balance), 
              totalSpent: Number(activeTicket.user.totalSpent), 
              orders: activeTicket.user.orders.map(o => ({ ...o, charge: Number(o.charge) })), 
              payments: activeTicket.user.payments.map(p => ({ ...p, amount: Number(p.amount) })) 
            }} 
          />
        </div>
      </div>
    </div>
  );
}
