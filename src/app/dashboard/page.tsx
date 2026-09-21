import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getBaseUrlAsync } from '@/utils/get-base-url';

import { headers } from 'next/headers';

import { getPublicCatalogAction } from '@/actions/order/catalog';
import { getTenantDashboardViews } from '@/tenants/factory';

export const dynamic = 'force-dynamic';

import { resolveTenantFromRequest, normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { resolveTenantUser } from '@/lib/tenant-user-resolver';
import { runWithTenant } from '@/lib/tenant-context';

export default async function DashboardPage(props: { searchParams?: Promise<{ tenant?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await verifySession();
  if (!session) redirect('/login');

  const reqHeaders = await headers();
  const rawTenantId = searchParams?.tenant || reqHeaders.get('x-tenant-id') || session.tenantId;
  const tenantId = normalizeTenantId(rawTenantId) || 'smmplan';

  return runWithTenant(tenantId, async () => {
    // Resolve user strictly for the active tenant (auto-provisioning staff/owner on sibling tenant if needed)
    const user = await resolveTenantUser(session.userId, tenantId, true);
    if (!user) redirect('/login');

    const [orders, referralCount, activeOrders, hasPendingPayments] = await Promise.all([
      db.order.findMany({
      where: { userId: user.id, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        numericId: true,
        status: true,
        charge: true,
        quantity: true,
        link: true,
        serviceId: true,
        createdAt: true,
        service: { select: { name: true, categoryId: true } },
      },
    }),
    db.user.count({ where: { referredById: user.id } }),
    db.order.count({
      where: { userId: user.id, tenantId, status: { in: ['IN_PROGRESS', 'PENDING', 'PROVISIONING'] } },
    }),
    db.payment.count({
      where: { userId: user.id, tenantId, status: 'PENDING', gateway: 'yookassa' }
    }).then(c => c > 0),
  ]);

  // P3.4: Use server-side headers() — no hydration mismatch
  const origin = await getBaseUrlAsync();

  const { HomeView } = await getTenantDashboardViews(tenantId);

  // FIX(PERF): Fetch public catalog only for tenants whose dashboard home renders an order wizard (e.g. SMMflux).
  // On classic SMMplan dashboard, initialCatalog is unused, saving ~200-300 KB of RSC payload and DB load.
  let catalog: any[] = [];
  if (tenantId === 'flux') {
    const catalogResult = await getPublicCatalogAction(tenantId);
    catalog = catalogResult.success && catalogResult.data ? catalogResult.data : [];
  }

  const userForClient = {
    email: user.email,
    balance: user.balance ?? BigInt(0),
    balanceCents: Number(user.balance ?? 0),
    totalSpent: Number(user.totalSpent ?? 0),
    referralCode: user.referralCode,
    createdAt: user.createdAt,
    tenantId: user.tenantId,
  };

  const serializedOrders = orders.map(order => ({
    id: order.id,
    numericId: order.numericId,
    status: order.status,
    charge: Number(order.charge ?? 0),
    chargeCents: Number(order.charge ?? 0),
    quantity: order.quantity,
    createdAt: order.createdAt,
    service: order.service,
    // FIX(REPEAT): данные для кнопки «Повторить» (контракт reorder*)
    serviceId: order.serviceId,
    link: order.link,
  }));

    return (
      <HomeView
        user={userForClient}
        orders={serializedOrders}
        referralCount={referralCount}
        activeOrders={activeOrders}
        hasPendingPayments={hasPendingPayments}
        origin={origin}
        initialCatalog={catalog}
      />
    );
  });
}
