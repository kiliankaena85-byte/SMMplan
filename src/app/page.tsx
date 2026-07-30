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
  const siteName = settings.SITE_NAME || "SMMplan";
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
            <Header initialEmail={userEmail} siteName={siteName} tenantId={tenantId} activePath={ROUTES.HOME} />
            <FluxOrderClient initialCatalog={catalog} initialEmail={userEmail} />
            <FluxTrustBar />
            <FluxWhyUs companyName={siteName} />
            <FluxReviews />
            <FluxFAQ companyName={siteName} />
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
