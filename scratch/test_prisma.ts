import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('--- STRICT ISOLATION TEST START ---');
    
    // Clear E2E test data first to ensure no stale references
    await prisma.service.deleteMany({ where: { id: 'e2e-telegram-service-id' } });
    await prisma.category.deleteMany({ where: { id: 'e2e-telegram-subscribers-cat' } });
    await prisma.provider.deleteMany({ where: { name: 'E2E Test Provider' } });

    let network = await prisma.network.findUnique({ where: { slug: 'telegram' } });
    if (!network) {
      network = await prisma.network.create({ data: { name: 'Telegram', slug: 'telegram' } });
    }
    console.log('Network:', network.id);

    const category = await prisma.category.create({
      data: {
        id: 'e2e-telegram-subscribers-cat',
        name: 'QA Telegram Subscribers',
        networkId: network.id
      }
    });
    console.log('Category created:', category.id);

    const provider = await prisma.provider.create({
      data: {
        name: 'E2E Test Provider',
        apiUrl: 'http://test.local',
        apiKey: 'test_key'
      }
    });
    console.log('Provider created:', provider.id);

    const service = await prisma.service.create({
      data: {
        id: 'e2e-telegram-service-id',
        name: 'QA Telegram Service',
        categoryId: category.id,
        providerId: provider.id,
        rate: 10.0,
        markup: 50.0,
        minQty: 10,
        maxQty: 10000,
        isQuarantined: false,
        isActive: true,
        externalId: '101'
      }
    });
    console.log('Service created successfully:', service.id);

  } catch (error) {
    console.error('Error during database sequence:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
