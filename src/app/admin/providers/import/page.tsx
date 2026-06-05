import { adminProviderService } from '@/services/admin/provider.service';
import { ImportWizard } from './components/import-wizard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Импорт Услуг</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Загрузите каталог провайдера, выберите услуги и импортируйте в один клик.
          </p>
        </div>
        <Link
          href="/admin/providers"
          aria-label="Назад к списку провайдеров"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-lg transition-all duration-200 hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4" />
          К провайдерам
        </Link>
      </div>

      {errorMsg ? (
        <div className="bg-card border border-[#dfe5ec] text-[#212121] p-6 rounded-[12px] shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="text-base font-bold mb-2 flex items-center gap-2 text-foreground">
            <span>🔌</span> Провайдер не настроен
          </h2>
          <p className="text-sm text-[#707579] mb-4">{errorMsg}</p>
          <Link
            href="/admin/providers/new"
            className="inline-block bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2 rounded-[8px] text-sm font-semibold transition-all duration-200"
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
