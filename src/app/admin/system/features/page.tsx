import { getFeatureFlags } from '@/actions/admin/feature-flags';
import { FeatureFlagsClient } from './feature-flags-client';

export const dynamic = 'force-dynamic';

export default async function FeatureFlagsPage() {
  const result = await getFeatureFlags();
  const flags = result.success ? result.data : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Фича-флаги</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Управление функциями системы без перезагрузки сервера.
          Изменения применяются мгновенно для всех пользователей.
        </p>
      </div>
      <FeatureFlagsClient initialFlags={flags} />
    </div>
  );
}
