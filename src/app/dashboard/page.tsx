import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getBaseUrlAsync } from '@/utils/get-base-url';

import { headers } from 'next/headers';

import { getPublicCatalogAction } from '@/actions/order/catalog';
import { getTenantDashboardViews } from '@/tenants/factory';

export const dynamic = 'force-dynamic';

import { resolveTenantFromRequest } from '@/lib/tenant-resolver';

export default async function DashboardPage(props: { searchParams?: Promise<{ tenant?: string }> }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const searchParams = await props.searchParams;
  const session = await verifySession();
  if (!session) redirect('/login');

  const reqHeaders = await headers();
  const tenantId = resolveTenantFromRequest(reqHeaders);

  const [user, orders, referralCount] = await Promise.all([
    db.user.findUnique({
      where: { id: session.userId },
      select: {
        email: true,
        balance: true,
        totalSpent: true,
        referralCode: true,
        createdAt: true,
        tenantId: true,
      },
    }),
    db.order.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        numericId: true,
        status: true,
        charge: true,
        quantity: true,
        createdAt: true,
        service: { select: { name: true } },
      },
    }),
    db.user.count({ where: { referredById: session.userId } }),
  ]);

  if (!user) redirect('/login');

  // P3.4: Use server-side headers() — no hydration mismatch
  const origin = await getBaseUrlAsync();

  const activeOrders = await db.order.count({
    where: { userId: session.userId, status: { in: ['IN_PROGRESS', 'PENDING', 'PROVISIONING'] } },
  });

  const hasPendingPayments = await db.payment.count({
    where: { userId: session.userId, status: 'PENDING', gateway: 'yookassa' }
  }) > 0;

  const { HomeView } = await getTenantDashboardViews(tenantId);

  const catalogResult = await getPublicCatalogAction();
  const catalog = catalogResult.success && catalogResult.data ? catalogResult.data : [];

  const userForClient = {
    email: user.email,
    balanceCents: Number(user.balance ?? 0),
    totalSpent: Number(user.totalSpent ?? 0),
    referralCode: user.referralCode,
    createdAt: user.createdAt,
    tenantId: user.tenantId,
  };

  return (
    <HomeView
      user={userForClient}
      orders={orders}
      referralCount={referralCount}
      activeOrders={activeOrders}
      hasPendingPayments={hasPendingPayments}
      origin={origin}
      initialCatalog={catalog}
    />
  );
}
