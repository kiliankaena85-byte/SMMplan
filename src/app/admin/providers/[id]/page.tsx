import { adminProviderService } from '@/services/admin/provider.service';
import { ProviderForm } from '../components/provider-form';
import { notFound } from 'next/navigation';
import { Plug } from 'lucide-react';
import { enforceSectionAccess } from '@/lib/server/rbac';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { PROVIDERS_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';

export const dynamic = 'force-dynamic';

export default async function EditProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // AUD-09 (4.1): provider management requires the 'providers' section
  await enforceSectionAccess('providers');

  const { id } = await params;

  // DTO — never includes raw encrypted apiKey
  const provider = await adminProviderService.getProviderDetail(id);

  if (!provider) {
    notFound();
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out min-h-full pb-10">
      <AdminTabbedHeader
        icon={Plug}
        title={`Провайдер: ${provider.name}`}
        description={
          <span className="flex items-center gap-2 text-xs">
            <span>Технические параметры API-подключения.</span>
            {provider.hasApiKey && (
              <span className="inline-flex items-center gap-1 text-xs text-success font-medium bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                🔒 API Key установлен
              </span>
            )}
          </span>
        }
        tabs={PROVIDERS_TABS}
        onboardingKey="providers"
        onboarding={ONBOARDING_CONFIGS.providers}
      />

      <ProviderForm initialData={provider} />
    </div>
  );
}

