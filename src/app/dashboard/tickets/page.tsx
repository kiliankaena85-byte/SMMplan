import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Clock, CheckCheck, AlertCircle } from 'lucide-react';
import { TicketCreateForm } from '@/components/client/ticket-create-form';

export const dynamic = 'force-dynamic';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  OPEN:    { label: 'Открыт',      color: 'text-rose-700 bg-rose-50 border-rose-200' },
  PENDING: { label: 'Ожидает вас', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  CLOSED:  { label: 'Закрыт',      color: 'text-muted-foreground bg-muted border-border' },
};



export default async function ClientTicketsPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const tickets = await db.ticket.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  const openTicket = tickets.find(t => t.status !== 'CLOSED');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Поддержка</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Вопросы по заказам и платежам — ответим в течение 24 часов
          </p>
        </div>
      </div>

      {/* Active ticket notice */}
      {openTicket && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 mb-0.5">
              Есть открытый тикет
            </p>
            <p className="text-xs text-amber-700">
              Сначала закройте текущий тикет, чтобы создать новый.
            </p>
          </div>
          <Link
            href={`/dashboard/tickets/${openTicket.id}`}
            aria-label={`Открыть тикет: ${openTicket.subject}`}
            className="px-3 py-1.5 text-xs font-semibold border border-amber-600 text-amber-700 rounded-xl hover:bg-amber-50 transition-all duration-200 shrink-0 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            Открыть →
          </Link>
        </div>
      )}

      {/* Create ticket form */}
      {!openTicket && <TicketCreateForm />}

      {/* Tickets list */}
      {tickets.length > 0 ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {tickets.map((ticket) => {
            const st = STATUS_MAP[ticket.status] || STATUS_MAP.CLOSED;
            return (
              <Link
                key={ticket.id}
                href={`/dashboard/tickets/${ticket.id}`}
                className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-all duration-200 group"
                aria-label={`Тикет: ${ticket.subject}`}
              >
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-200">
                    {ticket.subject}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCheck className="w-3 h-3" />
                      {ticket._count.messages} сообщ.
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ticket.updatedAt.toLocaleDateString('ru-RU', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase shrink-0 ${st.color}`}>
                  {st.label}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Тикетов пока нет</h3>
          <p className="text-sm text-muted-foreground">
            Возникли вопросы? Создайте обращение — мы ответим быстро
          </p>
        </div>
      )}
    </div>
  );
}
