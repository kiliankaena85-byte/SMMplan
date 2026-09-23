import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function applyBeautifulRounding(priceRubPer1000: number): number {
  if (priceRubPer1000 <= 0) return 0;
  const cleanedPrice = Math.round(priceRubPer1000 * 100000) / 100000;
  if (cleanedPrice < 1000) {
    return Math.ceil(cleanedPrice / 10) * 10;
  }
  return Math.ceil(cleanedPrice / 100) * 100;
}

function determineTargetMarkup(service: {
  name: string;
  qualityTier: string | null;
  features: unknown;
}): { markup: number; tierLabel: string } {
  const n = service.name.toLowerCase();
  let featureTier = '';
  try {
    const rawFeatures = typeof service.features === 'string' ? JSON.parse(service.features) : service.features;
    featureTier = (rawFeatures as { tier?: string } | null)?.tier?.toLowerCase() || '';
  } catch {
    // Ignore feature parse error
  }

  // 1. VIP / Живые / Органика / Комментарии / Таргет -> 600% (7.0x)
  if (
    service.qualityTier === 'VIP' ||
    featureTier.includes('жив') ||
    n.includes('жив') ||
    n.includes('organic') ||
    n.includes('таргет') ||
    n.includes('отзыв') ||
    n.includes('комментар') ||
    n.includes('custom comment')
  ) {
    return { markup: 7.0, tierLabel: 'VIP / Живые (600%)' };
  }

  // 2. Премиум / Гарантия / Без списаний / HQ -> 575% (6.75x)
  if (
    service.qualityTier === 'PREMIUM' ||
    featureTier.includes('премиум') ||
    n.includes('премиум') ||
    n.includes('гаранти') ||
    n.includes('без списаний') ||
    n.includes('hq') ||
    n.includes('no drop')
  ) {
    return { markup: 6.75, tierLabel: 'Премиум / Гарантия (575%)' };
  }

  // 3. Стандарт / Умеренные -> 540% (6.4x)
  if (
    service.qualityTier === 'STANDARD' ||
    featureTier.includes('стандарт') ||
    n.includes('стандарт')
  ) {
    return { markup: 6.4, tierLabel: 'Стандарт (540%)' };
  }

  // 4. Эконом / Массовые -> 500% (6.0x)
  return { markup: 6.0, tierLabel: 'Эконом (500%)' };
}

async function main() {
  console.log('🚀 [Catalog Reconcile] Starting mass activation and 500%–600% markup rebalancing...');

  const services = await prisma.service.findMany({
    select: {
      id: true,
      name: true,
      qualityTier: true,
      features: true,
      rate: true,
      costPer1kRub: true,
      markup: true,
      pricePer1000Cents: true,
      provider: { select: { name: true } }
    }
  });

  console.log(`📦 Found ${services.length} services in database to reconcile.`);

  let activatedCount = 0;
  let priceUpdatedCount = 0;
  let currencyInversionFixedCount = 0;
  const tierDistribution: Record<string, number> = {};

  for (const s of services) {
    const { markup, tierLabel } = determineTargetMarkup(s);
    tierDistribution[tierLabel] = (tierDistribution[tierLabel] || 0) + 1;

    // Strict floor invariant: markup MUST be >= 6.0 (at least +500% markup)
    const effectiveMarkup = Math.max(markup, 6.0);

    let cost = s.costPer1kRub;
    // Fix currency inversion: if cost was inflated > 50,000 RUB because a RUB rate was multiplied by USD exchange rate
    if (cost > 50000 && s.rate > 0 && s.rate <= 50000) {
      cost = s.rate;
      currencyInversionFixedCount++;
    }
    if (cost <= 0) cost = s.rate || 1.0;

    const rawRetailRub = cost * effectiveMarkup;
    const roundedRetailRub = applyBeautifulRounding(rawRetailRub);
    // Ensure it fits into PostgreSQL INT4 (max 2,000,000,000 cents = 20M RUB)
    const MAX_CENTS_INT4 = 2_000_000_000;
    const newPricePer1000Cents = Math.min(Math.round(roundedRetailRub * 100), MAX_CENTS_INT4);

    await prisma.service.update({
      where: { id: s.id },
      data: {
        isActive: true,
        cooldownReason: null,
        isQuarantined: false,
        quarantineReason: null,
        costPer1kRub: cost,
        markup: effectiveMarkup,
        pricePer1000Cents: newPricePer1000Cents
      }
    });

    if (newPricePer1000Cents !== s.pricePer1000Cents) {
      priceUpdatedCount++;
      await prisma.servicePriceHistory.create({
        data: {
          serviceId: s.id,
          rate: s.rate
        }
      });
    }

    activatedCount++;
  }

  console.log('\n📊 Rebalance Summary:');
  console.log(`- Total Services Processed & Activated: ${activatedCount}`);
  console.log(`- Retail Prices Updated: ${priceUpdatedCount}`);
  console.log(`- Currency Inversions Corrected: ${currencyInversionFixedCount}`);
  console.log('- Tier Distribution:');
  for (const [tier, count] of Object.entries(tierDistribution)) {
    console.log(`  * ${tier}: ${count} services`);
  }

  // Record Admin Audit Log
  await prisma.adminAuditLog.create({
    data: {
      tenantId: 'smmplan',
      adminId: 'system',
      adminEmail: 'system@pricing-reconcile',
      action: 'SERVICE_BULK_MARKUP_UPDATE',
      target: 'ALL_SERVICES',
      targetType: 'SERVICE',
      newValue: JSON.stringify({
        total: activatedCount,
        minMarkup: 6.0,
        maxMarkup: 7.0,
        currencyInversionsFixed: currencyInversionFixedCount,
        tierDistribution
      })
    }
  });

  console.log('\n✅ Catalog reconciliation successfully completed!');
}

main()
  .catch((err) => {
    console.error('❌ Error during catalog reconciliation:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
