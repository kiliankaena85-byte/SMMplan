'use client';

import React from 'react';

export const BoostTrustStats: React.FC = () => {
  const stats = [
    {
      value: '99.4%',
      label: 'Заказов завершены точно в срок',
      desc: 'Автоматический мониторинг выполнения',
    },
    {
      value: '2 мин',
      label: 'Среднее время старта',
      desc: 'Мгновенный запуск после оплаты',
    },
    {
      value: '0 паролей',
      label: 'Полная безопасность канала',
      desc: 'Нужна только публичная ссылка',
    },
    {
      value: '24 / 7',
      label: 'Поддержка клиентов в Telegram',
      desc: 'Оперативное решение любых вопросов',
    },
  ];

  return (
    <section className="w-full max-w-5xl mx-auto my-10 px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((item, idx) => (
          <div
            key={idx}
            className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 text-center flex flex-col justify-center items-center shadow-xs"
          >
            <span className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
              {item.value}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-foreground mt-1">
              {item.label}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
              {item.desc}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
