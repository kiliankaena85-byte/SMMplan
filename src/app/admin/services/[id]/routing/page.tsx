import { requireStaffPermission } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { RoutingPanelClient } from '@/components/admin/routing/RoutingPanelClient';

export default async function ServiceRoutingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPermission('services', 'view', async () => {});
  const { id } = await params;

  const service = await db.service.findUnique({
    where: { id },
    include: { provider: true, category: true }
  });

  if (!service) notFound();

  // If there are no routes, we should conceptually create the first primary one 
  // from the current service data (Self-healing legacy data)
  let routes = await db.serviceRoute.findMany({
    where: { serviceId: id },
    include: { provider: true },
    orderBy: { priority: 'asc' }
  });

  if (routes.length === 0 && service.providerId && service.externalId) {
    await db.serviceRoute.create({
      data: {
        serviceId: id,
        providerId: service.providerId,
        providerServiceId: service.externalId,
        isPrimary: true,
        isActive: true,
        priority: 0,
        failoverMode: "manual"
      }
    });
    // Reload routes
    routes = await db.serviceRoute.findMany({
      where: { serviceId: id },
      include: { provider: true },
      orderBy: { priority: 'asc' }
    });
  }

  const auditLogs = await db.routingAuditLog.findMany({
    where: { serviceId: id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Operational Routing (Hot-Swap)</h1>
        <p className="text-muted-foreground">
          Управление потоком трафика для услуги: <span className="font-semibold text-primary">{service.name}</span>
        </p>
      </div>

      {/* React Client Component to handle interactivity */}
      <RoutingPanelClient 
        service={service} 
        routes={routes} 
        auditLogs={auditLogs} 
      />
    </div>
  );
}
