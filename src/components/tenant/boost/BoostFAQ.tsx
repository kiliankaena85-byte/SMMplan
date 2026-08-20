'use client';

import React, { useState } from 'react';

interface FAQItem {
  q: string;
  a: string;
}

export const BoostFAQ: React.FC<{ companyName?: string }> = ({ companyName = 'SMMboost' }) => {
  const faqs: FAQItem[] = [
    {
      q: 'Как быстро запускается заказ после оплаты?',
      a: 'Большинство услуг запускаются в автоматическом режиме в течение 2–15 минут после подтверждения транзакции.',
    },
    {
      q: 'Нужен ли пароль от моего канала или страницы?',
      a: 'Нет, категорически не нужен. Для выполнения заказа требуется только открытая ссылка на канал, группу, профиль или конкретный пост.',
    },
    {
      q: 'Что делать, если произошли списания?',
      a: 'Для тарифов с гарантией действует автоматическая докрутка (Refill). Если показатели снизились, система или оператор поддержки компенсируют разницу бесплатно.',
    },
    {
      q: 'Можно ли оформить заказ без регистрации?',
      a: 'Да, оформление происходит моментально. Аккаунт создается автоматически по указанному Email, куда высылаются данные для входа и чек об оплате.',
    },
    {
      q: 'Какие способы оплаты поддерживаются?',
      a: 'Мы принимаем банковские карты РФ (МИР, Visa, Mastercard), Систему быстрых платежей (СБП), SberPay и популярные криптовалюты.',
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section className="w-full max-w-4xl mx-auto my-12 px-4">
      <div className="text-center mb-8">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
          База знаний
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-foreground mt-2">
          Часто задаваемые вопросы
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Всё, что нужно знать о работе сервиса {companyName}
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;

          return (
            <div
              key={idx}
              className="rounded-2xl border border-border/80 bg-card overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full px-5 py-4 text-left font-semibold text-sm sm:text-base text-foreground flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <span>{faq.q}</span>
                <span className="text-lg font-bold text-muted-foreground transition-transform duration-200" style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}>
                  +
                </span>
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
