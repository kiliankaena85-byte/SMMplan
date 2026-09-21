export const dynamic = "force-dynamic";

import ClientPage from "./client-page";
import type { Metadata } from 'next';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { getTenantDashboardViews } from '@/tenants/factory';

import { headers } from 'next/headers';
import { resolveTenantFromRequest, normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { resolveTenantUser } from '@/lib/tenant-user-resolver';

export const metadata: Metadata = {
  title: 'Новый заказ',
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await verifySession();
  const sp = await searchParams;
  const reqHeaders = await headers();
  const rawTenantId = (sp?.tenant as string) || reqHeaders.get('x-tenant-id') || session?.tenantId;
  const tenantId = normalizeTenantId(rawTenantId) || 'smmplan';

  let userEmail = "";
  let userBalanceCents = 0;

  if (session?.userId) {
    const user = await resolveTenantUser(session.userId, tenantId, true);
    userEmail = user?.email || "";
    userBalanceCents = user?.balance ? Number(user.balance) : 0;
  }

  let initialReorderData = null;
  if (sp.reorderServiceId && sp.reorderCategoryId && sp.reorderQty) {
    initialReorderData = {
      serviceId: sp.reorderServiceId as string,
      categoryId: sp.reorderCategoryId as string,
      link: (sp.reorderLink as string) || "",
      quantity: parseInt(sp.reorderQty as string, 10) || 100
    };
  }

  const { NewOrderView } = await getTenantDashboardViews(tenantId);
  const ActiveNewOrderView = NewOrderView || ClientPage;

  return (
    <ActiveNewOrderView
      userEmail={userEmail}
      userBalanceCents={userBalanceCents}
      initialReorderData={initialReorderData}
      tenantId={tenantId}
    />
  );
}

