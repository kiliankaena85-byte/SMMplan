import { db } from '../src/lib/db';

async function main() {
  console.log('--- Seeding Mock Provider Shadow Services & Verifying Routes ---');

  // 1. Locate Mock Provider
  let mockProvider = await db.provider.findFirst({
    where: {
      OR: [
        { id: 'cmuc3mk6o000041wzbug0o4hf' },
        { name: { contains: 'Mock Provider' } },
        { apiUrl: { contains: 'mock-provider.internal' } },
      ],
    },
  });

  if (!mockProvider) {
    console.error('❌ Mock Provider not found in DB!');
    return;
  }

  console.log(`✅ Found Mock Provider: ${mockProvider.name} (ID: ${mockProvider.id})`);

  // Ensure provider errors are reset
  await db.provider.update({
    where: { id: mockProvider.id },
    data: {
      errorCount5m: 0,
      lastErrorAt: null,
      isActive: true,
    },
  });

  // 2. Upsert Shadow Services
  const shadowServicesData = [
    {
      externalId: 'mock_boost_7d',
      name: 'Telegram Бусты для каналов — На 7 дней (Тест)',
      category: 'Бусты для каналов',
      rate: 1.0,
      rateRub: 1.0,
      min: 1,
      max: 100000,
      refill: false,
      cancel: true,
      dripfeed: true,
      platform: 'telegram',
      normalizedCategory: 'Бусты для каналов',
      targetType: 'CHANNEL',
    },
    {
      externalId: 'mock_boost_14d',
      name: 'Telegram Бусты для каналов — На 14 дней (Тест)',
      category: 'Бусты для каналов',
      rate: 1.0,
      rateRub: 1.0,
      min: 1,
      max: 100000,
      refill: false,
      cancel: true,
      dripfeed: true,
      platform: 'telegram',
      normalizedCategory: 'Бусты для каналов',
      targetType: 'CHANNEL',
    },
    {
      externalId: 'mock_boost_30d',
      name: 'Telegram Бусты для каналов — На 30 дней (Тест)',
      category: 'Бусты для каналов',
      rate: 1.0,
      rateRub: 1.0,
      min: 1,
      max: 100000,
      refill: false,
      cancel: true,
      dripfeed: true,
      platform: 'telegram',
      normalizedCategory: 'Бусты для каналов',
      targetType: 'CHANNEL',
    },
    {
      externalId: 'mock_subscribers_std',
      name: 'Telegram Подписчики (Тест)',
      category: 'Подписчики',
      rate: 0.1,
      rateRub: 0.1,
      min: 10,
      max: 100000,
      refill: false,
      cancel: true,
      dripfeed: true,
      platform: 'telegram',
      normalizedCategory: 'Подписчики',
      targetType: 'CHANNEL',
    },
  ];

  for (const item of shadowServicesData) {
    const upserted = await db.shadowService.upsert({
      where: {
        providerId_externalId: {
          providerId: mockProvider.id,
          externalId: item.externalId,
        },
      },
      update: {
        name: item.name,
        category: item.category,
        rate: item.rate,
        rateRub: item.rateRub,
        min: item.min,
        max: item.max,
        refill: item.refill,
        cancel: item.cancel,
        dripfeed: item.dripfeed,
        platform: item.platform,
        normalizedCategory: item.normalizedCategory,
        targetType: item.targetType,
      },
      create: {
        providerId: mockProvider.id,
        externalId: item.externalId,
        name: item.name,
        category: item.category,
        rate: item.rate,
        rateRub: item.rateRub,
        min: item.min,
        max: item.max,
        refill: item.refill,
        cancel: item.cancel,
        dripfeed: item.dripfeed,
        platform: item.platform,
        normalizedCategory: item.normalizedCategory,
        targetType: item.targetType,
      },
    });
    console.log(`  ✓ ShadowService: ${upserted.externalId} -> ${upserted.name}`);
  }

  // 3. Check and wire Boost services #2203, #2204, #2205
  const boostMappings: Record<number, string> = {
    2203: 'mock_boost_7d',
    2204: 'mock_boost_14d',
    2205: 'mock_boost_30d',
  };

  for (const [numIdStr, extId] of Object.entries(boostMappings)) {
    const numericId = parseInt(numIdStr, 10);
    const service = await db.service.findFirst({
      where: { numericId },
      include: {
        routes: true,
      },
    });

    if (!service) {
      console.warn(`⚠️ Service #${numericId} not found in DB!`);
      continue;
    }

    // Update service's default provider and externalId
    await db.service.update({
      where: { id: service.id },
      data: {
        provider: { connect: { id: mockProvider.id } },
        externalId: extId,
        isDripFeedEnabled: true,
        isCancelEnabled: true,
      },
    });

    // Upsert primary ServiceRoute
    const existingRoute = service.routes.find(
      (r) => r.providerId === mockProvider!.id && r.providerServiceId === extId
    );

    if (existingRoute) {
      await db.serviceRoute.update({
        where: { id: existingRoute.id },
        data: {
          priority: 1,
          isActive: true,
        },
      });
      console.log(`  ✓ ServiceRoute updated for #${numericId} (${service.name}) -> ${extId}`);
    } else {
      await db.serviceRoute.create({
        data: {
          serviceId: service.id,
          providerId: mockProvider.id,
          providerServiceId: extId,
          priority: 1,
          isActive: true,
        },
      });
      console.log(`  ✓ ServiceRoute created for #${numericId} (${service.name}) -> ${extId}`);
    }
  }

  console.log('✅ Mock Provider shadow services & boost routes successfully configured!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding shadow services:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
