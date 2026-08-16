'use server';

import { requireStaffPermission } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import {
  AdminPricingIntelligenceService,
  AdminPricingIntelligenceDTO,
} from '@/services/admin/pricing-intelligence.service';
import { SettingsProvider } from '@/lib/settings';

export async function getAdminServicePricingIntelligence(serviceId: string): Promise<AdminPricingIntelligenceDTO> {
  const result = await requireStaffPermission('analytics', 'view', async () => {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: {
        category: {
          include: {
            network: true,
          },
        },
      },
    });

    if (!service) {
      throw new Error(`Услуга с ID ${serviceId} не найдена`);
    }

    const exchangeRateUSD = await SettingsProvider.getExchangeRateUSD();

    // Розничная цена за 1 шт в рублях (с сохранением точности до 4 знаков)
    const retailUnitRub = Number(((service.pricePer1000Cents / 100) / 1000).toFixed(4));

    return AdminPricingIntelligenceService.analyzeServicePricing({
      serviceId: service.id,
      name: service.name,
      categoryName: service.category?.name,
      networkName: service.category?.network?.name,
      retailUnitRub,
      rateUsd: service.rate || 0.01,
      isRefillEnabled: service.isRefillEnabled,
      minQty: service.minQty,
      maxQty: service.maxQty,
      targetType: service.targetType,
      exchangeRateUSD,
    });
  });

  if ('success' in result && result.success === false) {
    throw new Error(result.error);
  }

  return result as AdminPricingIntelligenceDTO;
}
