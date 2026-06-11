import { db } from '@/lib/db';
import { QuarantineClient } from './quarantine-client';

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
    quarantinedAt: s.quarantinedAt?.toISOString() ?? '',
    externalId: s.externalId ?? '',
    cooldownUntil: s.cooldownUntil?.toISOString() ?? null,
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          ⚠️ Центр аномалий
          {totalAnomalies > 0 && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning border border-amber-500/30">
              {totalAnomalies}
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Карантин цен, зомби-услуги и сбои API провайдеров. Требуется внимание администратора.
        </p>
      </div>
      <QuarantineClient 
        initialPriceSpikes={priceSpikes} 
        initialZombies={zombieItems} 
        initialApiErrors={apiErrors} 
        initialAutoFixes={autoFixes}
      />
    </div>
  );
}
