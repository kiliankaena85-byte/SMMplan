'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'Как оформить заказ?',
    a: 'Выберите платформу, тип услуги и количество. Укажите email — заказ запустится автоматически после оплаты.',
  },
  {
    q: 'Нужна ли регистрация?',
    a: 'Нет. Просто укажите email — мы автоматически создадим аккаунт. Все заказы доступны в личном кабинете.',
  },
  {
    q: 'Какие способы оплаты доступны?',
    a: 'Банковские карты (Visa, MasterCard, МИР), СБП, и криптовалюта через CryptoBot.',
  },
  {
    q: 'Безопасна ли накрутка для аккаунта?',
    a: 'Да. Drip-Feed подача имитирует естественный рост — подписчики приходят постепенно. Безопасно для вашего аккаунта.',
  },
  {
    q: 'Что если будут отписки?',
    a: 'На услуги с гарантией — бесплатная замена в течение гарантийного периода. Система отслеживает отписки автоматически.',
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" aria-labelledby="faq-heading" className="mx-auto max-w-3xl px-4 sm:px-6 py-14">
      <div className="text-center mb-8">
        <h2 id="faq-heading" className="text-2xl font-bold text-foreground">
          Частые вопросы
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          Всё, что нужно знать перед первым заказом
        </p>
      </div>

      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-200"
          >
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              aria-controls={`faq-answer-${i}`}
              className="w-full text-left px-5 py-4 flex justify-between items-center gap-4"
            >
              <span className="text-sm font-semibold text-foreground">{item.q}</span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                  open === i ? 'rotate-180 text-primary' : ''
                }`}
              />
            </button>
            {open === i && (
              <div id={`faq-answer-${i}`} className="px-5 pb-4 -mt-1">
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
