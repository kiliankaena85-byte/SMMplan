import { getPublicCatalogAction } from "@/actions/order/catalog";
import { SmartLinkLanding } from "@/components/landing/SmartLinkLanding";

export const revalidate = 3600;

export const metadata = {
  title: "Накрутка подписчиков и просмотров в Telegram, Instagram, VK | Smmplan",
  description: "Оптовая B2B платформа продвижения в соцсетях. Надежно и конфиденциально. Мгновенный старт.",
  openGraph: {
    title: "Smmplan — Продвижение в соцсетях",
    description: "Профессиональная накрутка подписчиков, просмотров, лайков для бизнеса.",
    type: "website",
  },
};

export default async function Home() {
  const catalogResult = await getPublicCatalogAction();
  const catalog = catalogResult.success && catalogResult.data ? catalogResult.data : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Smmplan",
            url: "https://smmplan.pro",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://smmplan.pro/?q={search_term_string}",
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
      <SmartLinkLanding initialCatalog={catalog} />
    </>
  );
}
