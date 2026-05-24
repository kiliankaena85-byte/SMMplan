import { PrismaClient } from '@prisma/client';
import { checkoutAction } from '../src/actions/order/checkout';

async function main() {
  const prisma = new PrismaClient();
  
  // Ensure the records exist as in the test
  let network = await prisma.network.findUnique({ where: { slug: 'telegram' } });
  if (!network) {
    network = await prisma.network.create({ data: { name: 'Telegram', slug: 'telegram' } });
  }
  
  const category = await prisma.category.upsert({
    where: { id: 'e2e-telegram-subscribers-cat' },
    update: {
      name: 'QA Telegram Subscribers',
      networkId: network.id
    },
    create: {
      id: 'e2e-telegram-subscribers-cat',
      name: 'QA Telegram Subscribers',
      sort: 1,
      networkId: network.id
    }
  });

  const provider = await prisma.provider.upsert({
    where: { name: 'E2E Test Provider' },
    update: {
      apiUrl: 'http://test.local',
      apiKey: 'test_key'
    },
    create: {
      name: 'E2E Test Provider',
      apiUrl: 'http://test.local',
      apiKey: 'test_key'
    }
  });

  await prisma.service.upsert({
    where: { id: 'e2e-telegram-service-id' },
    update: {
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
    },
    create: {
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

  await prisma.systemSettings.upsert({
    where: { id: 'global' },
    update: {
      yookassaShopId: 'test_shop_id',
      yookassaSecretKey: 'test_secret_key',
      isTestMode: true
    },
    create: {
      id: 'global',
      yookassaShopId: 'test_shop_id',
      yookassaSecretKey: 'test_secret_key',
      isTestMode: true
    }
  });

  console.log('Seeding finished in scratch script.');

  console.log('Executing checkoutAction...');
  try {
    const res = await checkoutAction({
      serviceId: 'e2e-telegram-service-id',
      link: 'https://t.me/durov',
      quantity: 10,
      email: 'e2e-tester@test.com',
      gateway: 'yookassa',
    });
    console.log('checkoutAction Result:', res);
  } catch (err) {
    console.error('checkoutAction failed:', err);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
