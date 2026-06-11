import { getPublicCatalogAction, getServicesByCategoryAction } from "@/actions/order/catalog";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Clock, CheckCircle2, ArrowLeft, Send, Zap, Shield, Sparkles, HelpCircle } from "lucide-react";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ network: string }> }): Promise<Metadata> {
  const { network } = await params;
  const catalogResult = await getPublicCatalogAction();
  const net = catalogResult.data?.find(n => n.slug === network);
  
  if (!net) return { title: "Сеть не найдена" };

  return {
    title: `Накрутка ${net.name} | Купить подписчиков и лайки | SMMplan`,
    description: `Премиальное продвижение в ${net.name}. Заказ от 1 штуки, гарантия качества, быстрый старт и удобный сервис.`,
  };
}

function formatPricePerUnit(price: number): string {
  if (price === 0) return "0.00";
  let formatted: string;
  if (price < 0.01) {
    formatted = price.toFixed(6);
  } else if (price < 0.1) {
    formatted = price.toFixed(4);
  } else {
    formatted = price.toFixed(2);
  }
  
  if (formatted.includes(".")) {
    while (formatted.endsWith("0") && formatted.split(".")[1].length > 2) {
      formatted = formatted.slice(0, -1);
    }
  }
  return formatted;
}

export default async function NetworkServicesPage({ params }: { params: Promise<{ network: string }> }) {
  const { network } = await params;
  const catalogResult = await getPublicCatalogAction();
  const networks = catalogResult.success && catalogResult.data ? catalogResult.data : [];
  
  const currentNetwork = networks.find(n => n.slug === network);
  if (!currentNetwork) notFound();

  // Parallel fetch services for all categories in this network
  const categoriesWithServices = await Promise.all(
    currentNetwork.categories.map(async (cat) => {
      const services = await getServicesByCategoryAction(cat.id);
      return { ...cat, services };
    })
  );

  // Flatten all services for custom grouping and sorting
  const allServices = categoriesWithServices.flatMap(cat => 
    (cat.services || []).map(srv => ({
      ...srv,
      categoryName: cat.name
    }))
  );

  // Group services by customer-oriented goals instead of raw categories
  // Sort inside goals by pricePerUnitRub ascending
  const subscribersGoal = allServices
    .filter(s => s.targetType === "CHANNEL")
    .sort((a, b) => a.pricePerUnitRub - b.pricePerUnitRub);

  const activityGoal = allServices
    .filter(s => s.targetType === "POST" || s.targetType === "STORY")
    .sort((a, b) => a.pricePerUnitRub - b.pricePerUnitRub);

  const customGoal = allServices
    .filter(s => s.targetType !== "CHANNEL" && s.targetType !== "POST" && s.targetType !== "STORY")
    .sort((a, b) => a.pricePerUnitRub - b.pricePerUnitRub);

  // Brand header SVG selectors
  const slug = currentNetwork.slug.toLowerCase();
  let brandColor = "text-primary bg-primary/10";
  let brandIcon = <HelpCircle className="w-12 h-12" />;

  if (slug.includes("telegram")) {
    brandColor = "text-[#3390EC] bg-[#3390EC]/10";
    brandIcon = (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    );
  } else if (slug.includes("instagram")) {
    brandColor = "text-[#E1306C] bg-[#E1306C]/10";
    brandIcon = (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    );
  } else if (slug.includes("vk")) {
    brandColor = "text-[#4C75A3] bg-[#4C75A3]/10";
    brandIcon = (
      <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24">
        <path d="M19.14 2H4.86A2.86 2.86 0 0 0 2 4.86v14.28A2.86 2.86 0 0 0 4.86 22h14.28A2.86 2.86 0 0 0 22 19.14V4.86A2.86 2.86 0 0 0 19.14 2zm-3.09 13.91h-1.28c-1.12 0-1.48-.82-2.31-.82-.67 0-1 .49-1 1.25v.71c0 .5-.32.61-.69.61h-2.14c-1.89 0-3.92-2-5.46-4.66-.23-.42-.08-.61.42-.61h1.28c.45 0 .58.26.83.69.87 1.48 1.83 2.57 2.37 2.57.29 0 .42-.19.42-.77V13.1c0-.79-.16-1.15-.81-1.15H9.6c-.23 0-.32-.15-.32-.3a.7.7 0 0 1 .15-.43c.72-1 2.21-2.92 2.21-2.92.23-.33.45-.48.88-.48h1.28c.36 0 .54.19.54.5v2.85c0 .35.15.53.48.53.5 0 1.25-.8 1.94-2.15.17-.32.32-.48.74-.48h1.28c.45 0 .61.22.48.61-.59 1.34-2.29 3.91-2.29 3.91s-.2.27 0 .59c.2.29 1.59 2.15 2.19 3.09.43.68.21.91-.32.91z"/>
      </svg>
    );
  } else if (slug.includes("youtube")) {
    brandColor = "text-[#FF0000] bg-[#FF0000]/10";
    brandIcon = (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
      </svg>
    );
  } else if (slug.includes("tiktok")) {
    brandColor = "text-[#00F2FE] bg-[#00F2FE]/10";
    brandIcon = (
      <svg className="w-10 h-10 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"></path>
        <circle cx="6" cy="18" r="3"></circle>
        <circle cx="18" cy="16" r="3"></circle>
      </svg>
    );
  }

  const renderServiceSection = (title: string, desc: string, icon: React.ReactNode, list: typeof allServices) => {
    if (list.length === 0) return null;
    
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-foreground">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {desc} · {list.length} услуг
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(service => (
            <div 
              key={service.id} 
              className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                      {service.categoryName}
                    </span>
                    <h3 className="font-extrabold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">
                      {service.name}
                    </h3>
                  </div>
                  {service.badge && (
                    <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                      {service.badge}
                    </span>
                  )}
                </div>
                
                {service.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {service.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-semibold">
                    Мин: {service.minQty.toLocaleString("ru-RU")} шт.
                  </span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" /> {service.speed}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/60">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Цена за штуку
                  </span>
                  <span className="font-black text-foreground text-lg tracking-tight font-mono">
                    {formatPricePerUnit(service.pricePerUnitRub)} ₽
                  </span>
                </div>
                
                <Link 
                  href={`/dashboard/new-order?serviceId=${service.id}`}
                  className="inline-flex items-center justify-center gap-1 h-10 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-200 shadow-sm active:scale-95 whitespace-nowrap"
                >
                  <span>Заказать</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Navigation Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-card border border-border px-4 py-2.5 rounded-2xl w-fit shadow-sm" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">Главная</Link>
          <span className="text-muted-foreground/50">/</span>
          <Link href="/services" className="hover:text-foreground transition-colors">Услуги</Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground font-bold">{currentNetwork.name}</span>
        </nav>

        {/* Brand Header */}
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center p-6 md:p-8 bg-card border border-border rounded-3xl shadow-sm">
          <div className={`p-4 rounded-2xl shrink-0 shadow-sm ${brandColor}`}>
            {brandIcon}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Продвижение {currentNetwork.name}
            </h1>
            <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Мы сгруппировали тарифы по конечным целям продвижения и отсортировали их по себестоимости. Выберите лучшее решение для вашего бюджета и целей.
            </p>
          </div>
        </div>

        {/* Back Link */}
        <Link 
          href="/services" 
          className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-secondary/40 border border-transparent hover:border-primary/20 px-4.5 py-2.5 rounded-xl w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Вернуться ко всем платформам
        </Link>

        {/* Target-oriented catalog grids */}
        <div className="space-y-16 pt-4">
          
          {renderServiceSection(
            "Подписчики & Живая аудитория",
            "Услуги по привлечению подписчиков, участников в группы и друзей для роста социального веса",
            <Zap className="w-5 h-5" />,
            subscribersGoal
          )}

          {renderServiceSection(
            "Лайки, Просмотры & Активность",
            "Накрутка просмотров на посты/Reels, лайков, реакций и репостов для охвата алгоритмами",
            <Sparkles className="w-5 h-5" />,
            activityGoal
          )}

          {renderServiceSection(
            "Интерактив & Другие услуги",
            "Специфические услуги накрутки (опросы, Telegram Stars, индивидуальный заказ)",
            <Shield className="w-5 h-5" />,
            customGoal
          )}

          {/* Empty State fallback */}
          {allServices.length === 0 && (
            <div className="text-center py-16 bg-card border border-border rounded-3xl space-y-4">
              <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto" />
              <h3 className="font-extrabold text-lg text-foreground">Тарифы временно отсутствуют</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                В этой категории сейчас нет активных тарифов. Пожалуйста, зайдите позже или обратитесь в нашу круглосуточную службу поддержки.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
