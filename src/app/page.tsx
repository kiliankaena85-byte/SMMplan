import { getPublicCatalogAction, getServicesByCategoryAction } from "@/actions/order/catalog";
import { getBaseUrlAsync } from "@/utils/get-base-url";
import { SmartLinkLanding } from "@/components/landing/SmartLinkLanding";
import dynamicImport from "next/dynamic";
import { Header } from "@/components/landing/Header";
import { FluxOrderClient } from "@/components/ab-test/FluxOrderClient";
import { FluxTrustBar } from "@/components/ab-test/FluxTrustBar";

import { PreLaunchHoldingScreen } from "@/components/landing/PreLaunchHoldingScreen";
const FluxWhyUs = dynamicImport(() => import("@/components/ab-test/FluxWhyUs").then(m => m.FluxWhyUs));
const FluxReviews = dynamicImport(() => import("@/components/ab-test/FluxReviews").then(m => m.FluxReviews));
const FluxFAQ = dynamicImport(() => import("@/components/ab-test/FluxFAQ").then(m => m.FluxFAQ));
const MegaFooter = dynamicImport(() => import("@/components/landing/MegaFooter").then(m => m.MegaFooter));

import { ROUTES } from "@/lib/routes";
import { SettingsProvider } from "@/lib/settings";
import { TENANTS } from "@/config/tenants";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { headers, cookies } from "next/headers";
import { absoluteCanonical, getTenantSiteName, normalizeTenantId } from "@/lib/seo-helpers";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const reqHeaders = await headers();
  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id')) || 'smmplan';
  const settings = await SettingsProvider.getContactAndLegalSettings();
  const siteName = getTenantSiteName(tenantId) || settings.SITE_NAME || "SMMplan";
  const canonical = absoluteCanonical(tenantId, '/');
  
  const ogUrl = `${canonical.replace(/\/$/, '')}/api/og?tenant=${tenantId}&title=${encodeURIComponent(siteName + ' — Продвижение в соцсетях')}&subtitle=${encodeURIComponent(tenantId === 'flux' ? 'Экспресс-витрина от 1 шт • Без паролей • Мгновенный старт' : 'Оптовая API платформа от 1 шт • REST API v2 • Моментальный запуск')}&price=${encodeURIComponent('0.01 ₽ / шт')}`;
  
  return {
    title: `Продвижение подписчиков и просмотров в Telegram, Instagram, VK | ${siteName}`,
    description: settings.SITE_DESCRIPTION || "Оптовая платформа продвижения в соцсетях. Надежно и конфиденциально. Мгновенный старт.",
    alternates: { canonical },
    openGraph: {
      title: `${siteName} — Продвижение в соцсетях`,
      description: settings.SITE_DESCRIPTION || "Профессиональное продвижение подписчиков, просмотров, лайков для бизнеса.",
      url: canonical,
      siteName,
      type: "website",
      locale: "ru_RU",
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `${siteName} — Продвижение в соцсетях`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} — Продвижение в соцсетях`,
      description: settings.SITE_DESCRIPTION || "Профессиональное продвижение подписчиков, просмотров, лайков для бизнеса.",
      images: [ogUrl],
    },
  };
}

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const initialServiceId = typeof params.serviceId === 'string' ? params.serviceId : undefined;
  let initialCategoryId: string | undefined = undefined;
  let initialNetworkId: string | undefined = undefined;

  if (initialServiceId) {
    const service = await db.service.findUnique({
      where: { id: initialServiceId },
      select: { categoryId: true, category: { select: { networkId: true } } }
    });
    if (service) {
      initialCategoryId = service.categoryId;
      initialNetworkId = service.category.networkId || undefined;
    }
  }

  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const host = reqHeaders.get("x-host") || reqHeaders.get("x-forwarded-host") || reqHeaders.get("host") || "";
  const cleanHost = host.split(":")[0].toLowerCase().trim();
  const tenantId = normalizeTenantId(reqHeaders.get("x-tenant-id")) || (params.tenant === "flux" ? "flux" : "smmplan");

  const cookieFlow = reqCookies.get("smmplan_order_flow")?.value;
  const flowParam = typeof params.flow === 'string' ? params.flow : undefined;
  const initialFlow = (flowParam === 'slide' || flowParam === 'classic')
    ? (flowParam as 'slide' | 'classic')
    : (cookieFlow === 'slide' || cookieFlow === 'classic')
      ? (cookieFlow as 'slide' | 'classic')
      : 'classic';

  const isProdHost = cleanHost === "smmplan.pro" || cleanHost === "www.smmplan.pro";
  const isHoldingParam = params.mode === "holding";
  const isHoldingMode = isHoldingParam || (isProdHost && params.contour !== "test");

  let userBalanceCents = 0;
  const [catalogResult, settings, session, baseUrl] = await Promise.all([
    getPublicCatalogAction(tenantId),
    SettingsProvider.getContactAndLegalSettings(),
    verifySession(),
    getBaseUrlAsync()
  ]);

  const catalog = catalogResult.success && catalogResult.data ? catalogResult.data : [];
  
  // SSR Pre-fetch default category services to eliminate client waterfall latency
  let targetCategoryId = initialCategoryId;
  let targetNetworkId = initialNetworkId;
  if (!targetCategoryId && catalog.length > 0) {
    const defaultNet = catalog.find(n => n.slug === 'telegram') || catalog[0];
    const defaultCat = defaultNet?.categories.find(c => c.name.toLowerCase().includes('подписчики')) || defaultNet?.categories[0];
    targetCategoryId = defaultCat?.id;
    targetNetworkId = defaultNet?.id;
  }
  const initialServices = targetCategoryId ? await getServicesByCategoryAction(targetCategoryId, tenantId) : [];

  const tenantConfig = TENANTS.find(t => t.id === tenantId);
  const siteName = tenantConfig?.name || settings.SITE_NAME || "SMMplan";

  // Resolve user session, email and balance
  let userEmail: string | undefined = undefined;
  if (session?.userId) {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { email: true, balance: true }
    });
    if (user) {
      userEmail = user.email;
      userBalanceCents = Number(user.balance);
    }
  }

  return (
    <>
      {/* Static SEO block visible only to search engines */}
      <section id="services-catalog" className="sr-only">
        <h1>Продвижение подписчиков и просмотров в соцсетях</h1>
        {catalog.map((network) => (
          <div key={network.id}>
            <h2>{network.name}</h2>
            <ul>
              {network.categories.map((category) => (
                <li key={category.id}>{category.name}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Interactive App */}
      <div id="main-content" tabIndex={-1} className="outline-none">
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
              {/* Saturated Mesh Color Orbs for signature punch & depth */}
              <div className="absolute top-0 left-0 w-[300px] sm:w-[500px] md:w-[700px] h-[300px] sm:h-[500px] md:h-[700px] rounded-full bg-blue-500/20 blur-[90px] sm:blur-[120px] pointer-events-none" />
              <div className="absolute top-4 left-[15%] w-[280px] sm:w-[450px] md:w-[600px] h-[280px] sm:h-[450px] md:h-[600px] rounded-full bg-purple-600/25 blur-[80px] sm:blur-[110px] pointer-events-none" />
              <div className="absolute top-0 right-0 w-[300px] sm:w-[500px] md:w-[650px] h-[300px] sm:h-[500px] md:h-[650px] rounded-full bg-pink-500/20 blur-[90px] sm:blur-[120px] pointer-events-none" />
              <div className="absolute top-20 right-[5%] w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] rounded-full bg-orange-400/15 blur-[70px] sm:blur-[90px] pointer-events-none" />

              <div className="absolute bottom-0 inset-x-0 h-[400px] bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            <div className="relative z-10 w-full">
              <Header initialEmail={userEmail} siteName={siteName} tenantId={tenantId} activePath={ROUTES.HOME} />
            </div>

            <div className="flex-1 w-full max-w-screen-2xl mx-auto px-4 pt-2 md:pt-6 pb-2 md:pb-4 flex flex-col items-center relative z-10">
              <FluxOrderClient 
                initialCatalog={catalog} 
                initialEmail={userEmail} 
                userBalanceCents={userBalanceCents} 
                tenantId={tenantId}
                initialNetworkId={initialNetworkId}
                initialCategoryId={initialCategoryId}
                initialServiceId={initialServiceId}
              />
            </div>

            <div className="relative z-10 w-full mt-4 mb-8 sm:mb-12">
              <FluxTrustBar />
            </div>

            {/* Solid Underlay for lower page section */}
            <div className="relative z-10 bg-card mx-2 sm:mx-4 lg:mx-6 rounded-t-[32px] md:rounded-t-[48px] shadow-[0_-8px_30px_rgb(0,0,0,0.04)] border-t border-border/40 pt-12 pb-16">
              <FluxWhyUs companyName={siteName} />
              <FluxReviews />
              <FluxFAQ companyName={siteName} />
            </div>

            <MegaFooter contactSettings={settings} tenantId={tenantId} />
          </div>
        ) : isHoldingMode ? (
          <PreLaunchHoldingScreen
            siteName={siteName}
            supportTelegram={settings.TELEGRAM_SUPPORT_BOT || "smmplan_support_bot"}
            supportEmail={settings.SUPPORT_EMAIL || "support@smmplan.pro"}
            tenantId={tenantId}
          />
        ) : (
          <SmartLinkLanding 
            initialCatalog={catalog} 
            initialEmail={userEmail} 
            contactSettings={settings} 
            initialServiceId={initialServiceId} 
            initialCategoryId={targetCategoryId}
            initialNetworkId={targetNetworkId}
            userBalanceCents={userBalanceCents}
            tenantId={tenantId}
            initialServices={initialServices}
            initialFlow={initialFlow}
          />
        )}
      </div>
    </>
  );
}
