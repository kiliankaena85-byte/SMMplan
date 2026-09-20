import { db } from '@/lib/db';
import { Globe } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { CATALOG_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';
import { enforceSectionAccess } from '@/lib/server/rbac';
import { NetworksClient } from './networks-client';

export const dynamic = 'force-dynamic';

export default async function NetworksAdminPage() {
  await enforceSectionAccess('catalog');

  const networks = await db.network.findMany({
    orderBy: { sort: 'asc' },
    include: {
      _count: {
        select: { categories: true },
      },
    },
  });

  const networksWithCounts = networks.map((n) => ({
    id: n.id,
    name: n.name,
    slug: n.slug,
    icon: n.icon ?? null,
    sort: n.sort,
    isActive: n.isActive ?? true,
    categoriesCount: n._count.categories,
  }));

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminTabbedHeader
        icon={Globe}
        title="Социальные сети"
        description="Справочник поддерживаемых соцсетей. Slug используется для маршрутизации услуг и паттернов ссылок."
        tabs={CATALOG_TABS}
        onboardingKey="catalog"
        onboarding={ONBOARDING_CONFIGS.catalog}
      />

      <NetworksClient networks={networksWithCounts} />
    </div>
  );
}
