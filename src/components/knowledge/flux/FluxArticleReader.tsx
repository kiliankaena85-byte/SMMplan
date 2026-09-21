'use client';

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Calendar, 
  Eye, 
  Sparkles, 
  MessageSquare, 
  Zap, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  Share2, 
  Copy,
  Plus,
  Minus,
  Calculator,
  ShieldCheck,
  TrendingUp,
  FileText,
  Building2
} from "lucide-react";
import { toast } from "sonner";

interface ArticleItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  viewCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface RelatedArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
}

interface ServiceItem {
  id: string;
  name: string;
  categoryName: string;
  pricePerUnitRub: number;
  targetType?: string;
  minQty?: number;
}

interface FluxArticleReaderProps {
  article: ArticleItem;
  sanitizedHtml?: string;
  renderedMarkdown: React.ReactNode;
  relatedArticles: RelatedArticle[];
  recommendedServices?: ServiceItem[];
  allCategoryServices?: ServiceItem[];
  siteName?: string;
}

export function FluxArticleReader({
  article,
  sanitizedHtml,
  renderedMarkdown,
  relatedArticles,
  recommendedServices = [],
  allCategoryServices = [],
}: FluxArticleReaderProps) {
  const dateStr = new Date(article.createdAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Combine available services for the interactive express calculator
  const servicesList = useMemo(() => {
    if (allCategoryServices && allCategoryServices.length > 0) {
      return allCategoryServices;
    }
    if (recommendedServices && recommendedServices.length > 0) {
      return recommendedServices;
    }
    return [
      {
        id: "default-tg-sub",
        name: "Подписчики Telegram (Быстрый старт, Refill 30)",
        categoryName: "Telegram",
        pricePerUnitRub: 0.18,
        targetType: "CHANNEL",
        minQty: 10,
      },
      {
        id: "default-tg-views",
        name: "Просмотры постов Telegram (Drip-Feed)",
        categoryName: "Telegram",
        pricePerUnitRub: 0.02,
        targetType: "POST",
        minQty: 50,
      },
    ];
  }, [allCategoryServices, recommendedServices]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    servicesList[0]?.id || ""
  );

  const activeService = useMemo(() => {
    return servicesList.find((s) => s.id === selectedServiceId) || servicesList[0];
  }, [servicesList, selectedServiceId]);

  const minVolume = activeService?.minQty || 10;
  const [quantity, setQuantity] = useState<number>(Math.max(minVolume, 100));

  const handleQuantityChange = (newVal: number) => {
    const clamped = Math.max(minVolume, newVal);
    setQuantity(clamped);
  };

  const totalCostRub = useMemo(() => {
    if (!activeService) return 0;
    return quantity * activeService.pricePerUnitRub;
  }, [quantity, activeService]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      
      {/* ── Breadcrumbs & Back Navigation ── */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/knowledge"
          className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card/85 backdrop-blur-xl border border-border/80 text-foreground hover:text-purple-600 hover:border-purple-400/60 text-xs sm:text-sm font-bold transition-all shadow-sm group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-purple-600" />
          <span>Все материалы базы знаний</span>
        </Link>

        <div className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-pink-500" />
          <span>FLUX Media Lab</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── Main Article Reader Container (8 cols) ── */}
        <article className="lg:col-span-8 rounded-[2.5rem] bg-card/90 backdrop-blur-2xl border border-border/80 p-6 sm:p-10 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.05)] space-y-8 overflow-hidden relative">
          {/* Internal gradient glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 blur-[100px] rounded-full pointer-events-none" />

          {/* Header Metadata Chips */}
          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25">
              {article.category}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              <time dateTime={new Date(article.createdAt).toISOString()}>{dateStr}</time>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Eye className="w-3.5 h-3.5 text-purple-500" />
              <span>{article.viewCount} просмотров</span>
            </div>
          </div>

          {/* Article Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight relative z-10">
            {article.title}
          </h1>

          {/* Summary / Lead */}
          {article.description && (
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground font-medium leading-relaxed bg-muted/40 p-6 rounded-2xl border border-border/60 relative z-10">
              {article.description}
            </p>
          )}

          {/* Article Content: Handles HTML markup or Markdown */}
          <div className="prose dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-purple-600 prose-img:rounded-3xl relative z-10 text-sm sm:text-base leading-relaxed">
            {sanitizedHtml ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            ) : (
              renderedMarkdown
            )}
          </div>

          {/* Tailored Inbound Pre-lander Conversion Banners */}
          {article.slug === "guide-bloggers-telega-in-tgstat" && (
            <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border border-purple-500/25 space-y-4">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-extrabold text-xs uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>Быстрый тест для прохождения модерации в Telega.in</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-foreground">
                Подготовьте свой канал к продаже рекламы без метки в TGStat
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Начните с тестового заказа от 1 шт. в SMMflux: используйте капельную подачу Drip-Feed и защиту от оттока Refill 30 дней.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/?serviceId=default-tg-sub"
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs flex items-center justify-center shadow-md hover:opacity-95 transition-opacity"
                >
                  Протестировать Drip-Feed от 1 шт.
                </Link>
                <a
                  href="#express-calculator"
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-card border border-border text-foreground font-semibold text-xs flex items-center justify-center hover:bg-muted transition-colors"
                >
                  Рассчитать бюджет в калькуляторе
                </a>
              </div>
            </div>
          )}

          {article.slug === "guide-marketers-kpi-drip-feed-54fz" && (
            <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 border border-blue-500/25 space-y-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-extrabold text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Закрытие клиентских KPI и официальные чеки 54-ФЗ</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-foreground">
                Полная финансовая прозрачность для сметы digital-маркетолога
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                При каждом пополнении в SMMflux формируется электронный кассовый чек по 54-ФЗ с QR-кодом для клиентской отчетности. Цены строго за 1 штуку в рублях («₽ / шт»).
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/add-funds"
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-md hover:opacity-95 transition-opacity"
                >
                  Пополнить с чеком 54-ФЗ
                </Link>
                <a
                  href="#express-calculator"
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-card border border-border text-foreground font-semibold text-xs flex items-center justify-center hover:bg-muted transition-colors"
                >
                  Рассчитать смету KPI
                </a>
              </div>
            </div>
          )}

          {article.slug === "guide-agencies-beznal-nds22-wholesale" && (
            <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary/10 to-purple-500/10 border border-emerald-500/25 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>B2B Корпоративный шлюз для агентств и юрлиц</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-foreground">
                Оплата по безналичному расчету с расчетного счета юрлица с НДС 22%
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Для агентских договоров, закрывающих УПД через ЭДО (Диадок / СБИС) и единого мультипроектного баланса используйте платформу SMMplan (smmplan.pro).
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/add-funds"
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-primary text-white font-bold text-xs flex items-center justify-center shadow-md hover:opacity-95 transition-opacity"
                >
                  Выставить счет с НДС 22%
                </Link>
                <Link
                  href="/knowledge/guide-agencies-beznal-nds22-wholesale"
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-card border border-border text-foreground font-semibold text-xs flex items-center justify-center hover:bg-muted transition-colors"
                >
                  Условия для агентств на SMMplan
                </Link>
              </div>
            </div>
          )}

          {/* Social Share & Quality Assurance Guarantee */}
          <div className="pt-8 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Проверено редакцией SMMflux</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Ссылка на статью скопирована!");
                  }
                }}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-card border border-border/80 text-foreground hover:border-purple-400 hover:text-purple-600 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Скопировать</span>
              </button>

              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 text-xs font-bold transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Поделиться</span>
              </a>
            </div>
          </div>
        </article>

        {/* ── Sidebar (4 cols) ── */}
        <aside className="lg:col-span-4 space-y-6 sticky top-24 self-start">
          
          {/* ── Interactive Express Calculator Widget ── */}
          <div id="express-calculator" className="rounded-[2.5rem] bg-gradient-to-b from-card/95 to-muted/40 backdrop-blur-xl border border-border/80 p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                <Calculator className="w-3 h-3 text-purple-600" />
                <span>Экспресс-калькулятор</span>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">от 1 шт.</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-foreground">
                Рассчитать стоимость заказа
              </h3>
              <p className="text-xs text-muted-foreground">
                Прозрачные тарифы в рублях за единицу («₽ / шт») без наценок.
              </p>
            </div>

            {/* Service Selection Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="flux-service-select" className="text-xs font-bold text-foreground">
                Выберите тарифную услугу:
              </label>
              <select
                id="flux-service-select"
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value);
                  const s = servicesList.find((item) => item.id === e.target.value);
                  if (s && s.minQty && quantity < s.minQty) {
                    setQuantity(s.minQty);
                  }
                }}
                className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-background border border-border/80 text-foreground font-medium focus:outline-none focus:border-purple-500"
              >
                {servicesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.pricePerUnitRub.toFixed(4)} ₽ / шт
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Stepper */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Объем (шт.):</span>
                <span className="text-muted-foreground">мин. {minVolume} шт.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - (minVolume >= 50 ? 50 : 10))}
                  aria-label="Уменьшить количество"
                  className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={minVolume}
                  step={10}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(Number(e.target.value))}
                  aria-label="Количество единиц услуги"
                  className="min-h-[44px] h-11 flex-1 px-3 text-center rounded-xl bg-background border border-border text-foreground font-bold text-sm focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + (minVolume >= 50 ? 50 : 10))}
                  aria-label="Увеличить количество"
                  className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pricing Summary Block */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Тариф за 1 шт:</span>
                <span className="font-bold text-foreground">
                  {activeService?.pricePerUnitRub.toFixed(4)} ₽ / шт
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                <span className="font-bold text-foreground">Итоговая сумма:</span>
                <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                  {totalCostRub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                </span>
              </div>
            </div>

            {/* Invariants & Badges */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                Refill 30 дней
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                <Zap className="w-3 h-3" />
                Drip-Feed
              </span>
            </div>

            {/* Checkout Link Action */}
            <Link
              href={`/?serviceId=${activeService?.id || ""}&quantity=${quantity}`}
              className="min-h-[44px] w-full py-3.5 rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(168,85,247,0.35)] hover:shadow-[0_6px_25px_rgba(236,72,153,0.45)] hover:-translate-y-0.5 transition-all text-center"
            >
              <Layers className="w-4 h-4" />
              <span>Оформить экспресс-заказ</span>
            </Link>
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="rounded-[2.5rem] bg-card/85 backdrop-blur-xl border border-border/80 p-6 sm:p-7 space-y-4 shadow-sm">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-pink-500" />
                <span>Материалы по теме</span>
              </h3>

              <div className="space-y-3">
                {relatedArticles.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/knowledge/${rel.slug}`}
                    className="min-h-[44px] block p-3.5 rounded-2xl bg-muted/40 border border-transparent hover:border-purple-400/40 hover:bg-purple-500/5 transition-all duration-200 group/rel"
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">
                      {rel.category}
                    </span>
                    <h4 className="text-xs font-bold text-foreground group-hover/rel:text-purple-600 transition-colors mt-1.5 leading-snug">
                      {rel.title}
                    </h4>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Telegram Support Launcher */}
          <div className="rounded-[2.5rem] bg-card/85 backdrop-blur-xl border border-border/80 p-6 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-foreground">Возник вопрос?</h4>
              <p className="text-xs text-muted-foreground">
                Техподдержка ответит в течение 1–2 минут в Telegram.
              </p>
            </div>
            <a
              href="/api/support/telegram"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 text-xs font-bold transition-all w-full"
            >
              Связаться с поддержкой
            </a>
          </div>

        </aside>

      </div>
    </div>
  );
}

