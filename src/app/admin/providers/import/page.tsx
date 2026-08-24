import { adminProviderService } from '@/services/admin/provider.service';
import { ImportWizard } from './components/import-wizard';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { CATALOG_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';
import { headers } from 'next/headers';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { resolveAdminTenantContext } from '@/utils/admin-tenant';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { enforceSectionAccess } from '@/lib/server/rbac';

type ImportPageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const dynamic = 'force-dynamic';

export default async function ImportProvidersPage({ searchParams }: ImportPageProps) {
  // AUD-09 (4.1): the import wizard is a CATALOG operation (it creates services),
  // not a provider-management one — catalog-only staff must keep access.
  await enforceSectionAccess('catalog');

  // AUD-05 (3.1): resolve tenant context the same way the admin catalog does —
  // ?tenant= for global operators (clamped to their own tenant for non-global ones),
  // x-tenant-id domain fallback, 'smmplan' as the last resort.
  const sParams = searchParams ? await searchParams : {};
  const urlTenant = typeof sParams.tenant === 'string' ? sParams.tenant : undefined;

  const reqHeaders = await headers();
  const session = await verifySession();
  const user = session
    ? await db.user.findUnique({
        where: { id: session.userId },
      })
    : null;

  const resolvedTenant = resolveAdminTenantContext(user, urlTenant);
  const selectedTenant =
    resolvedTenant !== 'all' ? resolvedTenant : normalizeTenantId(reqHeaders.get('x-tenant-id')) || 'smmplan';

  // Fetch categories via service — tenant-scoped (AUD-05): only categories
  // visible to the selected tenant are offered in the wizard.
  const categories = await adminProviderService.listCategories(selectedTenant);

  // Fetch all active providers
  const providers = await adminProviderService.listProviders();
  const activeProviders = providers.filter(p => p.isActive);

  let errorMsg: string | null = null;
  if (activeProviders.length === 0) {
    errorMsg = 'Нет активных провайдеров для импорта';
  } else if (categories.length === 0) {
    errorMsg = `Для тенанта «${selectedTenant}» нет доступных категорий. Сначала создайте категории в разделе «Категории & Соцсети».`;
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
            <span className="bg-muted/50 p-1.5 rounded-md">🔌</span> {activeProviders.length === 0 ? 'Провайдер не настроен' : 'Нет категорий'}
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
