import { getSmartCampaigns, getServiceConfigs, getSmartGlobalStatus } from '@/actions/admin/smart';
import { Cpu } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/page-header';
import { SmartDripClient } from './smart-client';

export const dynamic = 'force-dynamic';

export default async function SmartDripAdminPage() {
  const [campaignsResult, servicesResult, globalStatusResult] = await Promise.all([
    getSmartCampaigns(1, 100),
    getServiceConfigs(),
    getSmartGlobalStatus(),
  ]);

  const campaigns = campaignsResult.success ? campaignsResult.data.campaigns : [];
  const services = servicesResult.success ? servicesResult.data : [];
  const globalDisabled = globalStatusResult.success ? globalStatusResult.disabled : false;

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-muted/50/50 min-h-full pb-10">
      <AdminPageHeader
        icon={Cpu}
        title="Умный Dripfeed 2.0"
        description="Управление постепенной раздачей, чанковыми распределениями и контролем качества"
      />

      <SmartDripClient
        initialCampaigns={campaigns}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialServices={services as any}
        initialGlobalDisabled={globalDisabled}
      />
    </div>
  );
}
