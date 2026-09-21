import { getPublicCatalogAction, getServicesByCategoryAction } from "@/actions/order/catalog";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { headers } from "next/headers";
import { absoluteCanonical, getTenantSiteName, normalizeTenantId, getTenantHost } from "@/lib/seo-helpers";
import { resolveTenantUserBalance } from "@/lib/tenant-user-resolver";
import { JsonLd } from "@/components/seo/JsonLd";
import { SettingsProvider } from "@/lib/settings";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import nextDynamic from "next/dynamic";

const SmartLinkLanding = nextDynamic(
  () => import("@/components/landing/SmartLinkLanding").then((m) => m.SmartLinkLanding),
  { ssr: true }
);
const FluxOrderClient = nextDynamic(
  () => import("@/components/ab-test/FluxOrderClient").then((m) => m.FluxOrderClient),
  { ssr: true }
);
const FluxTrustBar = nextDynamic(
  () => import("@/components/ab-test/FluxTrustBar").then((m) => m.FluxTrustBar),
  { ssr: true }
);
const FluxWhyUs = nextDynamic(
  () => import("@/components/ab-test/FluxWhyUs").then((m) => m.FluxWhyUs),
  { ssr: true }
);
const FluxReviews = nextDynamic(
  () => import("@/components/ab-test/FluxReviews").then((m) => m.FluxReviews),
  { ssr: true }
);
const FluxFAQ = nextDynamic(
  () => import("@/components/ab-test/FluxFAQ").then((m) => m.FluxFAQ),
  { ssr: true }
);
import { Header } from "@/components/landing/Header";
import { MegaFooter } from "@/components/landing/MegaFooter";
import { ROUTES } from "@/lib/routes";
import { LandingSeoHub } from "@/components/seo/LandingSeoHub";
import { SiloLinkingService } from "@/services/seo/silo-linking.service";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ network: string }> }): Promise<Metadata> {
  const { network } = await params;
  
  const reqHeaders = await headers();
  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id'));
  const siteName = getTenantSiteName(tenantId);
  const host = getTenantHost(tenantId);
  
  const catalogResult = await getPublicCatalogAction(tenantId);
  const net = catalogResult.data?.find(n => n.slug === network);
  
  if (!net) return { title: "Сеть не найдена" };

  const ogUrl = `https://${host}/api/og?tenant=${tenantId}&network=${encodeURIComponent(net.name)}&title=${encodeURIComponent(`Продвижение ${net.name}`)}&subtitle=${encodeURIComponent(tenantId === 'flux' ? 'Экспресс-витрина от 1 шт • Автозапуск от 30 сек' : 'Оптовые тарифы от 1 шт • Автозапуск от 30 сек')}&price=${encodeURIComponent('0.01 ₽ / шт')}`;

  return {
    title: `Продвижение ${net.name} — купить подписчиков, лайки, просмотры от 1 шт`,
    description: `Официальное продвижение в ${net.name} от платформы ${siteName}. Без посредников: подписчики, лайки, просмотры, комментарии. Автозапуск и гарантия от списаний.`,
    alternates: {
      canonical: absoluteCanonical(tenantId, `/services/${net.slug}`),
    },
    openGraph: {
      title: `Продвижение ${net.name} — ${siteName}`,
      description: `Быстрое и надежное продвижение в ${net.name}. Тарифы от 1 шт., гарантия, мгновенный старт.`,
      type: "website",
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `Продвижение ${net.name} — ${siteName}`,
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: `Продвижение ${net.name} — ${siteName}`,
      description: `Тарифы от 1 шт., гарантия Refill, мгновенный старт.`,
      images: [ogUrl],
    }
  };
}

export default async function NetworkServicesPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ network: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { network } = await params;
  const sParams = searchParams ? await searchParams : {};
  const initialServiceId = typeof sParams.serviceId === 'string' ? sParams.serviceId : undefined;
  
  const reqHeaders = await headers();
  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id')) || "smmplan";
  const siteName = getTenantSiteName(tenantId);
  const host = getTenantHost(tenantId);
  
  const catalogResult = await getPublicCatalogAction(tenantId);
  const catalog = catalogResult.success && catalogResult.data ? catalogResult.data : [];
  
  const currentNetwork = catalog.find(n => n.slug === network);
  if (!currentNetwork) notFound();

  const settings = await SettingsProvider.getContactAndLegalSettings();
  const firstCatId = currentNetwork.categories[0]?.id;
  const initialServices = firstCatId ? await getServicesByCategoryAction(firstCatId, tenantId) : [];

  // Resolve user session, email and tenant-isolated balance (ст. 54.1 НК РФ)
  const session = await verifySession();
  const { userEmail, userBalanceCents } = await resolveTenantUserBalance(session?.userId, tenantId);

  // Related networks and categories for Silo cross-linking
  const relatedCategories = currentNetwork.categories.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug
  }));

  const relatedNetworks = catalog
    .filter(n => n.id !== currentNetwork.id)
    .slice(0, 8)
    .map(n => ({
      id: n.id,
      name: n.name,
      slug: n.slug
    }));

  // Breadcrumbs JSON-LD
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Главная",
        "item": absoluteCanonical(tenantId, "/"),
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Услуги",
        "item": absoluteCanonical(tenantId, "/services"),
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": currentNetwork.name,
        "item": absoluteCanonical(tenantId, `/services/${currentNetwork.slug}`),
      },
    ],
  };

  // Rich Product / Service schema with AggregateRating for Google/Yandex Stars ⭐
  const serviceData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `Продвижение ${currentNetwork.name}`,
    "description": `Автоматическое продвижение в ${currentNetwork.name} с гарантией от списаний.`,
    "brand": {
      "@type": "Brand",
      "name": currentNetwork.name
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.94",
      "reviewCount": "1420",
      "bestRating": "5",
      "worstRating": "1"
    },
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "RUB",
      "lowPrice": "0.01",
      "highPrice": "15.00",
      "offerCount": "120",
      "url": `https://${host}/services/${currentNetwork.slug}`
    }
  };

  const siloBundle = await SiloLinkingService.getComplementaryForNetwork({
    networkSlug: currentNetwork.slug,
    tenantId,
    limit: 4,
  });

  const seoHub = (
    <LandingSeoHub
      networkName={currentNetwork.name}
      networkSlug={currentNetwork.slug}
      minPrice={0.01}
      servicesCount={currentNetwork.categories.length * 5}
      siteName={siteName}
      host={host}
      relatedCategories={relatedCategories}
      relatedNetworks={relatedNetworks}
      siloBundle={siloBundle}
      tenantId={tenantId}
    />
  );

  return (
    <>
      <JsonLd data={breadcrumbData} />
      <JsonLd data={serviceData} />

      <main id="main-content" tabIndex={-1} className="outline-none">
        {tenantId === "flux" ? (
          <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-x-clip">
            {/* ── SMMFLUX VIBRANT HERO BACKGROUND (Full Bleed - GPU Optimized Static Layer) ── */}
            <div className="absolute top-0 inset-x-0 h-[2200px] z-0 pointer-events-none overflow-hidden select-none bg-background transform-gpu contain-paint max-w-full">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(65% 55% at 15% 0%, rgba(59, 130, 246, 0.28), transparent 70%), ' +
                    'radial-gradient(55% 55% at 85% 5%, rgba(56, 189, 248, 0.22), transparent 70%), ' +
                    'radial-gradient(65% 55% at 20% 40%, rgba(244, 63, 94, 0.20), transparent 70%), ' +
                    'radial-gradient(55% 55% at 80% 50%, rgba(249, 115, 22, 0.18), transparent 70%), ' +
                    'radial-gradient(70% 70% at 50% 25%, rgba(217, 70, 239, 0.22), transparent 75%)',
                }}
              />
              <div className="absolute top-0 left-0 w-[300px] sm:w-[500px] md:w-[700px] h-[300px] sm:h-[500px] md:h-[700px] rounded-full bg-blue-500/20 blur-[90px] sm:blur-[120px] pointer-events-none" />
              <div className="absolute top-4 left-[15%] w-[280px] sm:w-[450px] md:w-[600px] h-[280px] sm:h-[450px] md:h-[600px] rounded-full bg-purple-600/25 blur-[80px] sm:blur-[110px] pointer-events-none" />
              <div className="absolute top-0 right-0 w-[300px] sm:w-[500px] md:w-[650px] h-[300px] sm:h-[500px] md:h-[650px] rounded-full bg-pink-500/20 blur-[90px] sm:blur-[120px] pointer-events-none" />
              <div className="absolute top-20 right-[5%] w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] rounded-full bg-orange-400/15 blur-[70px] sm:blur-[90px] pointer-events-none" />
              <div className="absolute bottom-0 inset-x-0 h-[400px] bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            <div className="relative z-10 w-full">
              <Header initialEmail={userEmail} siteName={siteName} tenantId={tenantId} activePath={ROUTES.HOME} />
            </div>

            <div className="flex-1 w-full max-w-screen-2xl mx-auto px-4 pt-4 md:pt-12 pb-8 md:pb-16 flex flex-col items-center relative z-10">
              <FluxOrderClient 
                initialCatalog={catalog} 
                initialEmail={userEmail}
                userBalanceCents={userBalanceCents}
                initialNetworkId={currentNetwork.id}
                initialServiceId={initialServiceId}
                tenantId={tenantId}
              />
            </div>

            <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4">
              {seoHub}
            </div>

            <div className="relative z-10 w-full mb-8 md:mb-12">
              <FluxTrustBar />
            </div>

            <div className="relative z-10 bg-card mx-2 sm:mx-4 lg:mx-6 rounded-t-[32px] md:rounded-t-[48px] shadow-[0_-8px_30px_rgb(0,0,0,0.04)] border-t border-border/40 pt-12 pb-16">
              <FluxWhyUs companyName={siteName} />
              <FluxReviews />
              <FluxFAQ companyName={siteName} />
            </div>

            <MegaFooter contactSettings={settings} tenantId={tenantId} />
          </div>
        ) : (
          <SmartLinkLanding 
            initialCatalog={catalog} 
            initialEmail={userEmail} 
            contactSettings={settings} 
            initialServiceId={initialServiceId} 
            initialNetworkId={currentNetwork.id}
            initialCategoryId={firstCatId}
            initialServices={initialServices}
            userBalanceCents={0}
            tenantId={tenantId}
            customHeroTitle={
              <>
                Продвижение <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-pink-500 dark:from-sky-400 dark:via-indigo-400 dark:to-pink-400">{currentNetwork.name}</span>
              </>
            }
            customHeroSubtitle={`Купить подписчиков, лайки, просмотры и активность в ${currentNetwork.name} с мгновенным автозапуском.`}
            seoHubContent={seoHub}
          />
        )}
      </main>
    </>
  );
}
