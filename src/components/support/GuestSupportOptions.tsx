'use client';

import { useActionState } from 'react';
import { createGuestTicketAction } from '@/actions/support/guest';
import { IconBrandTelegram, IconMail, IconCheck } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

interface GuestSupportOptionsProps {
  telegramBotUsername: string;
  supportEmail: string;
}

export function GuestSupportOptions({ telegramBotUsername, supportEmail }: GuestSupportOptionsProps) {
  const [state, action, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await createGuestTicketAction(formData);
    },
    null
  );

  if (state?.success) {
    return (
      <Card className="max-w-2xl mx-auto p-12 flex flex-col items-center text-center gap-6 bg-white/80 backdrop-blur-xl border-slate-100 shadow-2xl rounded-[2.5rem]">
        <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner">
          <IconCheck size={48} stroke={3} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900">Запрос отправлен!</h2>
          <p className="text-slate-500 font-medium max-w-sm">
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
      <Card className="p-8 bg-white border-slate-100 flex flex-col items-center text-center justify-center gap-8 transition-all hover:border-sky-200 hover:shadow-2xl hover:shadow-sky-500/10 group rounded-[2.5rem] h-full">
        <div className="w-24 h-24 rounded-full bg-sky-50 flex items-center justify-center transition-transform group-hover:scale-110 duration-500">
          <IconBrandTelegram size={48} className="text-sky-500" />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-black text-slate-900">Telegram Поддержка</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            Самый быстрый способ получить помощь. Наш бот моментально перенаправит ваш вопрос живому оператору.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Операторы онлайн</span>
          </div>
        </div>
        <Button
          asChild
          intent="primary"
          size="lg"
          className="w-full bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/25 rounded-full h-16 text-lg"
        >
          <a href={`https://t.me/${telegramBotUsername}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
            <IconBrandTelegram size={24} />
            <span>Написать в Telegram</span>
          </a>
        </Button>
      </Card>

      {/* Email Form Option */}
      <Card className="p-8 bg-white border-slate-100 flex flex-col gap-8 rounded-[2.5rem] h-full">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
            <IconMail size={32} className="text-slate-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Email Запрос</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ответ в течение 24 часов</p>
          </div>
        </div>

        <form action={action} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Ваше Имя</label>
            <Input
              name="name"
              placeholder="Иван Иванов"
              required
              className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Ваш Email</label>
            <Input
              name="email"
              type="email"
              placeholder="example@mail.com"
              required
              className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Ваш вопрос</label>
            <Textarea
              name="message"
              placeholder="Опишите вашу проблему максимально подробно..."
              required
              className="min-h-[160px] rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all p-4"
            />
          </div>

          {state?.error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-bold animate-shake">
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
        </form>
      </Card>
    </div>
  );
}
