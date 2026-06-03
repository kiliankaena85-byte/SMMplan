import { getPublicCatalogAction } from "@/actions/order/catalog";
import { SmartLinkLanding } from "@/components/landing/SmartLinkLanding";
import { SettingsProvider } from "@/lib/settings";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const settings = await SettingsProvider.getContactAndLegalSettings();
  const siteName = settings.SITE_NAME || "Smmplan";
  
  return {
    title: `Накрутка подписчиков и просмотров в Telegram, Instagram, VK | ${siteName}`,
    description: settings.SITE_DESCRIPTION || "Оптовая B2B платформа продвижения в соцсетях. Надежно и конфиденциально. Мгновенный старт.",
    openGraph: {
      title: `${siteName} — Продвижение в соцсетях`,
      description: settings.SITE_DESCRIPTION || "Профессиональная накрутка подписчиков, просмотров, лайков для бизнеса.",
      type: "website",
    },
  };
}

export default async function Home() {
  const catalogResult = await getPublicCatalogAction();
  const catalog = catalogResult.success && catalogResult.data ? catalogResult.data : [];
  
  const settings = await SettingsProvider.getContactAndLegalSettings();
  const siteName = settings.SITE_NAME || "Smmplan";
  const supportDomain = await SettingsProvider.getSupportEmailDomain();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${supportDomain}`;

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
        <h1>Накрутка подписчиков и просмотров в соцсетях</h1>
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
        <SmartLinkLanding initialCatalog={catalog} initialEmail={userEmail} contactSettings={settings} />
      </main>
    </>
  );
}
