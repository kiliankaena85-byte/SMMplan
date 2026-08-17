import { getGapAnalysisAction } from '@/actions/admin/catalog/sync';
import { SyncTable } from './sync-table';
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs';

export const dynamic = 'force-dynamic';

export default async function CatalogSyncPage() {
  const result = await getGapAnalysisAction();
  const rows = result.rows ?? [];
  const stats = result.stats ?? { smmplan: 0, flux: 0, gap: 0, both: 0 };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      <AdminBreadcrumbs 
        items={[
          { label: 'Каталог услуг', href: '/admin/catalog' },
          { label: 'Синхронизация SMMplan & SMMflux' },
        ]} 
      />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Синхронизация каталогов SMMplan & SMMflux</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Анализ расхождений (gap analysis), копирование услуг и выравнивание цен между сайтами.
        </p>
      </div>
      <SyncTable rows={rows} stats={stats} />
    </div>
  );
}
