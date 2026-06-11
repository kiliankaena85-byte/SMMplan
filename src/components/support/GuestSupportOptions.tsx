'use client';

import { useActionState } from 'react';
import { createGuestTicketAction } from '@/actions/support/guest';
import { createOfflineTicketAction } from '@/actions/support/offline-ticket';
import { Send, Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface GuestSupportOptionsProps {
  telegramBotUsername: string;
  supportEmail: string;
  defaultEmail?: string;
  defaultMessage?: string;
  defaultName?: string;
  isPaymentError?: boolean;
  serviceId?: string | null;
  errorText?: string | null;
  gateway?: string | null;
  quantity?: string | null;
  url?: string | null;
}

export function GuestSupportOptions({ 
  telegramBotUsername, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  supportEmail,
  defaultEmail,
  defaultMessage,
  defaultName,
  isPaymentError = false,
  serviceId = null,
  errorText = null,
  gateway = null,
  quantity = null,
  url = null
}: GuestSupportOptionsProps) {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId');

  const [state, action, isPending] = useActionState(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (prevState: any, formData: FormData) => {
      if (isPaymentError) {
        return await createOfflineTicketAction({
          serviceId,
          error: errorText || 'Неизвестная ошибка оплаты',
          gateway: gateway || 'yookassa',
          quantity,
          email: formData.get('email') as string,
          name: formData.get('name') as string,
          url,
          message: formData.get('message') as string,
          paymentId,
          orderId
        });
      }
      return await createGuestTicketAction(formData);
    },
    null
  );

  if (state?.success) {
    return (
      <Card className="max-w-2xl mx-auto p-12 flex flex-col items-center text-center gap-6 bg-card/80 backdrop-blur-xl border-border shadow-2xl rounded-[2.5rem]">
        <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center text-success shadow-inner">
          <Check size={48} strokeWidth={3} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-foreground">Запрос отправлен!</h2>
          <p className="text-muted-foreground font-medium max-w-sm">
            Мы получили ваше сообщение и ответим на указанный Email в ближайшее время.
          </p>
        </div>
        <Button 
          asChild 
          intent="secondary" 
          size="lg"
          className="mt-4 rounded-full px-12"
        >
          <Link href="/">Вернуться на главную</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto items-start">
      {/* Telegram Option */}
      <Card className="p-8 bg-card border-border flex flex-col items-center text-center justify-center gap-8 transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 group rounded-[2.5rem] h-full">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110 duration-500">
          <Send size={48} className="text-primary" />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-black text-foreground">Telegram Поддержка</h3>
          <p className="text-muted-foreground text-sm font-medium leading-relaxed">
            Самый быстрый способ получить помощь. Наш бот моментально перенаправит ваш вопрос живому оператору.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="flex h-2 w-2 rounded-full bg-success animate-pulse"></span>
            <span className="text-xs font-bold text-success uppercase tracking-widest">Операторы онлайн</span>
          </div>
        </div>
        <Button
          asChild
          intent="primary"
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-full h-16 text-lg"
        >
          <a href={`https://t.me/${telegramBotUsername}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
            <Send size={24} />
            <span>Написать в Telegram</span>
          </a>
        </Button>
      </Card>

      {/* Email Form Option */}
      <Card className="p-8 bg-card border-border flex flex-col gap-8 rounded-[2.5rem] h-full">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center shrink-0">
            <Mail size={32} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground">Email Запрос</h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ответ в течение 24 часов</p>
          </div>
        </div>

        <form action={action} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="support-guest-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Ваше Имя</label>
            <Input
              id="support-guest-name"
              name="name"
              placeholder="Иван Иванов"
              required
              defaultValue={defaultName}
              className="h-14 rounded-2xl bg-muted/50 border-border focus:bg-card transition-all"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="support-guest-email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Ваш Email</label>
            <Input
              id="support-guest-email"
              name="email"
              type="email"
              placeholder="example@mail.com"
              required
              defaultValue={defaultEmail}
              className="h-14 rounded-2xl bg-muted/50 border-border focus:bg-card transition-all"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="support-guest-message" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Ваш вопрос</label>
            <Textarea
              id="support-guest-message"
              name="message"
              placeholder="Опишите вашу проблему максимально подробно..."
              required
              defaultValue={defaultMessage}
              className="min-h-[160px] rounded-2xl bg-muted/50 border-border focus:bg-card transition-all p-4"
            />
          </div>

          {state?.error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-bold animate-shake">
              {state.error}
            </div>
          )}

          <Button
            type="submit"
            intent="primary"
            size="lg"
            disabled={isPending}
            className="w-full h-16 rounded-full text-lg shadow-xl"
          >
            {isPending ? 'Отправка...' : 'Отправить сообщение'}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center px-4 mt-3">
            Отправляя форму, вы соглашаетесь с{' '}
            <Link href="/legal/privacy" className="text-primary hover:underline">
              Политикой конфиденциальности
            </Link>{' '}
            и{' '}
            <Link href="/legal/terms" className="text-primary hover:underline">
              Пользовательским соглашением
            </Link>
            .
          </p>
        </form>
      </Card>
    </div>
  );
}
