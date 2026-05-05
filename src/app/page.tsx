import { getPublicCatalogAction } from "@/actions/order/catalog";
import { LandingPage } from "@/components/landing/LandingPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Накрутка подписчиков и просмотров в Telegram, Instagram, VK | Smmplan",
  description: "Быстрое продвижение в соцсетях. От 50₽ за 1000 подписчиков. 1M+ выполненных заказов. Мгновенный старт.",
  openGraph: {
    title: "Smmplan — Продвижение в соцсетях",
    description: "Накрутка подписчиков, просмотров, лайков. Гарантия и автовосстановление.",
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
            url: "https://smmplan.ru",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://smmplan.ru/?q={search_term_string}",
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
      <LandingPage initialServices={catalog} />
    </>
  );
}
