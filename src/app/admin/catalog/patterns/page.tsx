import { db } from "@/lib/db";
import { Regex } from "lucide-react";
import { AdminTabbedHeader } from "@/components/admin/tabbed-header";
import { CATALOG_TABS, ONBOARDING_CONFIGS } from "@/components/admin/navigation-data";
import { PatternManagerClient } from "./components/pattern-manager-client";

export const dynamic = "force-dynamic";

export default async function LinkPatternsAdminPage() {
  const patterns = await db.urlPattern.findMany({
    include: {
      network: {
        select: { id: true, name: true, slug: true }
      }
    },
    orderBy: [
      { network: { name: 'asc' } },
      { sort: 'asc' },
      { createdAt: 'desc' }
    ]
  });

  const networks = await db.network.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' }
  });

  const formattedPatterns = patterns.map(p => ({
    id: p.id,
    networkId: p.networkId,
    networkName: p.network.name,
    networkSlug: p.network.slug,
    pattern: p.pattern,
    contentType: p.contentType,
    sort: p.sort,
    createdAt: p.createdAt.toISOString()
  }));

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminTabbedHeader
        icon={Regex}
        title="Анализатор Ссылок & RegEx Studio"
        description="Интеллектуальное распознавание форматов ссылок, No-Code маски, AI-генератор правил и ReDoS-защита."
        tabs={CATALOG_TABS}
        onboardingKey="catalog"
        onboarding={ONBOARDING_CONFIGS.catalog}
      />

      <PatternManagerClient
        initialPatterns={formattedPatterns}
        networks={networks}
      />
    </div>
  );
}
