import { getPublicCatalogAction, getServicesByCategoryAction } from "@/actions/order/catalog";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQSection } from "@/components/seo/FAQSection";

export const revalidate = 3600;

export async function generateStaticParams() {
  const catalogResult = await getPublicCatalogAction();
  if (!catalogResult.success || !catalogResult.data) return [];

  const params = [];
  for (const network of catalogResult.data) {
    for (const category of network.categories) {
      params.push({
        network: network.slug,
        category: category.slug,
      });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ network: string; category: string }> }): Promise<Metadata> {
  const { network, category } = await params;
  const catalogResult = await getPublicCatalogAction();
  const net = catalogResult.data?.find(n => n.slug === network);
  const cat = net?.categories.find(c => c.slug === category);
  
  if (!net || !cat) return { title: "Страница не найдена" };

  return {
    title: `Накрутка ${cat.name} в ${net.name} | Дешево и быстро | Smmplan`,
    description: `Лучший сервис для ${cat.name} в ${net.name}. Профессиональное продвижение, мгновенный старт, поштучные заказы и гарантия от списаний.`,
    alternates: {
      canonical: `/services/${network}/${category}`,
    },
  };
}

export default async function CategoryServicesPage({ params }: { params: Promise<{ network: string; category: string }> }) {
  const { network, category: categorySlug } = await params;
  const catalogResult = await getPublicCatalogAction();
  const networks = catalogResult.success && catalogResult.data ? catalogResult.data : [];
  
  const currentNetwork = networks.find(n => n.slug === network);
  const currentCategory = currentNetwork?.categories.find(c => c.slug === categorySlug);
  
  if (!currentNetwork || !currentCategory) notFound();

  const services = await getServicesByCategoryAction(currentCategory.id);
  const minPrice = services.length > 0 ? Math.min(...services.map(s => s.pricePer1kRub / 1000)) : 0;

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://smmplan.pro" },
      { "@type": "ListItem", "position": 2, "name": currentNetwork.name, "item": `https://smmplan.pro/services/${currentNetwork.slug}` },
      { "@type": "ListItem", "position": 3, "name": currentCategory.name, "item": `https://smmplan.pro/services/${currentNetwork.slug}/${currentCategory.slug}` }
    ]
  };

  const productData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `${currentCategory.name} ${currentNetwork.name}`,
    "description": `Профессиональные услуги ${currentCategory.name} для ${currentNetwork.name}. Быстрый старт, низкие цены от ${minPrice.toFixed(2)} ₽.`,
    "provider": {
      "@type": "Organization",
      "name": "Smmplan",
      "url": "https://smmplan.pro"
    },
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "RUB",
      "lowPrice": minPrice.toFixed(2),
      "offerCount": services.length
    }
  };

  const faqItems = [
    {
      question: `Как быстро запустится ${currentCategory.name} ${currentNetwork.name}?`,
      answer: "Большинство заказов запускаются автоматически в течение 5-30 минут после оплаты. Точное время зависит от выбранной услуги и текущей нагрузки системы."
    },
    {
      question: "Нужен ли пароль от аккаунта?",
      answer: "Нет, мы никогда не запрашиваем пароли. Для выполнения заказа нам нужна только ссылка на ваш профиль, пост или канал."
    },
    {
      question: "Безопасно ли это для моего аккаунта?",
      answer: `Да, мы используем безопасные методы продвижения, которые соответствуют лимитам ${currentNetwork.name}. Риск блокировки минимален при соблюдении естественных темпов роста.`
    },
    {
      question: "Какие способы оплаты вы принимаете?",
      answer: "Мы принимаем банковские карты РФ, СБП, электронные кошельки и криптовалюты через надежные платежные шлюзы."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Breadcrumbs */}
        <nav className="flex text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/" className="hover:text-foreground transition-colors">Главная</Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2">/</span>
                <Link href={`/services/${currentNetwork.slug}`} className="hover:text-foreground transition-colors">{currentNetwork.name}</Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="mx-2">/</span>
                <span className="text-foreground font-medium">{currentCategory.name}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {currentCategory.name} {currentNetwork.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Полный список услуг по категории <span className="text-primary font-medium">{currentCategory.name}</span> для <span className="text-primary font-medium">{currentNetwork.name}</span>. 
            Самые низкие цены на рынке, проверенные провайдеры и автоматическое выполнение.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border/50 shadow-sm bg-card">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border/50 text-xs font-black text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">Услуга</th>
                <th className="px-6 py-4">Мин.</th>
                <th className="px-6 py-4">Скорость</th>
                <th className="px-6 py-4 text-right">Цена (₽)</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {services.map(service => (
                <tr key={service.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">{service.name}</span>
                        {service.badge && (
                          <span className="shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">{service.badge}</span>
                        )}
                      </div>
                      {service.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1 max-w-md">{service.description}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {service.minQty} шт.
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-[10px] font-bold text-emerald-600 bg-success/5 px-2 py-1 rounded-md border border-emerald-500/10">
                      {service.speed}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex flex-col items-end whitespace-nowrap">
                      <span className="font-black text-foreground text-base">{(service.pricePer1kRub / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link 
                      href={`/dashboard/new-order?serviceId=${service.id}`}
                      className="inline-flex items-center justify-center text-[11px] font-bold bg-foreground text-background px-5 py-2.5 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all shadow-sm active:scale-95"
                    >
                      Купить
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SEO Content */}
        <div className="mt-20 prose prose-invert max-w-none border-t border-border pt-12">
          <JsonLd data={breadcrumbData} />
          <JsonLd data={productData} />
          
          <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mb-8">
            Почему стоит заказать {currentCategory.name} {currentNetwork.name} в Smmplan?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-muted-foreground">
            <div className="space-y-4">
              <p>
                Smmplan — это лидирующая розничная платформа для продвижения в социальных сетях. Категория <span className="text-foreground font-bold">{currentCategory.name} {currentNetwork.name}</span> является одной из самых популярных у наших клиентов благодаря оптимальному сочетанию цены и качества.
              </p>
              <p>
                Мы агрегируем предложения от крупнейших мировых поставщиков, проводя жесткий отбор по критериям скорости, стабильности и проценту списаний. Это позволяет вам получать услуги профессионального уровня без переплат.
              </p>
            </div>
            <ul className="space-y-4 list-none p-0">
              {[
                "Мгновенный автоматический запуск 24/7",
                "Заказ от 1 единицы — платите только за результат",
                "Конфиденциальность: работаем без паролей",
                "Гарантия на большинство услуг категории",
                "Прозрачная система статусов в личном кабинете"
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-4 group">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <span className="text-primary text-xs font-bold">✓</span>
                  </div>
                  <span className="text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQ Section */}
        <FAQSection items={faqItems} title={`Вопросы и ответы по ${currentCategory.name}`} />
      </div>
    </div>
  );
}
