'use server';

import { requireStaffPermission } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import {
  MarketIntelligenceService,
  ServiceCompetitorComparison,
  CompetitorProfile,
} from '@/services/admin/market-intelligence.service';
import { revalidatePath } from 'next/cache';

/**
 * Получает сравнение конкретной услуги с конкурентами (PrimeLike, DoctorSMM и др.)
 */
export async function getServiceMarketComparison(serviceId: string): Promise<ServiceCompetitorComparison> {
  const result = await requireStaffPermission('analytics', 'view', async () => {
    const service = await db.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new Error(`Услуга с ID ${serviceId} не найдена`);
    }

    const ourPriceRub = Number(((service.pricePer1000Cents / 100) / 1000).toFixed(2));
    return MarketIntelligenceService.compareServiceWithMarket(service.name, ourPriceRub, service.id);
  });

  if ('success' in result && result.success === false) {
    throw new Error(result.error);
  }

  return result as ServiceCompetitorComparison;
}

/**
 * Получает полный срез рынка по всем активным услугам витрины.
 */
export async function getFullMarketOverview(): Promise<{
  comparisons: ServiceCompetitorComparison[];
  competitors: CompetitorProfile[];
  executiveSummary: string;
}> {
  const result = await requireStaffPermission('analytics', 'view', async () => {
    const services = await db.service.findMany({
      where: { isActive: true },
      take: 25,
      orderBy: { id: 'asc' },
    });

    const comparisons: ServiceCompetitorComparison[] = [];

    for (const s of services) {
      const ourPriceRub = Number(((s.pricePer1000Cents / 100) / 1000).toFixed(2));
      const comp = await MarketIntelligenceService.compareServiceWithMarket(s.name, ourPriceRub, s.id);
      comparisons.push(comp);
    }

    const competitors = MarketIntelligenceService.getAllCompetitors();
    const executiveSummary = await MarketIntelligenceService.generateMarketExecutiveSummary(comparisons);

    return {
      comparisons,
      competitors,
      executiveSummary,
    };
  });

  if ('success' in result && result.success === false) {
    throw new Error(result.error);
  }

  return result as {
    comparisons: ServiceCompetitorComparison[];
    competitors: CompetitorProfile[];
    executiveSummary: string;
  };
}

/**
 * Добавляет нового кастомного конкурента.
 */
export async function addCustomCompetitorAction(data: {
  name: string;
  url: string;
  pricingMatrix: Record<string, number>;
}): Promise<{ success: boolean; competitor?: CompetitorProfile; error?: string }> {
  return requireStaffPermission('analytics', 'edit', async () => {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const created = MarketIntelligenceService.addCustomCompetitor({
      name: data.name,
      slug,
      url: data.url,
      isActive: true,
      pricingMatrix: data.pricingMatrix,
    });

    revalidatePath('/admin/intel');
    return { success: true, competitor: created };
  });
}
