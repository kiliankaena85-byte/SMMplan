import { db } from '@/lib/db';
import { QuarantineClient } from './quarantine-client';

export const dynamic = 'force-dynamic';

export default async function QuarantinePage() {
  const quarantined = await db.service.findMany({
    where: { isQuarantined: true },
    include: {
      category: { include: { network: true } },
      provider: { select: { id: true, name: true } },
    },
    orderBy: { quarantinedAt: 'desc' },
  });

  // DTO: never leak rate to client as-is — we show it as formatted string
  const dto = quarantined.map(s => ({
    id: s.id,
    name: s.name,
    categoryName: s.category.name,
    networkSlug: s.category.network?.slug ?? 'unknown',
    providerName: s.provider?.name ?? '—',
    currentRate: s.rate,
    pendingRate: s.pendingRate,
    quarantineReason: s.quarantineReason ?? '',
    quarantinedAt: s.quarantinedAt?.toISOString() ?? '',
    externalId: s.externalId ?? '',
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          ⚠️ Карантин услуг
          {dto.length > 0 && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning border border-amber-500/30">
              {dto.length}
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Услуги, у которых цена поставщика изменилась более чем на порог карантина.
          Требуется ваше решение: принять новую цену или отклонить.
        </p>
      </div>
      <QuarantineClient initialItems={dto} />
    </div>
  );
}
