import { adminProviderService } from '@/services/admin/provider.service';
import { ImportWizard } from './components/import-wizard';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { CATALOG_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';

export const dynamic = 'force-dynamic';

export default async function ImportProvidersPage() {
  // Fetch categories via service
  const categories = await adminProviderService.listCategories();
  
  // Fetch all active providers
  const providers = await adminProviderService.listProviders();
  const activeProviders = providers.filter(p => p.isActive);

  let errorMsg: string | null = null;
  if (activeProviders.length === 0) {
    errorMsg = 'Нет активных провайдеров для импорта';
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminTabbedHeader
        icon={Download}
        title="Импорт Услуг"
        description="Загрузите каталог провайдера, выберите услуги и импортируйте в один клик."
        tabs={CATALOG_TABS}
        onboardingKey="providers"
        onboarding={ONBOARDING_CONFIGS.providers}
      />

      {errorMsg ? (
        <div className="bg-card/60 backdrop-blur-md border border-border/50 p-6 rounded-2xl shadow-sm ring-1 ring-border/5">
          <h2 className="text-base font-bold tracking-tight mb-2 flex items-center gap-2 text-foreground">
            <span className="bg-muted/50 p-1.5 rounded-md">🔌</span> Провайдер не настроен
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{errorMsg}</p>
          <Link
            href="/admin/providers/new"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 shadow-sm"
          >
            + Добавить провайдера
          </Link>
        </div>
      ) : (
        <ImportWizard categories={categories} providers={activeProviders} />
      )}
    </div>
  );
}
