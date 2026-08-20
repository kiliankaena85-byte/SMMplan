import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { SettingsProvider } from '@/lib/settings';
import { ServiceStudioForm } from '../components/service-studio-form';

export const dynamic = 'force-dynamic';

export default async function AdminNewServicePage() {
  const session = await verifySession();
  if (!session) redirect('/admin/login');

  const [networks, providers, exchangeRateUsd] = await Promise.all([
    db.network.findMany({
      orderBy: { sort: 'asc' },
      include: {
        categories: {
          orderBy: { sort: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    }),
    db.provider.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        balanceCurrency: true
      }
    }),
    SettingsProvider.getExchangeRateUSD()
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <ServiceStudioForm
        networks={networks}
        providers={providers}
        exchangeRateUsd={exchangeRateUsd || 90.0}
        isEditMode={false}
      />
    </div>
  );
}
