"use client";

import { motion } from "framer-motion";
import { IconSparkles, IconShieldCheck, IconTrendingUp, IconDiamond } from "@tabler/icons-react";

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
        
        {/* Card 1: Large Span */}
        <div className="md:col-span-2 bg-content1 rounded-[2rem] p-8 relative overflow-hidden group border border-border/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/15 rounded-full blur-3xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 -translate-y-1/2 translate-x-1/2 dark:bg-primary/10" />
          <div className="relative z-10 flex flex-col h-full h-full">
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

        {/* Card 2: Small Span */}
        <div className="md:col-span-1 bg-primary/10 dark:bg-content2 rounded-[2rem] p-8 relative overflow-hidden group hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 border border-primary/20 dark:border-border/40">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 dark:opacity-10" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-12 h-12 bg-primary/20 dark:bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
              <IconTrendingUp className="w-6 h-6" stroke={1.5} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Оптовые цены</h3>
            <p className="text-muted-foreground font-medium leading-relaxed">
              Мы работаем напрямую с крупными поставщиками, обеспечивая лучшие цены на рынке для бизнеса и реселлеров.
            </p>
          </div>
        </div>

        {/* Card 3: Small Span */}
        <div className="md:col-span-1 bg-content1 rounded-[2rem] p-8 relative overflow-hidden group border border-border/50 dark:border-border/40 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300">
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform dark:bg-emerald-500/10">
              <IconShieldCheck className="w-6 h-6" stroke={1.5} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Прозрачные условия</h3>
            <p className="text-muted-foreground font-medium leading-relaxed">
              Никаких скрытых условий. Вы получаете ровно то качество и ту скорость, которые указаны в описании услуги.
            </p>
          </div>
        </div>

        {/* Card 4: Large Span */}
        <div className="md:col-span-2 bg-content1 rounded-[2rem] p-8 relative overflow-hidden group border border-border/50 dark:border-border/40 hover:shadow-2xl hover:shadow-rose-500/10 transition-all duration-300">
           <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-rose-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 dark:from-rose-500/5" />
           <div className="relative z-10 flex flex-col justify-end h-full">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform dark:bg-rose-500/10">
              <IconDiamond className="w-6 h-6" stroke={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">Программа лояльности VIP</h3>
            <p className="text-muted-foreground font-medium leading-relaxed max-w-lg">
              Чем больше массивных заказов вы оформляете — тем ниже персональные цены. 
              Достигайте новых уровней и получайте скидки до 15% на весь каталог услуг пожизненно.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
