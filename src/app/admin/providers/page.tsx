import { adminProviderService } from '@/services/admin/provider.service';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plug } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/page-header';
import { ProvidersTable } from './client-table';

export const dynamic = 'force-dynamic';

export default async function ProvidersAdminPage() {
  const providers = await adminProviderService.listProviders();

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminPageHeader
        icon={Plug}
        title="Провайдеры API"
        description="Управление поставщиками услуг (панелями SMM)"
        action={(
          <div className="flex gap-3">
            <Link href="/admin/providers/import">
              <Button intent="outline" className="font-medium bg-background">
                ⏬ Импорт Услуг
              </Button>
            </Link>
            <Link href="/admin/providers/new">
              <Button intent="primary" className="font-medium shadow-sm">
                + Подключить Панель
              </Button>
            </Link>
          </div>
        )}
      />

      <ProvidersTable providers={providers} />
    </div>
  );
}
