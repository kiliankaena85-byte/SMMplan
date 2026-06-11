import { getPublicCatalogAction } from "@/actions/order/catalog";
import { getArticles } from "@/actions/knowledge";
import Link from "next/link";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BookOpen, Info, ArrowRight, Sparkles, Send, Instagram, Youtube, HelpCircle } from "lucide-react";

export const revalidate = 3600;

export const metadata = {
  title: "Каталог услуг & База знаний | SMMplan",
  description: "Премиальная bento-панель продвижения и обучения SMMplan. Найдите экспертные руководства, проверьте лимиты соцсетей и выберите тарифы продвижения.",
};

export default async function ServicesCatalogPage() {
  // Parallel fetch catalog networks and featured articles
  const [catalogResult, articlesResult] = await Promise.all([
    getPublicCatalogAction(),
    getArticles()
  ]);

  const networks = catalogResult.success && catalogResult.data ? catalogResult.data : [];
  // Grab top 3 published articles for our Bento guide section
  const featuredArticles = articlesResult.success && articlesResult.articles 
    ? articlesResult.articles.slice(0, 3) 
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Block */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Интеллектуальное продвижение
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Каталог услуг & База знаний
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Полноценный обучающий хаб. Мы не просто накручиваем показатели — мы объясняем механизмы работы алгоритмов соцсетей и защищаем ваш бюджет.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          
          {/* Left Block: SMM Academy & Expert Guides (Bento Span 7) */}
          <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-extrabold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Экспертные гайды и обучение
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success/10 text-success uppercase">
                  Актуально
                </span>
              </div>
              
              <div className="space-y-4">
                {featuredArticles.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground bg-muted/40 rounded-2xl border border-dashed border-border">
                    Статьи базы знаний скоро появятся.
                  </div>
                ) : (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  featuredArticles.map((art: any) => (
                    <Link
                      key={art.id}
                      href={`/knowledge/${art.slug}`}
                      className="block p-4 rounded-2xl bg-muted/40 border border-transparent hover:border-primary/20 hover:bg-primary/[0.02] transition-all duration-200 group/item"
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                          {art.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {art.authorName} ({art.authorRole.split("/")[0].trim()})
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-sm group-hover/item:text-primary transition-colors leading-snug">
                        {art.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {art.description}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-border/80 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                Учитесь продвигать соцсети без списаний и блокировок
              </span>
              <Link
                href="/knowledge"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-2xl text-xs font-bold bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-sm active:scale-95 whitespace-nowrap"
              >
                <span>Все статьи базы знаний</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Block: Platform Quick Selector (Bento Span 5) */}
          <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200">
            <div className="space-y-6">
              <h2 className="text-xl md:text-2xl font-extrabold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Выбор платформы
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                {networks.map((net) => {
                  const slug = net.slug.toLowerCase();
                  
                  // Setup brand theme styling configs
                  let hoverStyle = "hover:border-primary/30 hover:bg-primary/5 hover:text-primary";
                  let brandIcon = <HelpCircle className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110 duration-200" />;
                  
                  if (slug.includes("telegram")) {
                    hoverStyle = "hover:border-[#3390EC]/30 hover:bg-[#3390EC]/5 hover:text-[#3390EC]";
                    brandIcon = (
                      <svg className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110 duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    );
                  } else if (slug.includes("instagram")) {
                    hoverStyle = "hover:border-[#E1306C]/30 hover:bg-[#E1306C]/5 hover:text-[#E1306C]";
                    brandIcon = (
                      <svg className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110 duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                    );
                  } else if (slug.includes("vk")) {
                    hoverStyle = "hover:border-[#4C75A3]/30 hover:bg-[#4C75A3]/5 hover:text-[#4C75A3]";
                    brandIcon = (
                      <svg className="w-6 h-6 shrink-0 transition-transform fill-current group-hover:scale-110 duration-200" viewBox="0 0 24 24">
                        <path d="M19.14 2H4.86A2.86 2.86 0 0 0 2 4.86v14.28A2.86 2.86 0 0 0 4.86 22h14.28A2.86 2.86 0 0 0 22 19.14V4.86A2.86 2.86 0 0 0 19.14 2zm-3.09 13.91h-1.28c-1.12 0-1.48-.82-2.31-.82-.67 0-1 .49-1 1.25v.71c0 .5-.32.61-.69.61h-2.14c-1.89 0-3.92-2-5.46-4.66-.23-.42-.08-.61.42-.61h1.28c.45 0 .58.26.83.69.87 1.48 1.83 2.57 2.37 2.57.29 0 .42-.19.42-.77V13.1c0-.79-.16-1.15-.81-1.15H9.6c-.23 0-.32-.15-.32-.3a.7.7 0 0 1 .15-.43c.72-1 2.21-2.92 2.21-2.92.23-.33.45-.48.88-.48h1.28c.36 0 .54.19.54.5v2.85c0 .35.15.53.48.53.5 0 1.25-.8 1.94-2.15.17-.32.32-.48.74-.48h1.28c.45 0 .61.22.48.61-.59 1.34-2.29 3.91-2.29 3.91s-.2.27 0 .59c.2.29 1.59 2.15 2.19 3.09.43.68.21.91-.32.91z"/>
                      </svg>
                    );
                  } else if (slug.includes("youtube")) {
                    hoverStyle = "hover:border-[#FF0000]/30 hover:bg-[#FF0000]/5 hover:text-[#FF0000]";
                    brandIcon = (
                      <svg className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110 duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                      </svg>
                    );
                  } else if (slug.includes("tiktok")) {
                    hoverStyle = "hover:border-[#00F2FE]/30 hover:bg-[#00F2FE]/5 hover:text-[#00F2FE]";
                    brandIcon = (
                      <svg className="w-6 h-6 shrink-0 transition-transform stroke-current fill-none group-hover:scale-110 duration-200" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                      </svg>
                    );
                  }
                  
                  return (
                    <Link
                      key={net.id}
                      href={`/services/${net.slug}`}
                      className={`group p-4 bg-muted/40 border border-transparent rounded-2xl transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 ${hoverStyle} h-28`}
                    >
                      <div className="p-2.5 rounded-xl bg-card border border-border group-hover:border-transparent text-muted-foreground group-hover:text-inherit transition-all shadow-sm">
                        {brandIcon}
                      </div>
                      <span className="font-bold text-xs text-foreground group-hover:text-inherit transition-colors tracking-tight">
                        {net.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
            
            <div className="pt-6 mt-6 border-t border-border/80 text-center text-xs text-muted-foreground font-semibold">
              Выберите сеть для просмотра группировок тарифов
            </div>
          </div>

          {/* Lower Block: Unified AI Sandbox Callout (Bento Span 12) */}
          <div className="lg:col-span-12 bg-gradient-to-r from-primary/5 via-secondary/15 to-primary/5 border border-border/80 rounded-3xl p-6 md:p-8 text-center space-y-4 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group">
            {/* Ambient subtle blur glow */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/20 transition-all" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-secondary/20 rounded-full blur-2xl pointer-events-none group-hover:bg-secondary/30 transition-all" />

            <div className="max-w-2xl mx-auto space-y-4 relative">
              <div className="inline-flex p-2 rounded-2xl bg-primary/10 text-primary shrink-0 mb-1">
                <Info className="w-6 h-6" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-foreground">
                Испытайте наш «Умный анализатор ссылок»
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                Вам больше не нужно гадать, какую услугу заказать. Просто перейдите на форму заказа и вставьте ссылку на ваш канал, пост или Reels. Наш ИИ-анализатор в реальном времени подберет совместимые тарифы и отсеет любые ошибки!
              </p>
              
              <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-center">
                <Link
                  href="/knowledge/how-to-order"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-2xl text-xs font-bold bg-card text-foreground hover:bg-muted border border-border transition-all duration-200 active:scale-95"
                >
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span>Читать гайд по ссылкам</span>
                </Link>
                <Link
                  href="/dashboard/new-order"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-2xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-200 shadow active:scale-95"
                >
                  <span>Оформить заказ</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
