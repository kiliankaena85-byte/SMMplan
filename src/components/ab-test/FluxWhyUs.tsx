import Link from "next/link";
import { 
  Sparkles, 
  ShieldCheck, 
  Diamond, 
  Terminal, 
  FileSpreadsheet, 
  ArrowUpRight 
} from "lucide-react";

export function FluxWhyUs({ companyName = "SMMflux" }: { companyName?: string }) {
  return (
    <section aria-labelledby="why-us-heading" className="mx-auto max-w-6xl px-4 py-12 md:py-24">
      <div className="text-center mb-16">
        <h2 id="why-us-heading" className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4 text-balance">
          Платформа нового поколения
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium text-pretty">
          Более 10 000 клиентов доверяют {companyName} своё продвижение не просто так. Мы переосмыслили B2B опыт продвижения.
        </p>
      </div>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Large Span AI Selection */}
        <div className="md:col-span-2 bg-white dark:bg-content1 rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 min-h-[280px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col justify-between md:h-full">
            <div>
              <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-sm">
                <Sparkles className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">AI-подбор услуг</h3>
              <p className="text-muted-foreground font-medium leading-relaxed max-w-md">
                Вам больше не нужно разбираться в десятках категорий. Просто вставьте ссылку — наша система 
                автоматически определит платформу и сама подберёт оптимальный пакет продвижения.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Small Span Transparent Conditions */}
        <div className="md:col-span-1 bg-white dark:bg-content1 rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 min-h-[240px]">
          <div className="relative z-10 flex flex-col md:h-full">
            <div className="w-14 h-14 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
              <ShieldCheck className="w-7 h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">Прозрачные условия</h3>
            <p className="text-muted-foreground font-medium leading-relaxed text-sm">
              Никаких скрытых условий. Вы получаете ровно то качество и ту скорость, которые указаны в описании услуги.
            </p>
          </div>
        </div>

        {/* Card 3: Small Span Loyalty */}
        <div className="md:col-span-1 bg-white dark:bg-content1 rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 min-h-[240px]">
          <div className="relative z-10 flex flex-col md:h-full justify-between">
            <div>
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                <Diamond className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">Персональные скидки</h3>
              <p className="text-muted-foreground font-medium leading-relaxed text-sm">
                Получайте накопительные скидки в зависимости от вашего объема заказов. Автоматический расчет скидки в корзине.
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Large B2B Reseller Suite & API Hub Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[2.5rem] p-6 pb-8 md:p-10 md:pb-12 relative overflow-hidden group shadow-2xl shadow-slate-900/20 transition-all duration-300 min-h-[380px]">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 -translate-y-1/3 translate-x-1/3" />
          
          <div className="relative z-10 flex flex-col justify-between md:h-full">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <Terminal className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest">B2B Интеграция</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-6 tracking-tight">Решения для Реселлеров & API Hub</h3>
              
              {/* Triple-Hook Feature List */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl backdrop-blur-md">
                  <FileSpreadsheet className="w-6 h-6 text-white/90 shrink-0" strokeWidth={1.5} />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Массовый заказ</h4>
                    <p className="text-xs text-white/60 mt-1 leading-snug">Умный Excel-парсер с автоочисткой ссылок</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl backdrop-blur-md">
                  <Terminal className="w-6 h-6 text-white/90 shrink-0" strokeWidth={1.5} />
                  <div>
                    <h4 className="text-sm font-semibold text-white">PerfectPanel API</h4>
                    <p className="text-xs text-white/60 mt-1 leading-snug">Спецификация v2 для автоматизации</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl backdrop-blur-md">
                  <Diamond className="w-6 h-6 text-white/90 shrink-0" strokeWidth={1.5} />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Wholesale Цены</h4>
                    <p className="text-xs text-white/60 mt-1 leading-snug">Накопительный дисконт до 15% пожизненно</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom CTA bar */}
            <div className="mt-8 sm:mt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-white/10">
              <p className="text-sm text-white/70">
                Запустите свой SMM-бизнес за 5 минут без требований к минимальному балансу.
              </p>
              <Link 
                href="/login?promo=B2BSTART"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-900 text-sm font-extrabold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shrink-0"
              >
                <span>Кабинет Реселлера</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
