import { getPublicCatalogAction } from "@/actions/order/catalog";
import Link from "next/link";

export const revalidate = 3600;

export const metadata = {
  title: "Каталог услуг SMM | Smmplan",
  description: "Премиальная розничная панель продвижения в соцсетях. Заказ от 1 штуки, гарантия качества, надежность и удобный сервис. Выберите социальную сеть.",
};

export default async function ServicesCatalogPage() {
  const catalogResult = await getPublicCatalogAction();
  const networks = catalogResult.success && catalogResult.data ? catalogResult.data : [];

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Услуги продвижения
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Выберите социальную сеть для просмотра доступных услуг накрутки и продвижения.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-8">
          {networks.map((network) => (
            <Link 
              key={network.id} 
              href={`/services/${network.slug}`}
              className="group flex flex-col items-center justify-center p-8 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200"
            >
              <div className="w-16 h-16 mb-4 flex items-center justify-center bg-muted rounded-full group-hover:bg-primary/10 transition-colors">
                <span className="text-3xl">
                  {network.slug.includes('instagram') && '📸'}
                  {network.slug.includes('telegram') && '✈️'}
                  {network.slug.includes('vk') && '🔵'}
                  {network.slug.includes('youtube') && '▶️'}
                  {network.slug.includes('tiktok') && '🎵'}
                  {network.slug.includes('twitter') && '🐦'}
                  {!['instagram', 'telegram', 'vk', 'youtube', 'tiktok', 'twitter'].some(s => network.slug.includes(s)) && '🌐'}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                {network.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {network.categories.length} категорий
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
