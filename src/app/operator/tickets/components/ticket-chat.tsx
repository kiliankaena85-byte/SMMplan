'use client';

import * as React from 'react';
import Link from 'next/link';
import { replyTicketAction } from '@/actions/operator/tickets/reply-ticket.action';
import { changeTicketStatusAction } from '@/actions/operator/tickets/change-status.action';
import { Button } from '@/components/ui/button';
import { FileText, Send, MessageSquare, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender: string;
  text: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  status: 'OPEN' | 'PENDING' | 'CLOSED' | string;
  user: { id: string; email: string };
  messages: Message[];
}

interface TicketChatProps {
  ticket: TicketDetail;
}

const MSG_SENDER_STYLES: Record<string, { bubble: string; text: string; align: string }> = {
  USER: {
    bubble: 'bg-muted/40 border border-border/40 text-foreground rounded-2xl rounded-bl-sm',
    text: 'text-foreground',
    align: 'justify-start',
  },
  STAFF: {
    bubble: 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm shadow-sm',
    text: 'text-primary-foreground',
    align: 'justify-end',
  },
  INTERNAL: {
    bubble: 'bg-warning/10 border border-warning/30 text-warning-foreground rounded-2xl py-3 px-5 text-center max-w-lg mx-auto',
    text: 'text-foreground font-sans leading-relaxed italic',
    align: 'justify-center w-full',
  },
};

export function TicketChat({ ticket }: TicketChatProps) {
  const [replyText, setReplyText] = React.useState('');
  const [isInternal, setIsInternal] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Automatically scroll message window to bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [ticket.messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    startTransition(async () => {
      const res = await replyTicketAction({
        ticketId: ticket.id,
        message: replyText.trim(),
        isInternal,
      });

      if (res.success) {
        setReplyText('');
        setIsInternal(false);
        toast.success('Ответ отправлен');
      } else {
        toast.error(res.error || 'Не удалось отправить сообщение');
      }
    });
  };

  const handleStatusChange = (newStatus: 'OPEN' | 'CLOSED') => {
    startTransition(async () => {
      const res = await changeTicketStatusAction({
        ticketId: ticket.id,
        status: newStatus,
      });

      if (res.success) {
        toast.success(newStatus === 'CLOSED' ? 'Тикет закрыт' : 'Тикет открыт');
      } else {
        toast.error(res.error || 'Не удалось обновить статус');
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background border border-border/40 rounded-2xl ring-1 ring-border/5 overflow-hidden shadow-sm">
      {/* Header Info */}
      <div className="p-4 border-b border-border/40 bg-muted/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 font-sans">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            {ticket.subject}
          </h3>
          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            Клиент:
            <Link
              href={`/operator/users/${ticket.user.id}`}
              className="text-primary hover:underline font-mono"
            >
              {ticket.user.email}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {ticket.status !== 'CLOSED' ? (
            <Button
              size="sm"
              intent="ghost"
              disabled={isPending}
              onClick={() => handleStatusChange('CLOSED')}
              className="h-8 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg flex items-center gap-1 font-bold"
            >
              <X className="w-3.5 h-3.5" />
              Закрыть тикет
            </Button>
          ) : (
            <Button
              size="sm"
              intent="ghost"
              disabled={isPending}
              onClick={() => handleStatusChange('OPEN')}
              className="h-8 text-[11px] text-success hover:bg-success/10 hover:text-success rounded-lg flex items-center gap-1 font-bold"
            >
              <Check className="w-3.5 h-3.5" />
              Открыть заново
            </Button>
          )}
        </div>
      </div>

      {/* Messages Scroll Box */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {ticket.messages.length > 0 ? (
          ticket.messages.map((m) => {
            const style = MSG_SENDER_STYLES[m.sender] || MSG_SENDER_STYLES.USER;
            return (
              <div key={m.id} className={`flex ${style.align}`}>
                <div className={`${style.bubble} max-w-[70%] p-4 text-xs`}>
                  <p className={`${style.text} leading-relaxed break-words font-sans whitespace-pre-wrap`}>
                    {m.text}
                  </p>
                  <div className="text-[9px] opacity-75 font-mono text-right mt-1.5 flex items-center justify-end gap-1.5 select-none">
                    <span>
                      {m.sender === 'USER' ? 'Клиент' : m.sender === 'STAFF' ? 'Служба поддержки' : 'Внутренняя заметка'}
                    </span>
                    <span>•</span>
                    <span>{new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-muted-foreground text-xs leading-relaxed">
            В тикете пока нет сообщений.
          </div>
        )}
      </div>

      {/* Input Message Form */}
      <div className="p-4 border-t border-border/40 bg-muted/10">
        <form onSubmit={handleSendReply} className="space-y-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={isInternal ? 'Введите внутреннюю заметку (клиент её не увидит)...' : 'Напишите сообщение клиенту...'}
            rows={3}
            disabled={isPending}
            className={`w-full p-3 text-xs bg-background border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground leading-relaxed resize-none transition-all ${
              isInternal ? 'border-warning/60 focus:border-warning' : 'border-border/60 focus:border-primary'
            }`}
          />

          <div className="flex items-center justify-between">
            {/* Note Checkbox */}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="w-3.5 h-3.5 accent-warning rounded"
              />
              <FileText className="w-3.5 h-3.5 text-warning-foreground" />
              <span>Внутренняя заметка (для лога)</span>
            </label>

            {/* Send Button */}
            <Button
              type="submit"
              disabled={isPending || !replyText.trim()}
              className="rounded-xl text-xs py-2 px-4 flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              {isInternal ? 'Добавить заметку' : 'Отправить'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
