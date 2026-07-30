import { getGapAnalysisAction } from '@/actions/admin/catalog/sync';
import { SyncTable } from './sync-table';

export default async function CatalogSyncPage() {
  const result = await getGapAnalysisAction();
  const rows = result.rows ?? [];
  const stats = result.stats ?? { smmplan: 0, flux: 0, gap: 0, both: 0 };

  return (
    <div className="p-6 space-y-6">
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
