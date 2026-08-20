'use client';

import React from 'react';

export const BoostVsCompetitors: React.FC = () => {
  return (
    <section className="w-full max-w-5xl mx-auto my-12 px-4">
      <div className="text-center mb-8">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
          Сравнение надежности
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-foreground mt-2">
          Как работаем мы vs Другие сервисы
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl mx-auto">
          Прозрачность и безопасность вашего канала и аккаунта — наш ключевой стандарт.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Competitors Column (Negative) */}
        <div className="p-6 rounded-3xl bg-card border border-destructive/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center font-bold text-lg">
              ✕
            </span>
            <div>
              <h3 className="font-bold text-base text-foreground">Другие сервисы</h3>
              <p className="text-xs text-muted-foreground">Нестабильные поставщики и ботнеты</p>
            </div>
          </div>

          <ul className="space-y-3.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <span className="text-destructive font-bold mt-0.5">•</span>
              <span>Резкие скачки активности, приводящие к теневому бану алгоритмов</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-destructive font-bold mt-0.5">•</span>
              <span>Массовые списания подписчиков без гарантии и компенсации</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-destructive font-bold mt-0.5">•</span>
              <span>Шаблонные однотипные боты с пустыми аватарками</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-destructive font-bold mt-0.5">•</span>
              <span>Обязательная регистрация и передача личных паролей</span>
            </li>
          </ul>
        </div>

        {/* Boost Column (Positive) */}
        <div className="p-6 rounded-3xl bg-primary/5 border-2 border-primary/40 shadow-lg shadow-primary/10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase rounded-bl-xl tracking-wider">
            Стандарт 2026
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
              ✓
            </span>
            <div>
              <h3 className="font-bold text-base text-foreground">Платформа SMMboost</h3>
              <p className="text-xs text-muted-foreground">Умные алгоритмы распределения нагрузки</p>
            </div>
          </div>

          <ul className="space-y-3.5 text-sm text-foreground">
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-500 font-bold mt-0.5">✓</span>
              <span><strong>Плавный органический прирост</strong> со скоростью, адаптированной под лимиты соцсетей</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-500 font-bold mt-0.5">✓</span>
              <span><strong>Авто-гарантия и докрутка (Refill)</strong> при любых естественных колебаниях</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-500 font-bold mt-0.5">✓</span>
              <span><strong>Качественные заполненные профили</strong> с публикациями, био и реалистичной активностью</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-500 font-bold mt-0.5">✓</span>
              <span><strong>100% конфиденциальность</strong> — никаких паролей, старт по публичной ссылке</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};
