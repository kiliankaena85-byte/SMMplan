import { adminCatalogService } from '@/services/admin/catalog.service';
import { bulkUpdateMarkupAction } from '@/actions/admin/catalog';
import { ShoppingCart, AlertTriangle } from 'lucide-react';
import { SettingsProvider } from '@/lib/settings';
import Link from 'next/link';
import { SubmitButton } from '@/components/admin/submit-button';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/page-header';
import { CatalogTable } from '@/components/admin/catalog-table-v2';
import {
  TOTAL_MANDATORY_DEDUCTIONS,
  SAFETY_FLOOR_MARKUP,
} from '@/lib/financial-constants';
import type { CatalogServiceDTO } from '@/types/catalog.dto';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Safety floor multiplier: minimum markup that covers taxes + gateway + 100% margin
const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

type Props = {
  searchParams: Promise<{
    q?: string;
    cursor?: string;
    category?: string;
  }>;
};

export default async function AdminCatalogPage({ searchParams }: Props) {
  const session = await verifySession();
  const user = session ? await db.user.findUnique({ 
    where: { id: session.userId },
    include: { staffRole: { include: { permissions: true } } }
  }) : null;

  const isOwner = user?.role === 'OWNER';
  const permissions = user?.staffRole?.permissions || [];

  const canSeeRates = isOwner || permissions.some(p => p.section.toUpperCase() === 'FINANCE' && (p.canView || p.canEdit));
  const canEdit = isOwner || permissions.some(p => p.section.toUpperCase() === 'CATALOG' && p.canEdit);
  const canEditFinance = isOwner || permissions.some(p => p.section.toUpperCase() === 'FINANCE' && p.canEdit);

  const params = await searchParams;
  const search = params.q || '';
  const cursor = params.cursor || undefined;
  const categoryId = params.category || undefined;

  const [
    { items: rawServices, nextCursor, hasMore },
    usdToRub,
    categories,
    quarantineCount,
    stats,
    markupAnalytics
  ] = await Promise.all([
    adminCatalogService.listServices({
      search: search || undefined,
      categoryId,
      cursor,
      pageSize: 50,
    }),
    SettingsProvider.getExchangeRateUSD(),
    adminCatalogService.listCategories(),
    adminCatalogService.getQuarantineCount(),
    adminCatalogService.getCatalogStats(),
    adminCatalogService.getMarkupAnalytics(),
  ]);

  // Map to strict DTO — no raw Prisma objects on client
  const services: CatalogServiceDTO[] = rawServices.map(s => {
    const raw = s as any;
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
      isQuarantined: raw.isQuarantined ?? false,
      quarantineReason: raw.quarantineReason ?? null,
      isDripFeedEnabled: s.isDripFeedEnabled,
      isRefillEnabled: s.isRefillEnabled,
      isCancelEnabled: raw.isCancelEnabled ?? false,
      ordersCount: s._count?.orders ?? 0,
    };
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-muted/50/50 min-h-full pb-10">
      
      {/* LEFT PANE: Categories Sidebar */}
      <aside className="w-full md:w-[260px] flex-shrink-0 space-y-4">
        <Card className="shadow-sm border border-border sticky top-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Категории</h3>
            <div className="space-y-1 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <Link
                href="/admin/catalog"
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  !categoryId ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <span>Все услуги</span>
                <span className="opacity-70">{stats.totalServices}</span>
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/admin/catalog?category=${cat.id}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    categoryId === cat.id ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="truncate mr-2">{cat.name}</span>
                  <span className="opacity-70 flex-shrink-0">{cat.serviceCount}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Quick Stats Sidebar */}
        <Card className="shadow-sm border border-border">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Сводка</p>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Активных</span>
                <span className="font-mono font-bold text-success">{stats.activeServices}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">В карантине</span>
                <span className="font-mono font-bold text-warning">{quarantineCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Ср. Маржа</span>
                <span className="font-mono font-bold text-primary">x{markupAnalytics.averageMarkup.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="pt-3 border-t border-border/50 space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Константы</p>
              <div className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded-md border border-border/50 font-mono">
                💱 Курс USD/RUB: {usdToRub.toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* RIGHT PANE: Catalog Management */}
      <main className="flex-1 min-w-0 space-y-6">
        <AdminPageHeader 
          title="Управление каталогом" 
          description="Массовое управление ценами, категориями и статусом услуг."
          icon={ShoppingCart}
          action={
            <div className="flex gap-2">
               <Link href="/admin/catalog/quarantine">
                <Button
                  intent="outline"
                  size="sm"
                  className={`font-bold ${quarantineCount > 0 ? "border-amber-200 bg-warning/10 text-amber-700 hover:bg-warning/20" : ""}`}
                >
                  {quarantineCount > 0 ? `⚠️ КАРАНТИН (${quarantineCount})` : "Карантин пуст"}
                </Button>
              </Link>
            </div>
          }
        />

        {/* Anomaly / Loss Warning Banner */}
        {markupAnalytics.stats.loss > 0 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 shadow-sm animate-pulse-slow">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-900">Выявлены убыточные услуги</h3>
                <p className="text-xs text-rose-700 mt-1">
                  {markupAnalytics.stats.loss} услуг продаются ниже себестоимости (с учетом налогов и комиссий). 
                  Минимальный порог безубыточности: <span className="font-mono font-bold">x{SAFETY_MULTIPLIER.toFixed(2)}</span>.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {markupAnalytics.worstServices.slice(0, 3).map(s => (
                    <span key={s.id} className="text-[10px] px-2 py-1 rounded bg-destructive/20 text-rose-800 border border-destructive/30">
                      {s.name} (x{s.markup.toFixed(2)})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Bulk Tools */}
        <Card className="shadow-sm border border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Search Form */}
              <form className="flex-1 flex items-center p-3 gap-2">
                {categoryId && <input type="hidden" name="category" value={categoryId} />}
                <div className="relative flex-1">
                  <input
                    type="text"
                    name="q"
                    defaultValue={search}
                    placeholder="Поиск по названию или ID..."
                    className="w-full pl-9 pr-4 py-2 text-sm border-none bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                  <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <Button type="submit" intent="outline" size="sm">Найти</Button>
              </form>

              {/* Bulk Markup Tool */}
              {canEditFinance && (
                <form action={bulkUpdateMarkupAction} className="md:w-auto flex items-center p-3 gap-3 bg-muted/50/50">
                  {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight hidden lg:inline">Массовая маржа:</span>
                  <input 
                    type="number" step="0.1" name="markup" required 
                    placeholder="Множитель" 
                    className="w-24 px-2 py-1.5 text-xs font-mono border border-border rounded-md outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                  <SubmitButton size="sm" variant={categoryId ? "default" : "outline"} confirmMessage={categoryId ? "Применить маржу к выбранной категории?" : "ВНИМАНИЕ: Это изменит наценку ДЛЯ ВСЕХ УСЛУГ В БАЗЕ. Продолжить?"}>
                    Применить
                  </SubmitButton>
                </form>
              )}
            </div>
          </CardContent>
        </Card>

        <CatalogTable services={services} usdToRub={usdToRub} canEdit={canEdit} canEditFinance={canEditFinance} canSeeRates={canSeeRates} />
        
        {/* Pagination / Load More */}
        {hasMore && (
           <div className="flex justify-center pt-4">
             <Link href={`/admin/catalog?cursor=${nextCursor}${categoryId ? `&category=${categoryId}` : ''}${search ? `&q=${search}` : ''}`}>
               <Button intent="outline" size="sm" className="bg-background">Загрузить еще...</Button>
             </Link>
           </div>
        )}
      </main>
    </div>
  );
}
