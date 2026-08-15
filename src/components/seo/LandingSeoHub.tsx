import React from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Zap, ArrowRight, HelpCircle, Sparkles, CreditCard, Clock, Award, Star } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";

export interface LandingSeoHubProps {
  networkName: string;
  networkSlug: string;
  categoryName?: string;
  categorySlug?: string;
  minPrice?: number;
  servicesCount?: number;
  siteName?: string;
  host?: string;
  relatedCategories?: Array<{ id: string; name: string; slug: string }>;
  relatedNetworks?: Array<{ id: string; name: string; slug: string }>;
}

export function LandingSeoHub({
  networkName,
  networkSlug,
  categoryName,
  categorySlug,
  minPrice = 0.01,
  servicesCount = 10,
  siteName = "SMMplan",
  host = "smmplan.pro",
  relatedCategories = [],
  relatedNetworks = []
}: LandingSeoHubProps) {
  const currentTitle = categoryName ? `${categoryName} в ${networkName}` : `Продвижение в ${networkName}`;
  const targetEntity = categoryName ? categoryName.toLowerCase() : "услуги продвижения";
  const formattedMinPrice = minPrice.toFixed(4);

  // HowTo Schema for Search Snippets
  const howToData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": `Как заказать ${targetEntity} в ${networkName}`,
    "description": `Пошаговая инструкция по безопасному оформлению заказа ${targetEntity} в ${networkName} на платформе ${siteName}.`,
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Укажите ссылку",
        "text": `Вставьте публичную ссылку на ваш открытый профиль, канал или публикацию в ${networkName}. Пароли и доступы не требуются.`
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Выберите количество",
        "text": `Укажите необходимое количество единиц (от 1 штуки). Система автоматически рассчитает итоговую стоимость по оптовому тарифу.`
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Оплатите заказ",
        "text": `Совершите оплату через СБП, банковскую карту РФ или баланс. Выполнение заказа начнется автоматически в течение 1 минуты.`
      }
    ]
  };

  return (
    <div className="w-full space-y-12 md:space-y-16 pt-8 pb-12 font-sans text-foreground">
      <JsonLd data={howToData} />

      {/* ── 1. СРАВНИТЕЛЬНАЯ ТАБЛИЦА ТАРИФОВ (LSI COMPARISON TABLE) ── */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
            <Award className="w-3.5 h-3.5" />
            <span>Сравнение классов тарифов</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Какой тариф выбрать для {networkName}?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Мы разделяем услуги по качеству аудитории, скорости и наличию гарантии
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Эконом */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Эконом / Базовый</span>
                <h3 className="text-xl font-black text-foreground">Быстрый старт</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Идеально для первичного визуального объема и создания массового эффекта популярности.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Старт: 1–15 минут</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Скорость: до 20 000 / сут</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Аудитория: Смешанная (World/Bot)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>Гарантия: Стандартная</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">Цена от</span>
                <span className="text-lg font-black text-foreground font-mono">{formattedMinPrice} ₽</span>
                <span className="text-[10px] text-muted-foreground"> / шт</span>
              </div>
              <a href="#main-content" className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground transition-all">
                Выбрать
              </a>
            </div>
          </div>

          {/* Стандарт (Популярный) */}
          <div className="bg-card border-2 border-primary rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-sm">
              Хит продаж
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Офферы РФ и СНГ</span>
                <h3 className="text-xl font-black text-foreground">Стандарт + Гарантия</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Реальные аккаунты с аватарками и постами. Защита от списаний с автоматической докруткой.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Старт: Мгновенно (30 сек)</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Плавное начисление без всплесков</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Аудитория: Качественные профили РФ/СНГ</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <span>Гарантия Refill: 30–60 дней</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">Цена от</span>
                <span className="text-xl font-black text-primary font-mono">{(minPrice * 1.5).toFixed(4)} ₽</span>
                <span className="text-[10px] text-muted-foreground"> / шт</span>
              </div>
              <a href="#main-content" className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm">
                Заказать
              </a>
            </div>
          </div>

          {/* Премиум */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Максимум качества</span>
                <h3 className="text-xl font-black text-foreground">Премиум HQ</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Живая активная аудитория. Максимальный траст для алгоритмов ранжирования и рекомендаций.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Старт: Плавный безопасный запуск</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Просмотры историй и активность</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Списания: 0% (Бессрочная гарантия)</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Полный иммунитет от фильтров</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">Цена от</span>
                <span className="text-lg font-black text-foreground font-mono">{(minPrice * 2.8).toFixed(4)} ₽</span>
                <span className="text-[10px] text-muted-foreground"> / шт</span>
              </div>
              <a href="#main-content" className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground transition-all">
                Выбрать
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. AEO FACTBOX & СПЕЦИФИКАЦИЯ ДЛЯ НЕЙРОСЕТЕЙ И ПОИСКОВИКОВ ── */}
      <section className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">AEO Спецификация</span>
            <h2 className="text-xl sm:text-2xl font-black text-foreground">
              Характеристики услуги: {currentTitle}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-secondary px-3 py-1.5 rounded-xl w-fit">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Верифицировано {siteName}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-1">
            <span className="text-muted-foreground block text-[11px]">Минимальный объем</span>
            <span className="font-extrabold text-foreground text-sm">от 1–10 шт.</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-1">
            <span className="text-muted-foreground block text-[11px]">Скорость запуска</span>
            <span className="font-extrabold text-foreground text-sm">от 30 секунд</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-1">
            <span className="text-muted-foreground block text-[11px]">Приватность</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">100% Без пароля</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-1">
            <span className="text-muted-foreground block text-[11px]">Гарантия от списаний</span>
            <span className="font-extrabold text-foreground text-sm">До 90 дней (Refill)</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-1">
            <span className="text-muted-foreground block text-[11px]">Платформа</span>
            <span className="font-extrabold text-foreground text-sm">{networkName}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-1">
            <span className="text-muted-foreground block text-[11px]">Способы оплаты</span>
            <span className="font-extrabold text-foreground text-sm">МИР, СБП, Карты</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-1">
            <span className="text-muted-foreground block text-[11px]">Фискальный чек</span>
            <span className="font-extrabold text-foreground text-sm">54-ФЗ Онлайн</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-1">
            <span className="text-muted-foreground block text-[11px]">Рейтинг пользователей</span>
            <div className="flex items-center gap-1 font-extrabold text-foreground text-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>4.95 / 5.0</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. ПОШАГОВАЯ ИНСТРУКЦИЯ (HOWTO SCHEMA) ── */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Простой процесс</span>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground">
            Как заказать {targetEntity} за 3 шага
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-lg">
              1
            </div>
            <h3 className="font-extrabold text-foreground text-base">Скопируйте ссылку</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Откройте {networkName}, скопируйте публичную ссылку на профиль, группу, канал или конкретный пост. Аккаунт должен быть открытым.
            </p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-lg">
              2
            </div>
            <h3 className="font-extrabold text-foreground text-base">Выберите объем</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Вставьте ссылку в форму выше и укажите нужное количество. Стоимость пересчитается мгновенно с учетом скидки за объем.
            </p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-lg">
              3
            </div>
            <h3 className="font-extrabold text-foreground text-base">Оплатите без комиссии</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Выберите оплату через СБП, картой МИР или электронным кошельком. Запуск начнется автоматически сразу после подтверждения.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. LSI ЭКСПЕРТНЫЙ БЛОК (СЕО-ТЕКСТ ДЛЯ ЯНДЕКСА И GOOGLE) ── */}
      <section className="bg-card border border-border rounded-3xl p-6 md:p-10 shadow-sm space-y-6">
        <div className="space-y-3 max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-black text-foreground">
            Преимущества продвижения {targetEntity} в {networkName}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Платформа {siteName} предоставляет прямой доступ к оптовым шлюзам накрутки и продвижения. Мы исключаем наценки посредников, гарантируя высокую скорость доставки и безопасность вашего профиля.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-xs">
          <div className="space-y-2">
            <h3 className="font-extrabold text-foreground text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Влияние на умную ленту и охваты
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Алгоритмы {networkName} оценивают социальное доказательство и темп набора активности. Увеличение показателей выводит контент в рекомендации, повышая органический приток живых клиентов.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-extrabold text-foreground text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Белые методы без риска блокировки
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Мы используем плавное начисление и соблюдаем внутренние суточные лимиты платформы {networkName}. Это обеспечивает 100% естественный профиль активности без подозрительных всплесков.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. SILO CROSS-LINKING & ТЕГИ ПЕРЕЛИНКОВКИ ── */}
      <section className="space-y-6 pt-4">
        <div className="border-b border-border pb-3">
          <h2 className="text-lg sm:text-xl font-black text-foreground">
            Популярные направления продвижения
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Быстрый переход к сопутствующим услугам и другим социальным сетям
          </p>
        </div>

        {/* Смежные категории текущей сети */}
        {relatedCategories.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted-foreground block">Другие услуги в {networkName}:</span>
            <div className="flex flex-wrap gap-2">
              {relatedCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/services/${networkSlug}/${cat.slug}`}
                  className="px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-primary/10 border border-border hover:border-primary/40 text-xs font-bold text-foreground hover:text-primary transition-all duration-200"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Другие соцсети */}
        {relatedNetworks.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-muted-foreground block">Продвижение в других соцсетях:</span>
            <div className="flex flex-wrap gap-2">
              {relatedNetworks.map((net) => (
                <Link
                  key={net.id}
                  href={`/services/${net.slug}`}
                  className="px-3.5 py-1.5 rounded-xl bg-card hover:bg-secondary border border-border text-xs font-bold text-foreground transition-all duration-200"
                >
                  {net.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── 6. КОММЕРЧЕСКИЕ ПЛАТЕЖНЫЕ ЛОГОТИПЫ (ДОВЕРИЕ ЯНДЕКСА) ── */}
      <div className="pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-3 font-semibold">
          <CreditCard className="w-4 h-4 text-primary" />
          <span>Безопасная оплата: МИР, СБП, Visa, Mastercard, T-Pay, SberPay</span>
        </div>
        <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Электронный чек 54-ФЗ на email</span>
        </div>
      </div>
    </div>
  );
}
