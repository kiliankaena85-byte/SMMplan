import { db } from "@/lib/db";
import { CategoryManager } from "./components/category-manager";
import { Layers } from "lucide-react";
import { AdminTabbedHeader } from "@/components/admin/tabbed-header";
import { CATALOG_TABS, ONBOARDING_CONFIGS } from "@/components/admin/navigation-data";

export const dynamic = "force-dynamic";

export default async function CategoriesAdminPage() {
  const categories = await db.category.findMany({
    orderBy: [
      { network: { slug: 'asc' } },
      { sort: 'asc' }
    ],
    include: {
      network: true,
      _count: { select: { services: true } }
    }
  });

  const networks = await db.network.findMany({ orderBy: { sort: 'asc' } });

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminTabbedHeader
        icon={Layers}
        title="Управление Категориями"
        description="Группировка, сортировка и объединение услуг по социальным сетям."
        tabs={CATALOG_TABS}
        onboardingKey="catalog"
        onboarding={ONBOARDING_CONFIGS.catalog}
      />

      <CategoryManager categories={categories} networks={networks} />
    </div>
  );
}

