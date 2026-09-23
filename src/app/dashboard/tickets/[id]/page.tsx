import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { resolveTenantFromHeaders } from '@/lib/tenant-resolver-edge';
import { resolveTenantUser } from '@/lib/tenant-user-resolver';
import { addTicketMessage } from '@/actions/support/ticket';
import ChatWindow from '@/components/support/ChatWindow';
import { getSupportSlaInfo } from '@/utils/support-sla';
import { TicketChatHeader } from '@/components/support/TicketChatHeader';
import { TicketLinkedOrderCard } from '@/components/support/TicketLinkedOrderCard';
import {
  mapHistoricalMessages,
  mapActiveMessages,
  mapInitialOrders,
} from '@/components/support/ticket-chat-helpers';

export const dynamic = 'force-dynamic';

export default async function ClientTicketChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const { id } = await params;
  const reqHeaders = await headers();
  const currentTenantId = resolveTenantFromHeaders(reqHeaders);
  const tenantUser = await resolveTenantUser(session.userId, currentTenantId);
  const allowedUserIds = Array.from(new Set([session.userId, tenantUser?.id].filter(Boolean) as string[]));

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      status: true,
      userId: true,
      tenantId: true,
      orderId: true,
      user: {
        select: {
          email: true,
        },
      },
      order: {
        select: {
          id: true,
          numericId: true,
          status: true,
          charge: true,
          createdAt: true,
          service: { select: { name: true } },
        },
      },
    },
  });

  const isTicketOwner = Boolean(ticket && allowedUserIds.includes(ticket.userId));

  if (!ticket || !isTicketOwner || ticket.tenantId !== currentTenantId) {
    redirect('/dashboard/tickets');
  }

  // 1. Fetch user's 3 most recent CLOSED tickets strictly for current tenant
  const historicalTickets = await db.ticket.findMany({
    where: {
      userId: { in: allowedUserIds },
      tenantId: currentTenantId,
      status: 'CLOSED',
      id: { not: id },
    },
    orderBy: { updatedAt: 'desc' },
    take: 3,
    include: {
      messages: {
        where: { sender: { not: 'INTERNAL' } },
        orderBy: { createdAt: 'asc' },
        include: {
          replyTo: true,
          attachments: true,
          order: {
            select: {
              id: true,
              numericId: true,
              status: true,
              charge: true,
              createdAt: true,
              service: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  // 2. Fetch only the latest 50 messages of the active ticket
  const rawMessages = await db.ticketMessage.findMany({
    where: {
      ticketId: id,
      sender: { not: 'INTERNAL' },
    },
    orderBy: { createdAt: 'desc' },
    take: 51,
    include: {
      replyTo: true,
      attachments: true,
      order: {
        select: {
          id: true,
          numericId: true,
          status: true,
          charge: true,
          createdAt: true,
          service: { select: { name: true } },
        },
      },
    },
  });

  const { messages: initialActiveMessages, nextCursor } = mapActiveMessages(rawMessages);
  const mappedHistoricalMessages = mapHistoricalMessages(historicalTickets);
  const initialMessages = [...mappedHistoricalMessages, ...initialActiveMessages];

  // 3. Fetch client's 5 most recent orders for context mapping dropdown within current tenant
  const initialOrders = await db.order.findMany({
    where: { userId: { in: allowedUserIds }, tenantId: currentTenantId },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      numericId: true,
      createdAt: true,
      status: true,
      charge: true,
      service: { select: { name: true } },
    },
  });

  const formattedOrders = mapInitialOrders(initialOrders);
  const isClosed = ticket.status === 'CLOSED';
  const sla = getSupportSlaInfo();

  return (
    <div className="space-y-4 animate-in fade-in duration-500 flex flex-col h-[calc(100dvh-13rem)] md:h-[calc(100dvh-7rem)] min-h-[350px] md:min-h-[500px]">
      <TicketChatHeader ticket={ticket} sla={sla} />

      {ticket.order && <TicketLinkedOrderCard order={ticket.order} />}

      {/* Chat messages using premium ChatWindow */}
      <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-0 shadow-sm">
        <ChatWindow
          ticketId={ticket.id}
          initialMessages={initialMessages}
          isStaff={false}
          onSendMessage={addTicketMessage}
          initialNextCursor={nextCursor}
          isClosed={isClosed}
          initialOrders={formattedOrders}
          clientEmail={ticket.user.email}
        />
      </div>
    </div>
  );
}
