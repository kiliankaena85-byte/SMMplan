import { adminMarketingService } from '@/services/admin/marketing.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { FINANCE_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';
import { PromoCodeTable } from '../marketing/promocode-table';
import { CreatePromoModal } from '../marketing/create-promo-form';
import { enforceSectionAccess } from '@/lib/server/rbac';

export const dynamic = 'force-dynamic';

export default async function PromocodesPage() {
  const admin = await enforceSectionAccess('marketing');

  const isSuperAdmin = admin.role === 'OWNER' || admin.role === 'ADMIN';
  const canEdit = isSuperAdmin || Boolean(
    admin.staffRole?.permissions?.some(
      (p) => p.section.toUpperCase() === 'MARKETING' && p.canEdit
    )
  );

  let promos;
  try {
    promos = await adminMarketingService.listPromoCodes();
  } catch (error) {
    console.error('Failed to load promocodes:', error);
    throw new Error('Не удалось загрузить данные промокодов');
  }

  if (!promos) {
    throw new Error('Некорректные данные промокодов');
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminTabbedHeader
        icon={Gift}
        title="Промокоды"
        description="Управление купонами и ваучерами на баланс"
        tabs={FINANCE_TABS}
        onboardingKey="promocodes"
        onboarding={ONBOARDING_CONFIGS.promocodes}
      />

      <div className="w-full">
        <Card className="rounded-lg border-border/70 bg-card shadow-xs overflow-hidden">
          <CardHeader className="border-b border-border/70 bg-muted/20 rounded-t-lg pb-4 pt-5 flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-foreground text-sm font-extrabold uppercase tracking-wider">Список промокодов</CardTitle>
            </div>
            {canEdit && <CreatePromoModal />}
          </CardHeader>
          <CardContent className="pt-4">
            <PromoCodeTable data={promos} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

