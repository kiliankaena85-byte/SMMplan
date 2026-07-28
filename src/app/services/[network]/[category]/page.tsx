import { getPublicCatalogAction, getServicesByCategoryAction } from "@/actions/order/catalog";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { headers } from "next/headers";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQSection } from "@/components/seo/FAQSection";
import { getFaqForCategory } from "@/data/seo/faq-templates";
import { absoluteCanonical, getTenantHost, getTenantSiteName, normalizeTenantId } from "@/lib/seo-helpers";
import { db } from "@/lib/db";

// Force dynamic rendering — headers() is used for tenant resolution
export const dynamic = 'force-dynamic';

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

// generateStaticParams: no tenantId filter — pages are generated for all tenants
// The tenant is resolved at request time via headers()
export async function generateStaticParams() {
  const catalogResult = await getPublicCatalogAction('smmplan');
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

  const reqHeaders = await headers();
  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id'));
  const siteName = getTenantSiteName(tenantId);

  const catalogResult = await getPublicCatalogAction(tenantId);
  const net = catalogResult.data?.find(n => n.slug === network);
  const cat = net?.categories.find(c => c.slug === category);

  if (!net || !cat) return { title: "Страница не найдена" };

  // Quality Gate check — uses the same filtered query (isQuarantined, cooldownUntil, tenantId)
  const services = await getServicesByCategoryAction(cat.id, tenantId);
  const passesQualityGate = services.length >= 3 && services.some(s => s.pricePerUnitRub > 0);

  if (!passesQualityGate) {
    return {
      title: `${cat.name} в ${net.name} | ${siteName}`,
      robots: { index: false, follow: false },
    };
  }

  const minPrice = Math.min(...services.map(s => s.pricePerUnitRub));
  const canonical = absoluteCanonical(tenantId, `/services/${network}/${category}`);

  // Tenant-specific titles and descriptions
  let title: string;
  let description: string;
  if (tenantId === 'smmflux') {
    title = `${cat.name} ${net.name} — быстро и недорого | ${siteName}`;
    description = `${cat.name} для ${net.name} от ${minPrice.toFixed(2)} ₽. Быстрый старт, гарантия, поддержка. Заказ за 1 минуту.`;
  } else if (tenantId === 'lovable') {
    title = `${cat.name} ${net.name} — прокачай свой профиль | ${siteName}`;
    description = `${cat.name} для ${net.name} от ${minPrice.toFixed(2)} ₽. Анонимно, быстро, без паролей. Drip-feed, гарантия, поддержка.`;
  } else {
    title = `${cat.name} ${net.name} — цены, API, гарантия | ${siteName}`;
    description = `Заказать ${cat.name} для ${net.name}. Цены от ${minPrice.toFixed(2)} ₽/шт, быстрый старт, API для агентств. FAQ, требования, поддержка 24/7.`;
  }

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      locale: 'ru_RU',
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
}

export default async function CategoryServicesPage({ params }: { params: Promise<{ network: string; category: string }> }) {
  const { network, category: categorySlug } = await params;

  const reqHeaders = await headers();
  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id'));
  const siteName = getTenantSiteName(tenantId);
  const host = getTenantHost(tenantId);

  const catalogResult = await getPublicCatalogAction(tenantId);
  const networks = catalogResult.success && catalogResult.data ? catalogResult.data : [];

  const currentNetwork = networks.find(n => n.slug === network);
  const currentCategory = currentNetwork?.categories.find(c => c.slug === categorySlug);

  if (!currentNetwork || !currentCategory) notFound();

  // Fetch services — already filtered for isQuarantined:false, cooldownUntil, tenantId
  const services = await getServicesByCategoryAction(currentCategory.id, tenantId);

  const passesQualityGate = services.length >= 3 && services.some(s => s.pricePerUnitRub > 0);
  const minPrice = services.length > 0 ? Math.min(...services.map(s => s.pricePerUnitRub)) : 0;
  const maxPrice = services.length > 0 ? Math.max(...services.map(s => s.pricePerUnitRub)) : 0;
  const pageUrl = `https://${host}/services/${currentNetwork.slug}/${currentCategory.slug}`;

  // Related categories (same network, excluding current)
  const relatedCategories = currentNetwork.categories
    .filter(c => c.id !== currentCategory.id)
    .slice(0, 6);

  // Related networks (excluding current)
  const relatedNetworks = networks
    .filter(n => n.id !== currentNetwork.id)
    .slice(0, 4);

  // Related guides from ContentItem (top-4 by viewCount)
  const relatedGuides = await db.contentItem.findMany({
    where: {
      isPublished: true,
      type: { in: ['PAGE', 'NEWS_POST'] },
    },
    take: 4,
    orderBy: { viewCount: 'desc' },
    select: { id: true, slug: true, title: true, excerpt: true, viewCount: true },
  });

  // Breadcrumb JSON-LD
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": `https://${host}` },
      { "@type": "ListItem", "position": 2, "name": "Услуги", "item": `https://${host}/services` },
      { "@type": "ListItem", "position": 3, "name": currentNetwork.name, "item": `https://${host}/services/${currentNetwork.slug}` },
      { "@type": "ListItem", "position": 4, "name": currentCategory.name, "item": pageUrl },
    ],
  };

  // ItemList JSON-LD
  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${currentCategory.name} ${currentNetwork.name}`,
    "numberOfItems": services.length,
    "itemListElement": services.map((s, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": s.name,
      "url": pageUrl,
    })),
  };

  // Service + AggregateOffer JSON-LD
  const serviceData = passesQualityGate ? {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `${currentCategory.name} ${currentNetwork.name}`,
    "description": `Профессиональные услуги ${currentCategory.name} для ${currentNetwork.name}. Быстрый старт, низкие цены от ${minPrice.toFixed(2)} ₽.`,
    "provider": {
      "@type": "Organization",
      "name": siteName,
      "url": `https://${host}`,
    },
    "areaServed": "RU",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "RUB",
      "lowPrice": String(minPrice.toFixed(2)),
      "highPrice": String(maxPrice.toFixed(2)),
      "offerCount": String(services.length),
    },
  } : null;

  // FAQ
  const faqItems = getFaqForCategory(currentNetwork.slug, currentCategory.slug);
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      {/* JSON-LD Schemas */}
      <JsonLd data={breadcrumbData} />
      <JsonLd data={itemListData} />
      {serviceData && <JsonLd data={serviceData} />}
      {faqItems.length > 0 && <JsonLd data={faqData} />}

      <div className="max-w-6xl mx-auto space-y-12">

        {/* Breadcrumbs UI */}
        <nav className="flex text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/" className="hover:text-foreground transition-colors">Главная</Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2">/</span>
                <Link href="/services" className="hover:text-foreground transition-colors">Услуги</Link>
              </div>
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
          {!passesQualityGate && (
            <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 rounded-r-lg max-w-fit">
              <p className="font-bold text-sm">⚠️ Страница не индексируется: менее 3 активных услуг или нулевые цены (Quality Gate не пройден).</p>
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {currentCategory.name} {currentNetwork.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Полный список услуг по категории <span className="text-primary font-medium">{currentCategory.name}</span> для <span className="text-primary font-medium">{currentNetwork.name}</span>.
            Самые низкие цены на рынке, проверенные провайдеры и автоматическое выполнение.
          </p>
          {passesQualityGate && (
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                от {formatPricePerUnit(minPrice)} ₽ / шт
              </span>
              <span className="text-xs font-bold bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
                {services.length} тариф{services.length === 1 ? '' : services.length < 5 ? 'а' : 'ов'}
              </span>
              {services.some(s => s.isDripFeedEnabled) && (
                <span className="text-xs font-bold bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-full">Drip-feed</span>
              )}
              {services.some(s => s.isRefillEnabled) && (
                <span className="text-xs font-bold bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-full">Refill</span>
              )}
            </div>
          )}
        </div>

        {/* Services Table */}
        <div className="overflow-x-auto rounded-2xl border border-border/50 shadow-sm bg-card">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border/50 text-xs font-black text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">Услуга</th>
                <th className="px-6 py-4">Мин.</th>
                <th className="px-6 py-4">Скорость</th>
                <th className="px-6 py-4 text-right">Цена (₽/шт)</th>
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
                        {service.isDripFeedEnabled && (
                          <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">Drip</span>
                        )}
                        {service.isRefillEnabled && (
                          <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">Refill</span>
                        )}
                      </div>
                      {service.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1 max-w-md">{service.description}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {service.minQty.toLocaleString('ru-RU')} шт.
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-[10px] font-bold text-emerald-600 bg-success/5 px-2 py-1 rounded-md border border-emerald-500/10">
                      {service.speed}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex flex-col items-end whitespace-nowrap">
                      <span className="font-black text-foreground text-base">{formatPricePerUnit(service.pricePerUnitRub)} ₽</span>
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

        {/* SEO Content Block */}
        <div className="mt-16 prose prose-invert max-w-none border-t border-border pt-12">
          <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mb-8">
            Почему стоит заказать {currentCategory.name} {currentNetwork.name} в {siteName}?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-muted-foreground">
            <div className="space-y-4">
              <p>
                {siteName} — это лидирующая платформа для продвижения в социальных сетях. Категория <span className="text-foreground font-bold">{currentCategory.name} {currentNetwork.name}</span> является одной из самых популярных у наших клиентов благодаря оптимальному сочетанию цены и качества.
              </p>
              <p>
                Мы агрегируем предложения от крупнейших мировых поставщиков, проводя жёсткий отбор по критериям скорости, стабильности и процента списаний. Это позволяет получать услуги профессионального уровня без переплат.
              </p>
            </div>
            <ul className="space-y-4 list-none p-0">
              {[
                "Мгновенный автоматический запуск 24/7",
                "Заказ от 1 единицы — платите только за результат",
                "Конфиденциальность: работаем без паролей",
                "Гарантия на большинство услуг категории",
                "Прозрачная система статусов в личном кабинете",
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

        {/* Related Categories */}
        {relatedCategories.length > 0 && (
          <div className="border-t border-border pt-10">
            <h3 className="text-lg font-black text-foreground mb-4">Другие категории {currentNetwork.name}</h3>
            <div className="flex flex-wrap gap-2">
              {relatedCategories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/services/${currentNetwork.slug}/${cat.slug}`}
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-card border border-border hover:border-primary/40 hover:text-primary transition-all duration-200"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related Networks */}
        {relatedNetworks.length > 0 && (
          <div className="border-t border-border pt-10">
            <h3 className="text-lg font-black text-foreground mb-4">Продвижение в других сетях</h3>
            <div className="flex flex-wrap gap-2">
              {relatedNetworks.map(net => (
                <Link
                  key={net.id}
                  href={`/services/${net.slug}`}
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-card border border-border hover:border-primary/40 hover:text-primary transition-all duration-200"
                >
                  {net.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related Guides from Blog */}
        {relatedGuides.length > 0 && (
          <div className="border-t border-border pt-10">
            <h3 className="text-lg font-black text-foreground mb-4">Полезные материалы</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedGuides.map(guide => (
                <Link
                  key={guide.id}
                  href={`/knowledge/${guide.slug}`}
                  className="block p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all duration-200 group"
                >
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {guide.title}
                  </p>
                  {guide.excerpt && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{guide.excerpt}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <FAQSection items={faqItems} title={`Вопросы и ответы по ${currentCategory.name} ${currentNetwork.name}`} />

      </div>
    </div>
  );
}
