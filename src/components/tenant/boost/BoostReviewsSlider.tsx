'use client';

import React, { useState } from 'react';

interface Review {
  id: number;
  name: string;
  role: string;
  text: string;
  rating: number;
}

export const BoostReviewsSlider: React.FC = () => {
  const reviews: Review[] = [
    {
      id: 1,
      name: 'Дарья',
      role: 'Владелец Telegram-канала',
      text: 'SMMboost — это настоящее спасение. Периодически беру подписчиков и реакции к новым постам. Статистика растет плавно, рекламодатели довольны охватами!',
      rating: 5,
    },
    {
      id: 2,
      name: 'Олег',
      role: 'Маркетолог агентства',
      text: 'Заказываем репосты и просмотры для клиентов под ключ. Очень радует автоматический запуск за пару минут и то, что не списывается через неделю.',
      rating: 5,
    },
    {
      id: 3,
      name: 'Евгений С.',
      role: 'Автор тематического сообщества VK',
      text: 'Результат превзошел ожидания. Появилась живая активность и комментарии в группе. Простой и понятный выбор тарифов без лишних регистраций.',
      rating: 5,
    },
    {
      id: 4,
      name: 'Оксана',
      role: 'Онлайн-магазин аксессуаров',
      text: 'Нужно было быстро оживить канал для продаж перед праздниками. Брали премиум-пакет — аудитория пришла качественная, заказы пошли в тот же день!',
      rating: 5,
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const prevReview = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const nextReview = () => {
    setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  };

  const current = reviews[currentIndex];

  return (
    <section className="w-full max-w-4xl mx-auto my-12 px-4">
      <div className="text-center mb-6">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
          Отзывы пользователей
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-foreground mt-2">
          Что говорят наши клиенты
        </h2>
      </div>

      <div className="relative p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-lg shadow-black/5 text-center">
        {/* Rating Stars */}
        <div className="flex items-center justify-center gap-1 text-amber-400 mb-4 text-base">
          {'★'.repeat(current.rating)}
        </div>

        {/* Review Quote Text */}
        <p className="text-base sm:text-lg text-foreground font-medium italic max-w-2xl mx-auto mb-6 leading-relaxed">
          «{current.text}»
        </p>

        {/* Author Name */}
        <div>
          <h4 className="font-bold text-foreground text-base">{current.name}</h4>
          <span className="text-xs text-muted-foreground">{current.role}</span>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={prevReview}
            aria-label="Предыдущий отзыв"
            className="w-10 h-10 rounded-full border border-border bg-background hover:bg-muted text-foreground flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            ←
          </button>
          <span className="text-xs text-muted-foreground font-mono">
            {currentIndex + 1} / {reviews.length}
          </span>
          <button
            onClick={nextReview}
            aria-label="Следующий отзыв"
            className="w-10 h-10 rounded-full border border-border bg-background hover:bg-muted text-foreground flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
};
