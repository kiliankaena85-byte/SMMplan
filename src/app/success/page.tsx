import Link from 'next/link';
import { CheckCircle2, ShoppingCart, LayoutDashboard, MessageSquare } from 'lucide-react';

export const metadata = {
  title: 'Оплата прошла успешно | Smmplan',
  description: 'Ваш заказ оформлен и скоро будет запущен',
};

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping opacity-20" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-foreground">Оплата прошла!</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Заказ принят и поставлен в очередь на выполнение.
            Обычно запуск происходит в течение <strong className="text-foreground">1–5 минут</strong>.
          </p>
        </div>

        {/* Steps */}
        <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Что дальше?
          </p>
          {[
            { step: '1', text: 'Заказ передан провайдеру' },
            { step: '2', text: 'Начнётся выполнение в течение нескольких минут' },
            { step: '3', text: 'Следите за статусом в разделе «Мои заказы»' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {step}
              </div>
              <p className="text-sm text-foreground">{text}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 gap-3">
          <Link
            href="/dashboard/orders"
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all duration-200 shadow-sm"
            aria-label="Перейти к моим заказам"
          >
            <LayoutDashboard className="w-4 h-4" />
            Мои заказы
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/new-order"
              className="flex items-center justify-center gap-2 py-3 bg-card border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted transition-all duration-200"
              aria-label="Создать ещё один заказ"
            >
              <ShoppingCart className="w-4 h-4" />
              Новый заказ
            </Link>
            <Link
              href="/dashboard/tickets"
              className="flex items-center justify-center gap-2 py-3 bg-card border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted transition-all duration-200"
              aria-label="Написать в поддержку"
            >
              <MessageSquare className="w-4 h-4" />
              Поддержка
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground">
          Чек об оплате будет выслан на ваш email.
          Если возникнут вопросы — напишите в поддержку.
        </p>
      </div>
    </div>
  );
}
