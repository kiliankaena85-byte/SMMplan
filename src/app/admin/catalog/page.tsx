import { adminCatalogService } from '@/services/admin/catalog.service';
import { adminProviderService } from '@/services/admin/provider.service';
import { bulkUpdateMarkupAction } from '@/actions/admin/catalog';
import { ShoppingCart, AlertTriangle } from 'lucide-react';
import { SettingsProvider } from '@/lib/settings';
import Link from 'next/link';
import { SubmitButton } from '@/components/admin/submit-button';
import { Button } from '@/components/ui/button';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { CATALOG_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';
import { CatalogTable } from '@/components/admin/catalog-table-v2';
import { CatalogPagination } from '@/components/admin/catalog/catalog-pagination';

import {
  TOTAL_MANDATORY_DEDUCTIONS,
  SAFETY_FLOOR_MARKUP,
} from '@/lib/financial-constants';
import type { CatalogServiceDTO } from '@/types/catalog.dto';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';

import { headers } from 'next/headers';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { TenantSwitcher } from '@/components/admin/tenant-switcher';

export const dynamic = 'force-dynamic';

// Safety floor multiplier: minimum markup that covers taxes + gateway + 100% margin
const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

type Props = {
  searchParams: Promise<{
    q?: string;
    cursor?: string;
    category?: string;
    providerId?: string;
    isActive?: string;
    hideDeleted?: string;
    providerStatus?: string;
    externalId?: string;
    sortBy?: string;
    sortOrder?: string;
    platform?: string;
    tenant?: string;
  }>;
};

export default async function AdminCatalogPage({ searchParams }: Props) {
  const reqHeaders = await headers();
  const session = await verifySession();
  const user = session ? await db.user.findUnique({ 
    where: { id: session.userId },
    include: { staffRole: { include: { permissions: true } } }
  }) : null;

  const isSuperAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const permissions = user?.staffRole?.permissions || [];

  const canSeeRates = isSuperAdmin || permissions.some(p => p.section.toUpperCase() === 'FINANCE' && (p.canView || p.canEdit));
  const canEdit = isSuperAdmin || permissions.some(p => p.section.toUpperCase() === 'CATALOG' && p.canEdit);
  const canEditFinance = isSuperAdmin || permissions.some(p => p.section.toUpperCase() === 'FINANCE' && p.canEdit);

  const params = await searchParams;
  const selectedTenant = params.tenant || normalizeTenantId(reqHeaders.get('x-tenant-id')) || 'smmplan';
  const search = params.q || '';
  const cursor = params.cursor || undefined;
  const categoryId = params.category || undefined;
  const providerId = params.providerId || undefined;
  const isActiveStr = params.isActive || undefined;
  const isActive = isActiveStr === 'true' ? true : isActiveStr === 'false' ? false : undefined;
  const hideDeleted = params.hideDeleted === 'true';
  const providerStatus = params.providerStatus || undefined;
  const externalId = params.externalId || undefined;
  const sortBy = params.sortBy || undefined;
  const sortOrder = (params.sortOrder === 'asc' || params.sortOrder === 'desc') ? (params.sortOrder as 'asc' | 'desc') : undefined;
  const platform = params.platform || undefined;

  const [
    { items: rawServices, nextCursor, hasMore },
    usdToRub,
    categories,
    quarantineCount,
    stats,
    markupAnalytics,
    providers,
    networks
  ] = await Promise.all([
    adminCatalogService.listServices({
      search: search || undefined,
      categoryId,
      providerId,
      isActive,
      hideDeleted,
      providerStatus,
      externalId,
      cursor,
      pageSize: 50,
      sortBy,
      sortOrder,
      networkSlug: platform,
      tenantId: selectedTenant,
    }),
    SettingsProvider.getExchangeRateUSD(),
    adminCatalogService.listCategories(),
    adminCatalogService.getQuarantineCount(selectedTenant),
    adminCatalogService.getCatalogStats(selectedTenant),
    adminCatalogService.getMarkupAnalytics(selectedTenant),
    adminProviderService.listProviders(),
    db.network.findMany({ orderBy: { sort: 'asc' } }),
  ]);

  // Map to strict DTO — no raw Prisma objects on client
  const services: CatalogServiceDTO[] = rawServices.map(s => {
        
    return {
      id: s.id,
      numericId: s.numericId,
      name: s.name,
      externalId: s.externalId ?? null,
      categoryId: s.category.id,
      categoryName: s.category.name,
      networkName: s.category.network?.name ?? null,
      networkSlug: s.category.network?.slug ?? null,
      rate: s.rate,
      markup: s.markup,
      minQty: s.minQty,
      maxQty: s.maxQty,
      isActive: s.isActive,
      isQuarantined: !!s.isQuarantined,
      quarantineReason: s.quarantineReason ?? null,
      isDripFeedEnabled: s.isDripFeedEnabled,
      isRefillEnabled: s.isRefillEnabled,
      isCancelEnabled: !!s.isCancelEnabled,
      ordersCount: s._count?.orders ?? 0,
      description: s.description ?? null,
      targetType: s.targetType ?? null,
      customDataType: s.customDataType ?? "NONE",
      customDataLabel: s.customDataLabel ?? null,
      isMediaGroupAware: !!s.isMediaGroupAware,
      providerId: s.providerId ?? null,
      requireWarning: !!s.requireWarning,
      warningMessage: s.warningMessage ?? null,
      cooldownReason: s.cooldownReason ?? null,
      qualityTier: s.qualityTier ?? null,
      createdAt: s.createdAt ?? null,
    };
  });
  return (
    <div className="flex flex-col gap-3 w-full animate-in fade-in duration-300">
      {/* Clean Modern Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-4.5 h-4.5 text-primary" />
              Каталог услуг
            </h1>
            <span className="text-[11px] font-mono font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">
              {stats.totalServices} услуг
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 font-medium">
            <span>Активных: <b className="text-emerald-500 font-bold">{stats.activeServices}</b></span>
            <span>·</span>
            <span>Ср. маржа: <b className="text-primary font-bold">x{markupAnalytics.averageMarkup.toFixed(2)}</b></span>
            <span>·</span>
            <span>Курс USD: <b className="font-bold text-foreground">{usdToRub.toFixed(2)} ₽</b></span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {quarantineCount > 0 && (
            <Link href={`/admin/catalog/quarantine?tenant=${selectedTenant}`}>
              <Button
                intent="outline"
                size="sm"
                className="font-bold h-9 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
              >
                ⚠️ Карантин ({quarantineCount})
              </Button>
            </Link>
          )}
          <Link href={`/admin/providers/import?tenant=${selectedTenant}`}>
            <Button
              intent="outline"
              size="sm"
              className="font-bold h-9 bg-background text-muted-foreground hover:text-foreground"
            >
              Импорт услуг
            </Button>
          </Link>
          <Link href="/admin/catalog/new">
            <Button
              intent="primary"
              size="sm"
              className="font-bold h-9"
            >
              + Создать услугу
            </Button>
          </Link>
        </div>
      </div>

      {/* Direct Catalog Table with 2x4 Filters and Service Rows */}
      <CatalogTable 
        services={services} 
        usdToRub={usdToRub} 
        canEdit={canEdit} 
        canEditFinance={canEditFinance} 
        canSeeRates={canSeeRates} 
        categories={categories}
        providers={providers}
        networks={networks}
      />
      
      {/* Modular Pagination with Progress & Active Filters */}
      <CatalogPagination
        totalCount={stats.totalServices}
        currentCount={services.length}
        hasMore={hasMore}
        nextCursor={nextCursor}
        selectedTenant={selectedTenant}
      />
    </div>
  );
}
