import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { notFound, redirect } from 'next/navigation';
import { SettingsProvider } from '@/lib/settings';
import { ServiceEditForm } from '../components/service-edit-form';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnUrl?: string; [key: string]: string | undefined }>;
}

export default async function AdminEditServicePage({ params, searchParams }: Props) {
  const session = await verifySession();
  if (!session) redirect('/admin/login');

  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const returnUrl = sp.returnUrl || undefined;

  const [service, networks, providers, exchangeRateUsd, customerGroups] = await Promise.all([
    db.service.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            networkId: true
          }
        },
        provider: {
          select: {
            id: true,
            name: true,
            balanceCurrency: true
          }
        },
        customerAccess: {
          include: {
            customerGroup: true
          }
        }
      }
    }),
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
    SettingsProvider.getExchangeRateUSD(),
    db.customerGroup.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        discountPercent: true,
      }
    })
  ]);

  if (!service) {
    notFound();
  }

  const initialData = {
    id: service.id,
    name: service.name,
    description: service.description,
    icon: service.icon,
    categoryId: service.categoryId || '',
    rate: service.rate || 0.01,
    markup: service.markup || 1.5,
    minQty: service.minQty,
    maxQty: service.maxQty,
    providerId: service.providerId,
    externalId: service.externalId,
    targetType: service.targetType,
    isActive: service.isActive,
    isDripFeedEnabled: service.isDripFeedEnabled,
    isRefillEnabled: service.isRefillEnabled,
    isCancelEnabled: service.isCancelEnabled,
  };

  const initialCustomerAccess = (service.customerAccess || []).map(a => ({
    groupId: a.customerGroupId,
    groupName: a.customerGroup.name,
    isCustomPrice: a.isCustomPrice,
    customPriceRub: a.customPriceRub,
  }));

  return (
    <div className="p-6 md:p-8 space-y-6">
      <ServiceEditForm
        initialData={initialData}
        networks={networks}
        providers={providers}
        exchangeRateUsd={exchangeRateUsd || 90.0}
        returnUrl={returnUrl}
        availableCustomerGroups={customerGroups}
        initialCustomerAccess={initialCustomerAccess}
      />
    </div>
  );
}
