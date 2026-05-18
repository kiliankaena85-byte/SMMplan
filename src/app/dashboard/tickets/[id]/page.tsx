import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { notFound, redirect } from 'next/navigation';
import { addTicketMessage } from '@/actions/support/ticket';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ChatWindow from '@/components/support/ChatWindow';

export const dynamic = 'force-dynamic';

export default async function ClientTicketChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      status: true,
      userId: true,
    },
  });

  if (!ticket || ticket.userId !== session.userId) return notFound();

  // Fetch only the latest 50 messages, check if there is a 51st (next page)
  const rawMessages = await db.ticketMessage.findMany({
    where: { 
      ticketId: id,
      sender: { not: 'INTERNAL' }
    },
    orderBy: { createdAt: 'desc' },
    take: 51,
    include: { replyTo: true, attachments: true }
  });

  let nextCursor: string | null = null;
  const activeMessages = [...rawMessages];
  if (activeMessages.length > 50) {
    const extraItem = activeMessages.pop();
    nextCursor = extraItem?.id || null;
  }
  activeMessages.reverse();

  const initialMessages = activeMessages.map(m => ({
    id: m.id,
    sender: m.sender,
    text: m.text,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    createdAt: m.createdAt.toISOString(),
    isDeleted: m.isDeleted,
    isEdited: m.isEdited,
    originalText: m.originalText,
    replyTo: m.replyTo ? {
      id: m.replyTo.id,
      text: m.replyTo.text,
      sender: m.replyTo.sender
    } : null,
    attachments: m.attachments.map(a => ({
      id: a.id,
      url: a.url,
      type: a.type,
      mimeType: a.mimeType,
      name: a.name,
      size: a.size,
      createdAt: a.createdAt.toISOString()
    }))
  }));

  const isClosed = ticket.status === 'CLOSED';

  return (
    <div className="space-y-4 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-7rem)] min-h-[500px]">
      {/* Header / breadcrumb */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/dashboard/tickets"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
          aria-label="Назад к списку тикетов"
        >
          <ArrowLeft className="w-4 h-4" />
          Поддержка
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3 shrink-0">
        <h1 className="text-xl font-bold text-foreground leading-tight">
          {ticket.subject}
        </h1>
        <span
          className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border uppercase ${
            ticket.status === 'OPEN'
              ? 'text-rose-700 bg-rose-50 border-rose-200'
              : ticket.status === 'PENDING'
              ? 'text-amber-700 bg-amber-50 border-amber-200'
              : 'text-muted-foreground bg-muted border-border'
          }`}
        >
          {ticket.status === 'OPEN'    ? 'Открыт'
           : ticket.status === 'PENDING' ? 'Ожидает вас'
           : 'Закрыт'}
        </span>
      </div>

      {/* Chat messages using premium ChatWindow */}
      <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-0 shadow-sm">
        <ChatWindow
          ticketId={ticket.id}
          initialMessages={initialMessages}
          isStaff={false}
          onSendMessage={addTicketMessage}
          initialNextCursor={nextCursor}
          isClosed={isClosed}
        />
      </div>
    </div>
  );
}
