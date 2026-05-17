"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  IconSparkles, 
  IconShieldCheck, 
  IconTrendingUp, 
  IconDiamond, 
  IconTerminal2, 
  IconFileSpreadsheet, 
  IconArrowUpRight 
} from "@tabler/icons-react";

export function WhyUs({ companyName = "Smmplan" }: { companyName?: string }) {
  return (
    <section aria-labelledby="why-us-heading" className="mx-auto max-w-6xl px-4 py-24">
      <div className="text-center mb-16">
        <h2 id="why-us-heading" className="text-4xl font-extrabold tracking-tight text-foreground mb-4">
          Платформа нового поколения
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
          Более 10 000 клиентов доверяют {companyName} своё продвижение не просто так. Мы переосмыслили B2B опыт накрутки.
        </p>
      </div>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
        
        {/* Card 1: Large Span AI Selection */}
        <div className="md:col-span-2 bg-content1 rounded-[2rem] p-8 relative overflow-hidden group border border-border/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/15 rounded-full blur-3xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 -translate-y-1/2 translate-x-1/2 dark:bg-primary/10" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform dark:bg-primary/10">
                <IconSparkles className="w-6 h-6" stroke={1.5} />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">AI-подбор услуг</h3>
              <p className="text-muted-foreground font-medium leading-relaxed max-w-md">
                Вам больше не нужно разбираться в десятках категорий. Просто вставьте ссылку — наша система 
                автоматически определит платформу (Telegram, VK, YT) и сама подберёт оптимальный пакет продвижения.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Small Span Transparent Conditions */}
        <div className="md:col-span-1 bg-content1 rounded-[2rem] p-8 relative overflow-hidden group border border-border/50 dark:border-border/40 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300">
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform dark:bg-emerald-500/10">
              <IconShieldCheck className="w-6 h-6" stroke={1.5} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Прозрачные условия</h3>
            <p className="text-muted-foreground font-medium leading-relaxed text-sm">
              Никаких скрытых условий. Вы получаете ровно то качество и ту скорость, которые указаны в описании услуги.
            </p>
          </div>
        </div>

        {/* Card 3: Small Span Loyalty */}
        <div className="md:col-span-1 bg-content1 rounded-[2rem] p-8 relative overflow-hidden group border border-border/50 dark:border-border/40 hover:shadow-2xl hover:shadow-rose-500/10 transition-all duration-300">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform dark:bg-rose-500/10">
                <IconDiamond className="w-6 h-6" stroke={1.5} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Персональные скидки</h3>
              <p className="text-muted-foreground font-medium leading-relaxed text-sm">
                Получайте накопительные скидки в зависимости от вашего объема заказов. Автоматический расчет скидки в корзине.
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Large B2B Reseller Suite & API Hub Card */}
        <div className="md:col-span-2 bg-slate-900 dark:bg-slate-950 border border-indigo-500/20 text-white rounded-[2rem] p-8 relative overflow-hidden group shadow-2xl transition-all duration-300 hover:shadow-indigo-500/10">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-full blur-3xl opacity-60 group-hover:opacity-90 group-hover:scale-110 transition-all duration-500 -translate-y-1/3 translate-x-1/3" />
          
          {/* Grid Mesh Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <IconTerminal2 className="w-5 h-5" stroke={1.5} />
                </div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">B2B Интеграция</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Решения для Реселлеров & API Hub</h3>
              
              {/* Triple-Hook Feature List */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div className="flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                  <IconFileSpreadsheet className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" stroke={1.5} />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Массовый заказ</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Умный Excel-парсер с автоочисткой ссылок</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                  <IconTerminal2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" stroke={1.5} />
                  <div>
                    <h4 className="text-sm font-semibold text-white">PerfectPanel API</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Спецификация v2 для автоматизации</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                  <IconDiamond className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" stroke={1.5} />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Wholesale Цены</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Накопительный дисконт до 15% пожизненно</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom CTA bar */}
            <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
              <p className="text-xs text-slate-400">
                Запустите свой SMM-бизнес за 5 минут без требований к минимальному балансу.
              </p>
              <Link 
                href="/auth/register?role=reseller&promo=B2BSTART"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white text-xs font-extrabold shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shrink-0"
              >
                <span>Кабинет Реселлера</span>
                <IconArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
