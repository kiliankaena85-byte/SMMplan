import { getPublicCatalogAction, getServicesByCategoryAction } from "@/actions/order/catalog";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ network: string }> }): Promise<Metadata> {
  const { network } = await params;
  const catalogResult = await getPublicCatalogAction();
  const net = catalogResult.data?.find(n => n.slug === network);
  
  if (!net) return { title: "Сеть не найдена" };

  return {
    title: `Накрутка ${net.name} | Купить подписчиков и лайки | Smmplan`,
    description: `Премиальное продвижение в ${net.name}. Заказ от 1 штуки, гарантия качества, быстрый старт и удобный сервис.`,
  };
}

export default async function NetworkServicesPage({ params }: { params: Promise<{ network: string }> }) {
  const { network } = await params;
  const catalogResult = await getPublicCatalogAction();
  const networks = catalogResult.success && catalogResult.data ? catalogResult.data : [];
  
  const currentNetwork = networks.find(n => n.slug === network);
  if (!currentNetwork) notFound();

  // Parallel fetch services for all categories in this network
  const categoriesWithServices = await Promise.all(
    currentNetwork.categories.map(async (cat) => {
      const services = await getServicesByCategoryAction(cat.id);
      return { ...cat, services };
    })
  );

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
                <Link href="/services" className="hover:text-foreground transition-colors">Услуги</Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="mx-2">/</span>
                <span className="text-foreground font-medium">{currentNetwork.name}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Продвижение {currentNetwork.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Выберите нужную категорию и услугу для {currentNetwork.name}. Мы продаем поштучно — заказывайте ровно столько, сколько нужно. Гарантия качества и автоматический запуск.
          </p>
        </div>

        {/* Categories List */}
        <div className="space-y-16">
          {categoriesWithServices.map(category => {
            if (category.services.length === 0) return null;
            
            return (
              <section key={category.id} id={category.id} className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground border-b border-border pb-2">
                  {category.name}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.services.map(service => (
                    <div key={service.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 flex flex-col justify-between group">
                      <div>
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h3 className="font-medium text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors">
                            {service.name}
                          </h3>
                          {service.badge && (
                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {service.badge}
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-xs text-muted-foreground line-clamp-3 mb-4">
                            {service.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-4">
                           <span className="text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded-md">
                             От {service.minQty.toLocaleString('ru-RU')} шт.
                           </span>
                           <span className="text-[11px] text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md font-medium">
                             {service.speed}
                           </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                        <div className="text-sm whitespace-nowrap">
                          <span className="font-bold text-foreground text-lg">{(service.pricePer1kRub / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ₽</span>
                          <span className="text-muted-foreground text-xs ml-1">/ шт.</span>
                        </div>
                        <Link 
                          href={`/dashboard/new-order?serviceId=${service.id}`}
                          className="text-xs font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          Заказать
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
