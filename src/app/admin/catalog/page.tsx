import { adminCatalogService } from '@/services/admin/catalog.service';
import { bulkUpdateMarkupAction } from '@/actions/admin/catalog';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { SubmitButton } from '@/components/admin/submit-button';
import {
  Card as HeroCard,
  CardContent,
  Button as HeroButton
} from "@/components/admin/hero-ui";
import { AdminPageHeader } from '@/components/admin/page-header';
import { CatalogTable } from '@/components/admin/catalog-table-v2';
import {
  TOTAL_MANDATORY_DEDUCTIONS,
  SAFETY_FLOOR_MARKUP,
  USD_TO_RUB,
} from '@/lib/financial-constants';
import type { CatalogServiceDTO } from '@/types/catalog.dto';

export const dynamic = 'force-dynamic';


// Exchange rate: Imported from financial constants

function calcSellingPrice(ratePerK: number, markup: number, usdToRub: number): number {
  return ratePerK * markup * usdToRub;
}

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
  const params = await searchParams;
  const search = params.q || '';
  const cursor = params.cursor || undefined;
  const categoryId = params.category || undefined;

  const { items: rawServices, nextCursor, hasMore } = await adminCatalogService.listServices({
    search: search || undefined,
    categoryId,
    cursor,
    pageSize: 50,
  });

  // Map to strict DTO — no raw Prisma objects on client
  const services: CatalogServiceDTO[] = rawServices.map(s => {
    // CatalogRow has `category: { id, name }`, not categoryId directly
    const raw = s as typeof s & {
      isQuarantined?: boolean;
      quarantineReason?: string | null;
      isCancelEnabled?: boolean;
    };
    return {
      id: s.id,
      numericId: s.numericId,
      name: s.name,
      externalId: s.externalId ?? null,
      categoryId: s.category.id,
      categoryName: s.category.name,
      networkSlug: null,
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

  const [categories, quarantineCount, stats, markupAnalytics] = await Promise.all([
    adminCatalogService.listCategories(),
    adminCatalogService.getQuarantineCount(),
    adminCatalogService.getCatalogStats(),
    adminCatalogService.getMarkupAnalytics(),
  ]);


  return (
    <div className="flex flex-col md:flex-row gap-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-slate-50/50 min-h-full pb-10">
      
      {/* LEFT PANE: Categories Sidebar */}
      <aside className="w-full md:w-[260px] flex-shrink-0 space-y-4">
        <HeroCard className="shadow-sm border border-default-200 sticky top-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-default-800 mb-3 uppercase tracking-wider">Категории</h3>
            <div className="space-y-1 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <Link
                href="/admin/catalog"
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${!categoryId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <span>Все услуги</span>
                <span className="text-xs bg-slate-200/60 text-slate-500 px-1.5 py-0.5 rounded-full">{stats.totalServices}</span>
              </Link>
              {quarantineCount > 0 && (
                <Link
                  href="/admin/catalog/quarantine"
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-amber-700 bg-amber-50 hover:bg-amber-100 font-medium"
                >
                  <span>⚠️ Карантин</span>
                  <span className="text-xs bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">{quarantineCount}</span>
                </Link>
              )}
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/admin/catalog?category=${cat.id}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${categoryId === cat.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  <span className="truncate pr-2">{cat.name}</span>
                  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{cat.serviceCount}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </HeroCard>
      </aside>


      {/* RIGHT PANE: Main Content */}
      <main className="flex-1 space-y-6 overflow-x-auto">
        <AdminPageHeader
          icon={ShoppingCart}
          title="Каталог услуг"
          description={`Всего: ${stats.totalServices} • Активных: ${stats.activeServices} • Категорий: ${stats.categories}`}
          action={(
            <div className="flex gap-3">
              <Link href="/admin/providers">
                <HeroButton variant="secondary" className="font-medium bg-white">
                  Настройка панелей
                </HeroButton>
              </Link>
              <Link href="/admin/catalog/categories">
                <HeroButton variant="primary" className="font-medium shadow-sm">
                  Категории
                </HeroButton>
              </Link>
            </div>
          )}
        />

        {/* Markup Analytics Compact Strip using HeroUI Card */}
        <HeroCard className="shadow-sm border border-default-200">
          <CardContent className="flex flex-row flex-wrap items-center gap-x-6 gap-y-3 p-4 text-sm">
            <div className="flex items-center gap-2 pr-6 border-r border-default-200 font-semibold tabular-nums">
              <ShoppingCart className="w-4 h-4 text-default-400" /> {markupAnalytics.stats.total} Услуг
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-danger shadow-[0_0_8px_rgba(243,18,96,0.4)]" /> 
              <span className="text-default-500">Убыток:</span> 
              <strong className="tabular-nums">{markupAnalytics.stats.loss}</strong>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-warning" /> 
               <span className="text-default-500">Тонкая:</span> 
               <strong className="tabular-nums">{markupAnalytics.stats.thin}</strong>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-success" /> 
               <span className="text-default-500">Норма:</span> 
               <strong className="tabular-nums">{markupAnalytics.stats.normal}</strong>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-primary" /> 
               <span className="text-default-500">Высокая:</span> 
               <strong className="tabular-nums">{markupAnalytics.stats.high}</strong>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-secondary" /> 
               <span className="text-default-500">Топ:</span> 
               <strong className="tabular-nums">{markupAnalytics.stats.extreme}</strong>
            </div>
          </CardContent>
        </HeroCard>

        {markupAnalytics.stats.loss > 0 && (
          <div className="rounded-lg border border-rose-200/50 bg-rose-50/50 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-rose-800 mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> 
              Услуги с наценкой ниже Safety Floor (убыточные после налогов):
            </h3>
            <div className="text-sm text-slate-600 space-y-1.5 pl-3.5">
              {markupAnalytics.worstServices.slice(0, 5).map(ws => (
                <div key={ws.id}>
                  &bull; <strong className="text-slate-800">{ws.name}</strong> 
                  <span className="text-rose-600 font-medium ml-1">— x{ws.markup.toFixed(1)}</span> 
                  <span className="text-slate-400"> (нужно мин. x{SAFETY_MULTIPLIER.toFixed(1)}) </span> 
                  <span className="text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-1">{ws.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exchange Rate Info */}
        <div className="text-xs text-slate-400 text-right">
          💱 Курс USD/RUB: {USD_TO_RUB.toFixed(2)} (из настроек)
        </div>

        {/* Search & Bulk Actions */}
        <HeroCard className="mb-4 shadow-sm border border-default-200">
          <CardContent className="p-4 flex flex-col lg:flex-row gap-4 justify-between lg:items-center">
            <form className="flex gap-4 lg:max-w-md w-full">
              {categoryId && <input type="hidden" name="category" value={categoryId} />}
              <input
                type="text"
                name="q"
                defaultValue={search}
                placeholder="🔍 Поиск по названию или ID..."
                className="flex-1 px-4 py-2 text-sm border border-default-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-default-50"
              />
              <HeroButton type="submit" variant="primary">Найти</HeroButton>
            </form>

            <div className="hidden lg:block w-px h-8 bg-default-200" />

            {/* This bulk action should ideally target the current filtered view, not ALL */}
            <form action={bulkUpdateMarkupAction} className="flex gap-3 items-center bg-default-50/50 border border-default-200 px-3 py-1.5 rounded-lg">
              {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
              <span className="text-sm font-semibold text-default-700 whitespace-nowrap">
                {categoryId ? 'Bulk маржа (текущая категория):' : 'Bulk маржа (ВЕСЬ КАТАЛОГ):'}
              </span>
              <input 
                type="number" 
                step="0.1" 
                name="markup" 
                required 
                placeholder="Множитель (напр. 3.5)" 
                className="px-2 py-1.5 text-sm font-mono border border-default-200 bg-white rounded focus:ring-2 focus:ring-primary outline-none w-40" 
              />
              <SubmitButton size="sm" variant={categoryId ? "default" : "outline"} className={categoryId ? "" : "border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"} confirmMessage={categoryId ? "Применить маржу к выбранной категории?" : "Вы уверены, что хотите применить этот множитель наценки КО ВСЕМ УСЛУГАМ?"}>
                Применить
              </SubmitButton>
            </form>
          </CardContent>
        </HeroCard>
        <CatalogTable services={services} />

        {/* Pagination / Table Footer */}
        {(cursor || hasMore) && (
          <div className="flex justify-between items-center bg-default-50/50 px-4 py-3 border border-default-200 mt-4 rounded-lg">
            {cursor ? (
              <Link href={`/admin/catalog?q=${encodeURIComponent(search)}${categoryId ? `&category=${categoryId}` : ''}`}
                className="px-3 py-1.5 text-xs font-semibold text-default-600 bg-background border border-default-300 rounded hover:bg-default-100 shadow-sm transition-all">
                ← В начало
              </Link>
            ) : <div />}
            {hasMore && nextCursor && (
              <Link href={`/admin/catalog?q=${encodeURIComponent(search)}${categoryId ? `&category=${categoryId}` : ''}&cursor=${nextCursor}`}
                className="px-3 py-1.5 text-xs font-semibold text-default-700 bg-background border border-default-300 rounded hover:bg-default-100 shadow-sm transition-all">
                Дальше →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
