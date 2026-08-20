import { db } from '@/lib/db';
import { QuarantineClient } from './quarantine-client';
import { AlertTriangle } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { CATALOG_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';

export const dynamic = 'force-dynamic';

export default async function QuarantinePage() {
  const [quarantined, zombies, blockedByApi, autoFixLogs] = await Promise.all([
    db.service.findMany({
      where: { isQuarantined: true },
      include: { category: { include: { network: true } }, provider: { select: { id: true, name: true } } },
      orderBy: { quarantinedAt: 'desc' },
    }),
    db.service.findMany({
      where: { cooldownReason: 'ZOMBIE_AUTO_DISABLED', isActive: false },
      include: { category: { include: { network: true } }, provider: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    db.service.findMany({
      where: {
        cooldownUntil: { gt: new Date() },
        cooldownReason: { not: 'ZOMBIE_AUTO_DISABLED' },
      },
      include: { category: { include: { network: true } }, provider: { select: { id: true, name: true } } },
      orderBy: { cooldownUntil: 'desc' },
    }),
    db.adminAuditLog.findMany({
      where: { action: 'SERVICE_AUTO_FIX' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapToDto = (s: any) => ({
    id: s.id,
    name: s.name,
    categoryName: s.category.name,
    networkSlug: s.category.network?.slug ?? 'unknown',
    providerName: s.provider?.name ?? '—',
    currentRate: s.rate,
    pendingRate: s.pendingRate,
    quarantineReason: s.quarantineReason ?? s.cooldownReason ?? '',
    quarantinedAt: s.quarantinedAt && !isNaN(new Date(s.quarantinedAt).getTime()) ? new Date(s.quarantinedAt).toISOString() : '',
    externalId: s.externalId ?? '',
    cooldownUntil: s.cooldownUntil && !isNaN(new Date(s.cooldownUntil).getTime()) ? new Date(s.cooldownUntil).toISOString() : null,
  });

  const priceSpikes = quarantined.map(mapToDto);
  const zombieItems = zombies.map(mapToDto);
  const apiErrors = blockedByApi.map(mapToDto);

  const serviceIds = autoFixLogs.map(l => l.target);
  const servicesInfo = await db.service.findMany({
    where: { id: { in: serviceIds } },
    select: {
      id: true,
      name: true,
      category: { select: { name: true, network: { select: { slug: true } } } },
      provider: { select: { name: true } },
    },
  });

  const serviceInfoMap = new Map(servicesInfo.map(s => [s.id, s]));

  const autoFixes = autoFixLogs.map(log => {
    const sInfo = serviceInfoMap.get(log.target);
    let oldValueParsed = null;
    let newValueParsed = null;
    try {
      oldValueParsed = log.oldValue ? JSON.parse(log.oldValue) : null;
    } catch { /* ignore */ }
    try {
      newValueParsed = log.newValue ? JSON.parse(log.newValue) : null;
    } catch { /* ignore */ }

    return {
      id: log.id,
      serviceId: log.target,
      serviceName: sInfo?.name ?? `Услуга #${log.target.slice(0, 8)}`,
      categoryName: sInfo?.category?.name ?? '—',
      networkSlug: sInfo?.category?.network?.slug ?? 'unknown',
      providerName: sInfo?.provider?.name ?? '—',
      oldValue: oldValueParsed,
      newValue: newValueParsed,
      createdAt: log.createdAt.toISOString(),
    };
  });

  const totalAnomalies = priceSpikes.length + zombieItems.length + apiErrors.length;

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out min-h-full pb-10">
      <AdminTabbedHeader
        icon={AlertTriangle}
        title="Карантин цен и аномалий"
        description={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground font-medium text-xs">
            <span>Карантин цен, зомби-услуги и сбои API провайдеров.</span>
            {totalAnomalies > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/20 animate-pulse">
                Аномалий: {totalAnomalies}
              </span>
            )}
          </div>
        }
        tabs={CATALOG_TABS}
        onboardingKey="quarantine"
        onboarding={ONBOARDING_CONFIGS.quarantine}
      />
      <QuarantineClient 
        initialPriceSpikes={priceSpikes} 
        initialZombies={zombieItems} 
        initialApiErrors={apiErrors} 
        initialAutoFixes={autoFixes}
      />
    </div>
  );
}
