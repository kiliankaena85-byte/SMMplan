'use client';

import { useActionState } from 'react';
import { createTicket } from '@/actions/support/ticket';
import { MessageSquare, Plus, Loader2 } from 'lucide-react';

const inputCls =
  'w-full rounded-xl border border-border bg-background text-foreground text-sm px-4 py-3 ' +
  'outline-none placeholder:text-muted-foreground focus:border-primary ' +
  'focus:ring-2 focus:ring-primary/20 focus-visible:ring-2 focus-visible:ring-primary/30 ' +
  'focus-visible:outline-none transition-all duration-200';

// Wrap createTicket to match useActionState signature (prev, formData) => state
async function createTicketAction(_prev: { error?: string } | null, formData: FormData) {
  try {
    await createTicket(formData);
    return null; // redirect() is called inside — this line is never reached
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e; // propagate redirect
    return { error: e instanceof Error ? e.message : 'Ошибка при создании тикета' };
  }
}

export function TicketCreateForm() {
  const [state, formAction, isPending] = useActionState(createTicketAction, null);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Plus className="w-4 h-4 text-primary" />
        </div>
        <h2 className="font-semibold text-foreground">Новый тикет</h2>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="ticket-subject"
            className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5"
          >
            Тема обращения
          </label>
          <input
            id="ticket-subject"
            name="subject"
            type="text"
            required
            placeholder="Например: Проблема с заказом #1234"
            className={inputCls}
            aria-label="Тема тикета"
            disabled={isPending}
          />
        </div>

        <div>
          <label
            htmlFor="ticket-message"
            className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5"
          >
            Описание проблемы
          </label>
          <textarea
            id="ticket-message"
            name="message"
            required
            rows={4}
            placeholder="Опишите проблему подробно: номер заказа, что произошло, что ожидали..."
            className={`${inputCls} resize-none`}
            aria-label="Описание проблемы"
            disabled={isPending}
          />
        </div>

        {state?.error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5" role="alert">
            {state.error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            aria-label="Отправить обращение в поддержку"
            className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl
              hover:bg-primary/90 disabled:opacity-60 transition-all duration-200 shadow-sm
              flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Отправляем...
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                Отправить обращение
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
