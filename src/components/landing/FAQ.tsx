'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQ_ITEMS = [
  {
    q: 'Как оформить заказ?',
    a: 'Выберите платформу, тип услуги и количество. Укажите email — заказ запустится автоматически после оплаты. Если алгоритм требует уточнения, он запросит его до старта.',
  },
  {
    q: 'Нужна ли регистрация?',
    a: 'Нет. Мы ценим ваше время. При первой покупке просто укажите email — Smmplan автоматически сгенерирует для вас безопасный личный кабинет бизнес-класса.',
  },
  {
    q: 'Какие способы оплаты доступны?',
    a: 'Все популярные методы: Банковские карты (Visa, MasterCard, МИР), система быстрых платежей (СБП) без комиссии, а также эквайринг криптовалют через CryptoBot.',
  },
  {
    q: 'Безопасна ли накрутка для аккаунта?',
    a: 'Абсолютно. Алгоритм Drip-Feed эмулирует органику — подписчики приходят каскадно. Мы используем профили высокого качества, неотличимые от живых людей.',
  },
  {
    q: 'Что если будут отписки?',
    a: 'На услуги с пометкой 🛡️ действует автоматическая гарантия сети. Наш мониторинг отслеживает баланс и восполняет любые отклонения бесплатно на протяжении всего гарантийного периода.',
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" aria-labelledby="faq-heading" className="mx-auto max-w-3xl px-4 sm:px-6 py-24">
      <div className="text-center mb-12">
        <h2 id="faq-heading" className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
          Частые вопросы
        </h2>
        <p className="text-slate-500 text-lg font-medium mt-2">
          Всё, что нужно знать перед тем, как ваш бренд взлетит
        </p>
      </div>

      <div className="space-y-4">
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-sky-500/30 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300"
          >
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              aria-controls={`faq-answer-${i}`}
              className="w-full text-left px-6 py-5 flex justify-between items-center gap-4"
            >
              <span className="text-base font-bold text-slate-900">{item.q}</span>
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${open === i ? 'bg-sky-50' : 'bg-slate-50'}`}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${
                    open === i ? 'rotate-180 text-sky-500' : 'text-slate-400'
                  }`}
                />
              </div>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  id={`faq-answer-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 pr-12 -mt-1">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.a}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}
