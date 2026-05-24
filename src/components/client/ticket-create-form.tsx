"use client";

import { useActionState, useState } from 'react';
import { createTicket } from '@/actions/support/ticket';
import { MessageSquare, Plus, Loader2 } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/confirm-modal';

const inputCls =
  'w-full rounded-xl border border-border bg-background text-foreground text-sm px-4 py-3 ' +
  'outline-none placeholder:text-zinc-500 focus:border-primary ' +
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

const TEMPLATES = [
  {
    title: '📦 Проблема с заказом',
    subject: 'Проблема с заказом #',
    message: 'Здравствуйте!\n\nНомер заказа: #\nСсылка на продвижение: \nУслуга: \n\nПроблема: [Заказ не запускается / Запуск задерживается / Списания / Другое]\n\nПожалуйста, помогите разобраться.',
  },
  {
    title: '💸 Вопрос по оплате',
    subject: 'Вопрос по оплате',
    message: 'Здравствуйте!\n\nЯ совершил оплату на сумму: [Сумма] руб.\nДата и время платежа: [Дата и Время]\nСпособ оплаты: [СБП / Карта / Крипто]\n\nПроблема: Баланс не пополнился. Пожалуйста, проверьте платеж.',
  },
  {
    title: '🤝 Сотрудничество',
    subject: 'Сотрудничество и партнерство',
    message: 'Здравствуйте!\n\nУ меня есть предложение о сотрудничестве / партнерстве.\nМой канал/проект: \n\nДетали предложения: ',
  },
];

export function TicketCreateForm() {
  const [state, formAction, isPending] = useActionState(createTicketAction, null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    if (subject.trim().length > 0 || message.trim().length > 0) {
      setSelectedTemplate(tpl);
      setIsConfirmOpen(true);
      return;
    }
    setSubject(tpl.subject);
    setMessage(tpl.message);
  };

  const handleConfirmTemplate = () => {
    if (selectedTemplate) {
      setSubject(selectedTemplate.subject);
      setMessage(selectedTemplate.message);
    }
    setIsConfirmOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Plus className="w-4 h-4 text-primary" />
        </div>
        <h2 className="font-semibold text-foreground">Новый тикет</h2>
      </div>

      {/* Быстрые шаблоны */}
      <div className="mb-5 space-y-2">
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
          Быстрые шаблоны
        </label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((tpl, idx) => {
            const isActive = subject === tpl.subject && message === tpl.message;
            const parts = tpl.title.split(' ');
            const emoji = parts[0];
            const titleText = parts.slice(1).join(' ');
            return (
              <button
                key={idx}
                type="button"
                onClick={() => applyTemplate(tpl)}
                aria-label={`Применить шаблон: ${titleText}`}
                className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span aria-hidden="true" className="text-sm select-none">{emoji}</span>
                <span>{titleText}</span>
              </button>
            );
          })}
        </div>
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
            value={subject}
            onChange={e => setSubject(e.target.value)}
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
            value={message}
            onChange={e => setMessage(e.target.value)}
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

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setSelectedTemplate(null);
        }}
        onConfirm={handleConfirmTemplate}
        title="Применить шаблон?"
        confirmText="Применить"
      >
        Вы уверены, что хотите применить шаблон? Ваш текущий введенный текст в полях темы и сообщения будет заменен.
      </ConfirmModal>
    </div>
  );
}

