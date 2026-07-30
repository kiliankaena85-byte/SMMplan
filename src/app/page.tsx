import { getPublicCatalogAction } from "@/actions/order/catalog";
import { getBaseUrlAsync } from "@/utils/get-base-url";
import { SmartLinkLanding } from "@/components/landing/SmartLinkLanding";
import { Header } from "@/components/landing/Header";
import { MegaFooter } from "@/components/landing/MegaFooter";
import { FluxOrderClient } from "@/components/ab-test/FluxOrderClient";
import { FluxTrustBar } from "@/components/ab-test/FluxTrustBar";
import { FluxWhyUs } from "@/components/ab-test/FluxWhyUs";
import { FluxReviews } from "@/components/ab-test/FluxReviews";
import { FluxFAQ } from "@/components/ab-test/FluxFAQ";
import { ROUTES } from "@/lib/routes";
import { SettingsProvider } from "@/lib/settings";
import { TENANTS } from "@/config/tenants";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { normalizeTenantId } from "@/lib/tenant-resolver";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const settings = await SettingsProvider.getContactAndLegalSettings();
  const siteName = settings.SITE_NAME || "SMMplan";
  
  return {
    title: `Продвижение подписчиков и просмотров в Telegram, Instagram, VK | ${siteName}`,
    description: settings.SITE_DESCRIPTION || "Оптовая B2B платформа продвижения в соцсетях. Надежно и конфиденциально. Мгновенный старт.",
    alternates: { canonical: '/' },
    openGraph: {
      title: `${siteName} — Продвижение в соцсетях`,
      description: settings.SITE_DESCRIPTION || "Профессиональная продвижение подписчиков, просмотров, лайков для бизнеса.",
      type: "website",
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
  const tenantId = normalizeTenantId(reqHeaders.get("x-tenant-id")) || "smmplan";

  const userBalanceCents = 0;
  const catalogResult = await getPublicCatalogAction(tenantId);
  const catalog = catalogResult.success && catalogResult.data ? catalogResult.data : [];
  
  const settings = await SettingsProvider.getContactAndLegalSettings();
  const tenantConfig = TENANTS.find(t => t.id === tenantId);
  const siteName = tenantConfig?.name || settings.SITE_NAME || "SMMplan";
  const baseUrl = await getBaseUrlAsync();

  // Resolve user session and email
  const session = await verifySession();
  let userEmail: string | undefined = undefined;
  if (session?.userId) {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { email: true }
    });
    if (user) {
      userEmail = user.email;
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteName,
            url: baseUrl,
            potentialAction: {
              "@type": "SearchAction",
              target: `${baseUrl}/?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      
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
      <main id="main-content" tabIndex={-1} className="outline-none">
        {tenantId === "flux" ? (
          <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-x-clip">
            {/* ── LOVABLE VIBRANT HERO BACKGROUND (Full Bleed - GPU Optimized Static Layer) ── */}
            <div className="absolute top-0 inset-x-0 h-[2500px] z-0 pointer-events-none overflow-hidden select-none bg-white dark:bg-default-50">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(60% 50% at 10% 0%, rgba(59, 130, 246, 0.35), transparent 60%), ' +
                    'radial-gradient(50% 50% at 90% 10%, rgba(56, 189, 248, 0.30), transparent 60%), ' +
                    'radial-gradient(60% 50% at 15% 50%, rgba(244, 63, 94, 0.28), transparent 60%), ' +
                    'radial-gradient(50% 50% at 85% 60%, rgba(249, 115, 22, 0.28), transparent 60%), ' +
                    'radial-gradient(60% 60% at 50% 30%, rgba(217, 70, 239, 0.28), transparent 60%)',
                }}
              />
              <div className="absolute bottom-0 inset-x-0 h-[400px] bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            <div className="relative z-10 w-full">
              <Header initialEmail={userEmail} siteName={siteName} tenantId={tenantId} activePath={ROUTES.HOME} />
            </div>

            <div className="flex-1 w-full max-w-screen-2xl mx-auto px-4 pt-4 md:pt-12 pb-8 md:pb-16 flex flex-col items-center relative z-10">
              <FluxOrderClient initialCatalog={catalog} initialEmail={userEmail} />
            </div>

            <div className="relative z-10 w-full mb-8 md:mb-12">
              <FluxTrustBar />
            </div>

            {/* Solid Underlay for lower page section */}
            <div className="relative z-10 bg-white dark:bg-content1 mx-2 sm:mx-4 lg:mx-6 rounded-t-[32px] md:rounded-t-[48px] shadow-[0_-8px_30px_rgb(0,0,0,0.04)] pt-12 pb-16">
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
            initialCategoryId={initialCategoryId}
            initialNetworkId={initialNetworkId}
            userBalanceCents={userBalanceCents}
            tenantId={tenantId}
          />
        )}
      </main>
    </>
  );
}
