import { adminProviderService } from '@/services/admin/provider.service';
import { ImportWizard } from './components/import-wizard';
import Link from 'next/link';
import { providerService } from '@/services/providers/provider.service';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ImportProvidersPage() {
  // Fetch categories via service (no direct db in page)
  const categories = await adminProviderService.listCategories();

  // Verify we have an active default provider
  let errorMsg: string | null = null;
  try {
    await providerService.getDefaultProvider();
  } catch (e: unknown) {
    errorMsg = e instanceof Error ? e.message : 'Провайдер не настроен';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Импорт Услуг</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Синхронизация и вишлист услуг от провайдера.
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
        <div className="bg-warning/10 border border-amber-200 text-amber-800 p-6 rounded-xl">
          <h2 className="text-base font-semibold mb-2">⚠️ Провайдер не настроен</h2>
          <p className="text-sm mb-4">{errorMsg}</p>
          <Link
            href="/admin/providers/new"
            className="inline-block bg-amber-600 text-white px-4 py-2 rounded-lg shadow-sm text-sm font-medium hover:bg-amber-700 transition-all duration-200"
          >
            + Добавить провайдера
          </Link>
        </div>
      ) : (
        <ImportWizard categories={categories} />
      )}
    </div>
  );
}
