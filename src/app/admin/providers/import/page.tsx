import { adminProviderService } from '@/services/admin/provider.service';
import { ImportWizard } from './components/import-wizard';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { CATALOG_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';

export const dynamic = 'force-dynamic';

interface ImportPageProps {
  searchParams: Promise<{
    providerId?: string;
    tenant?: string;
  }>;
}

export default async function ImportProvidersPage({ searchParams }: ImportPageProps) {
  const { providerId, tenant } = await searchParams;

  // Fetch categories via service
  const categories = await adminProviderService.listCategories();
  
  // Fetch all providers
  const providers = await adminProviderService.listProviders();

  let errorMsg: string | null = null;
  if (providers.length === 0) {
    errorMsg = 'Нет зарегистрированных провайдеров для импорта';
  }

  // Determine initial provider: query param match > first active provider > first provider
  const initialProvider = 
    (providerId && providers.find(p => p.id === providerId)) ||
    providers.find(p => p.isActive) ||
    providers[0];

  const providerItems = providers.map(p => ({
    id: p.id,
    name: p.name,
    url: p.apiUrl,
    isActive: p.isActive,
    serviceCount: p.serviceCount,
    balanceCurrency: p.balanceCurrency,
  }));

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
        <ImportWizard 
          categories={categories} 
          providers={providerItems} 
          initialProviderId={initialProvider?.id}
          initialTenant={tenant}
        />
      )}
    </div>
  );
}
