import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth/password';
import { VaultService } from '../src/lib/vault';

const prisma = new PrismaClient();

async function ensureSeedLedger(userId: string, amount: number) {
  if (amount <= 0) return;
  const idempotencyKey = `seed-ledger-user-${userId}`;
  const existing = await prisma.ledgerEntry.findFirst({ where: { idempotencyKey } });
  if (existing) return;

  await prisma.ledgerEntry.create({
    data: {
      userId,
      amount,
      reason: 'Initial Seed Balance',
      transactionType: 'DEPOSIT',
      idempotencyKey
    }
  });
}

async function main() {
  console.log('Seeding Database...');

  // 1. System Settings Singleton
  const settings = await prisma.systemSettings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      taxRate: 6.0,
      opexMonthly: 0,
      maintenanceMode: false,
      isTestMode: true,
      siteName: 'Smmplan Lite',
      siteDescription: 'Seeded test environment'
    }
  });
  console.log('Upserted SystemSettings');

  // 2. Default Provider
  const provider = await prisma.provider.upsert({
    where: { name: 'Vexboost' },
    update: {
      ticketUrl: 'https://vexboost.ru/tickets/'
    },
    create: {
      name: 'Vexboost',
      apiUrl: 'https://vexboost.ru/api/v2/',
      apiKey: VaultService.encrypt(process.env.VEXBOOST_API_KEY || 'dummy_key'),
      isActive: true,
      ticketUrl: 'https://vexboost.ru/tickets/'
    }
  });
  console.log('Upserted Provider Vexboost');

  // 3. Admin User
  const adminRawId = 'art@artmspektr.ru';
  let adminUser = await prisma.user.findFirst({ where: { email: adminRawId } });
  if (adminUser) {
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: { role: 'OWNER', balance: 10000000 }
    });
  } else {
    adminUser = await prisma.user.create({
      data: {
        email: adminRawId,
        role: 'OWNER',
        balance: 10000000
      }
    });
  }
  await ensureSeedLedger(adminUser.id, 10000000);
  console.log(`Upserted Admin User (OWNER): ${adminRawId}`);

  // Test Admin (Owner)
  const testAdminEmail = 'admin@smmplan.test';
  const testAdminHash = await hashPassword('AdminSecurePassword2026!');
  let testAdminUser = await prisma.user.findFirst({ where: { email: testAdminEmail } });
  if (testAdminUser) {
    testAdminUser = await prisma.user.update({
      where: { id: testAdminUser.id },
      data: { passwordHash: testAdminHash, role: 'OWNER', balance: 200000_00 }
    });
  } else {
    testAdminUser = await prisma.user.create({
      data: { email: testAdminEmail, passwordHash: testAdminHash, role: 'OWNER', balance: 200000_00 }
    });
  }
  await ensureSeedLedger(testAdminUser.id, 200000_00);
  console.log(`Upserted Test Admin: ${testAdminEmail}`);

  // Test Client (User) - KYC verified with Telegram ID
  const testClientEmail = 'client@smmplan.test';
  const testClientHash = await hashPassword('ClientSecurePassword2026!');
  let testClientUser = await prisma.user.findFirst({ where: { email: testClientEmail } });
  if (testClientUser) {
    testClientUser = await prisma.user.update({
      where: { id: testClientUser.id },
      data: { passwordHash: testClientHash, role: 'USER', balance: 500000_00, telegramId: '123456789' }
    });
  } else {
    testClientUser = await prisma.user.create({
      data: { email: testClientEmail, passwordHash: testClientHash, role: 'USER', balance: 500000_00, telegramId: '123456789' }
    });
  }
  await ensureSeedLedger(testClientUser.id, 500000_00);
  console.log(`Upserted Test Client: ${testClientEmail}`);

  // 4. Default Category & Service
  let telegramNetwork = await prisma.network.findFirst({ where: { slug: 'telegram' } });
  if (!telegramNetwork) {
    telegramNetwork = await prisma.network.create({
      data: {
        name: 'Telegram',
        slug: 'telegram',
        tenantId: 'all',
        isActive: true,
        sort: 0
      }
    });
    console.log('Created Default Network Telegram');
  }

  let existingCategory = await prisma.category.findFirst({ where: { slug: 'telegram' } });
  if (!existingCategory) {
    existingCategory = await prisma.category.create({
      data: {
        name: 'Telegram',
        slug: 'telegram',
        tenantId: 'all',
        networkId: telegramNetwork.id
      }
    });
  } else if (!existingCategory.networkId) {
    existingCategory = await prisma.category.update({
      where: { id: existingCategory.id },
      data: { networkId: telegramNetwork.id }
    });
  }

  let existingService = await prisma.service.findFirst({
    where: { name: 'Telegram Подписчики (Быстрые)' }
  });

  if (!existingService) {
    existingService = await prisma.service.create({
      data: {
        name: 'Telegram Подписчики (Быстрые)',
        categoryId: existingCategory.id,
        providerId: provider.id,
        rate: 5.0, // 5 RUB provider cost per 1000
        markup: 3.0, // Sell for 15 RUB
        minQty: 100,
        maxQty: 10000,
        externalId: "1001",
        isActive: true
      }
    });
    console.log('Created Mock Service 1001');
  }

  // 5. Test Orders and Payments for Dashboard Analytics
  const existingPayments = await prisma.payment.count();
  if (existingPayments === 0 && process.env.NODE_ENV !== 'production') {
    console.log('Generating dummy dashboard data [TEST_DATA]...');
    
    const users = [];
    for (let i = 1; i <= 3; i++) {
        let u = await prisma.user.findFirst({ where: { email: `testclient${i}@example.com` } });
        if (u) {
          u = await prisma.user.update({ where: { id: u.id }, data: { balance: 500000 } });
        } else {
          u = await prisma.user.create({ data: { email: `testclient${i}@example.com`, role: 'USER', balance: 500000 } });
        }
        await ensureSeedLedger(u.id, 500000);
        users.push(u);
    }

    for (let i = 0; i < 10; i++) {
        await prisma.payment.create({
            data: {
                userId: users[i % 3].id,
                amount: Math.floor(Math.random() * 500000) + 100000,
                gateway: 'yookassa',
                status: 'SUCCEEDED',
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 2592000000))
            }
        });
    }

    const statuses = ['COMPLETED', 'CANCELED', 'IN_PROGRESS', 'PENDING', 'ERROR'];
    for (let i = 0; i < 50; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        await prisma.order.create({
            data: {
                userId: users[i % 3].id,
                serviceId: existingService ? existingService.id : "1",
                externalId: `ext_${Date.now()}_${i}`,
                link: 'https://instagram.com/p/test',
                quantity: 1000,
                charge: 1500,
                providerCost: 500,
                remains: status === 'CANCELED' ? 1000 : 0,
                status: status as any,
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 2592000000))
            }
        });
    }
    console.log('Created Mock Financial Data for Dashboard');
  }

  console.log('Seeding Complete ✅');
  console.info('⚡ Next.js Cache Notice: If you are deploying in production, run "npm run build" again or save settings in Admin Panel to purge stale catalog caches.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
