import { db } from "@/lib/db";
import { adminProviderService } from "@/services/admin/provider.service";
import { FolderTree, Plus } from "lucide-react";
import { AdminTabbedHeader } from "@/components/admin/tabbed-header";
import { CATALOG_TABS, ONBOARDING_CONFIGS } from "@/components/admin/navigation-data";
import { CatalogTreeExplorer } from "./components/catalog-tree-explorer";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CatalogTreePage() {
  const [networks, providers] = await Promise.all([
    db.network.findMany({
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      include: {
        categories: {
          orderBy: [{ sort: "asc" }, { name: "asc" }],
          include: {
            services: {
              orderBy: { numericId: "asc" },
              include: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    balanceCurrency: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.provider.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        balanceCurrency: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Format data for Tree Explorer
  const formattedNetworks = networks.map((net) => ({
    id: net.id,
    name: net.name,
    slug: net.slug,
    icon: net.icon,
    sort: net.sort,
    categories: net.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      sort: cat.sort,
      requireWarning: cat.requireWarning,
      warningMessage: cat.warningMessage,
      analyzerTags: cat.analyzerTags,
      networkId: cat.networkId,
      services: cat.services.map((srv) => ({
        id: srv.id,
        numericId: srv.numericId,
        name: srv.name,
        rate: srv.rate,
        markup: srv.markup,
        pricePer1000Cents: srv.pricePer1000Cents,
        minQty: srv.minQty,
        maxQty: srv.maxQty,
        externalId: srv.externalId,
        targetType: srv.targetType,
        isActive: srv.isActive,
        isQuarantined: srv.isQuarantined,
        provider: srv.provider,
      })),
    })),
  }));

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminTabbedHeader
        icon={FolderTree}
        title="Дерево Каталога (Explorer)"
        description="Единый визуальный центр управления: Соцсети ➔ Категории ➔ Услуги"
        action={
          <div className="flex gap-3">
            <Link
              href="/admin/catalog/categories"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-muted-foreground bg-background/50 backdrop-blur-xs border border-border/60 shadow-xs rounded-xl hover:bg-muted/80 hover:text-primary transition-all duration-200 active:scale-95"
            >
              📁 Управление категориями
            </Link>
            <Link
              href="/admin/providers/import"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-primary-foreground bg-primary shadow-xs rounded-xl hover:opacity-90 transition-all duration-200 active:scale-95"
            >
              ⏬ Импорт от провайдеров
            </Link>
          </div>
        }
        tabs={CATALOG_TABS}
        onboardingKey="catalog"
        onboarding={ONBOARDING_CONFIGS.catalog}
      />

      <CatalogTreeExplorer
        networks={formattedNetworks}
        providers={providers}
      />
    </div>
  );
}
