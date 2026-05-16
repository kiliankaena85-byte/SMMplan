import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { notFound, redirect } from 'next/navigation';
import { addTicketMessage } from '@/actions/support/ticket';
import Link from 'next/link';
import { ArrowLeft, Send, Lock } from 'lucide-react';
import { TicketPoller } from '@/components/support/TicketPoller';

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
      messages: {
        where: { sender: { not: 'INTERNAL' } },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          text: true,
          sender: true,
          createdAt: true,
        },
      },
    },
  });

  // Security: ensure ticket belongs to the current user
  if (!ticket || ticket.userId !== session.userId) return notFound();

  const isClosed = ticket.status === 'CLOSED';

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <TicketPoller ticketId={ticket.id} isClosed={isClosed} />
      {/* Header / breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tickets"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
          aria-label="Назад к списку тикетов"
        >
          <ArrowLeft className="w-4 h-4" />
          Поддержка
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
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

      {/* Chat messages */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="space-y-4 p-5 max-h-[60vh] overflow-y-auto">
          {ticket.messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              Сообщений пока нет
            </p>
          )}

          {ticket.messages.map((msg) => {
            const isUser = msg.sender === 'USER';
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    isUser
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                  <div
                    className={`text-[10px] mt-1.5 font-medium opacity-70 ${
                      isUser ? 'text-right' : 'text-left'
                    }`}
                  >
                    {isUser ? 'Вы' : 'Служба поддержки'} ·{' '}
                    {msg.createdAt.toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply form or closed notice */}
        <div className="border-t border-border bg-muted/20 p-4">
          {isClosed ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
              <Lock className="w-4 h-4" />
              Тикет закрыт. Создайте новое обращение если нужна помощь.
            </div>
          ) : (
            <form action={addTicketMessage} className="flex gap-3">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <textarea
                name="message"
                required
                rows={2}
                placeholder="Напишите сообщение..."
                aria-label="Текст сообщения поддержке"
                className="flex-1 rounded-xl border border-border bg-background text-foreground text-sm px-4 py-2.5 outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-none"
              />
              <button
                type="submit"
                aria-label="Отправить сообщение"
                className="self-end px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 shrink-0 flex items-center gap-1.5 text-sm font-semibold"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Отправить</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
