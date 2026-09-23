import { adminMarketingService } from '@/services/admin/marketing.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, TrendingUp, Users, Wallet } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { FINANCE_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';
import { ReferralEconomicsChart } from './referral-chart';
import { formatRubles } from '@/utils/format-price';
import { enforceSectionAccess } from '@/lib/server/rbac';
import { ReferrersTable } from './client-referrers-table';

export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  const admin = await enforceSectionAccess('marketing');

  let stats, rawTopReferrers, chartData;
  
  try {
    [stats, rawTopReferrers, chartData] = await Promise.all([
      adminMarketingService.getReferralStats(),
      adminMarketingService.listTopReferrers(),
      adminMarketingService.getReferralChartData(),
    ]);
  } catch (error) {
    console.error('Failed to load marketing data:', error);
    throw new Error('Не удалось загрузить данные маркетинга');
  }

  if (!stats || !rawTopReferrers || !chartData) {
    throw new Error('Некорректные данные маркетинга');
  }

  const topReferrers = rawTopReferrers.map(r => ({
    id: r.id,
    email: r.email,
    referralBalance: Number(r.referralBalance),
    _count: r._count,
  }));

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminTabbedHeader
        icon={Gift}
        title="Партнерская программа"
        description="Аналитика партнерской программы и управление рефералами"
        tabs={FINANCE_TABS}
        onboardingKey="marketing"
        onboarding={ONBOARDING_CONFIGS.marketing}
      />

      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-lg border-border/70 shadow-xs bg-background/60 backdrop-blur-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-success/20 text-success rounded-lg">
                <TrendingUp className="w-6 h-6 shrink-0" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Выплачено всего</p>
                <p className="text-2xl font-black text-foreground tabular-nums">{formatRubles(Number(stats.totalPaidOut) / 100)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-border/70 shadow-xs bg-background/60 backdrop-blur-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-warning/20 text-warning rounded-lg">
                <Wallet className="w-6 h-6 shrink-0" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">В ожидании</p>
                <p className="text-2xl font-black text-foreground tabular-nums">{formatRubles(Number(stats.totalPending) / 100)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-border/70 shadow-xs bg-background/60 backdrop-blur-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <Users className="w-6 h-6 shrink-0" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Топ рефоводов</p>
                <p className="text-2xl font-black text-foreground tabular-nums">{topReferrers.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
           <Card className="rounded-lg border-border/70 shadow-xs bg-background/60 backdrop-blur-xl overflow-hidden">
              <CardHeader className="border-b border-border/70 bg-muted/30 rounded-t-lg pb-4">
                <CardTitle className="text-foreground text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success shrink-0" />
                  Экономика программы (последние 6 мес.)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ReferralEconomicsChart data={chartData} />
              </CardContent>
           </Card>

           <Card className="rounded-lg border-border/70 shadow-xs bg-background/60 backdrop-blur-xl overflow-hidden">
              <CardHeader className="border-b border-border/70 bg-muted/30 rounded-t-lg pb-4">
                <CardTitle className="text-foreground text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  Аудит рефоводов
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">Клиенты с балансом на партнерском счету</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full">
                  <ReferrersTable referrers={topReferrers} />
                </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

