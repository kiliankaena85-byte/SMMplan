import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { CATALOG_TABS } from '@/components/admin/navigation-data';
import { getFullMarketOverview } from '@/actions/admin/market-intelligence';
import { IntelDashboard } from './intel-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminIntelPage() {
  const { comparisons, competitors, executiveSummary } = await getFullMarketOverview();

  return (
    <div className="space-y-6">
      <AdminTabbedHeader
        title="Конкурентная разведка & Радар рынка"
        description="Сравнительный анализ розничных цен с прямыми конкурентами (PrimeLike, DoctorSMM, TapLike) и поиск упущенной прибыли."
        tabs={CATALOG_TABS}
      />

      <IntelDashboard
        initialComparisons={comparisons}
        initialCompetitors={competitors}
        executiveSummary={executiveSummary}
      />
    </div>
  );
}
