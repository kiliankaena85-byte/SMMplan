import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth/password';
import { VaultService } from '../src/lib/vault';

const prisma = new PrismaClient();

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
  await prisma.user.upsert({
    where: { email: adminRawId },
    update: { role: 'OWNER' },
    create: {
      email: adminRawId,
      role: 'OWNER',
      balance: 10000000 // 100000 RUB for initial testing
    }
  });
  console.log(`Upserted Admin User (OWNER): ${adminRawId}`);

  // Test Admin (Owner)
  const testAdminEmail = 'admin@smmplan.test';
  const testAdminHash = await hashPassword('AdminSecurePassword2026!');
  await prisma.user.upsert({
    where: { email: testAdminEmail },
    update: {
      passwordHash: testAdminHash,
      role: 'OWNER',
      balance: 200000_00, // 200,000 RUB
    },
    create: {
      email: testAdminEmail,
      passwordHash: testAdminHash,
      role: 'OWNER',
      balance: 200000_00,
    }
  });
  console.log(`Upserted Test Admin: ${testAdminEmail}`);

  // Test Client (User) - KYC verified with Telegram ID
  const testClientEmail = 'client@smmplan.test';
  const testClientHash = await hashPassword('ClientPassword2026!');
  await prisma.user.upsert({
    where: { email: testClientEmail },
    update: {
      passwordHash: testClientHash,
      role: 'USER',
      balance: 500000_00, // 500,000 RUB
      telegramId: '999999999',
      isKycVerified: true,
    },
    create: {
      email: testClientEmail,
      passwordHash: testClientHash,
      role: 'USER',
      balance: 500000_00,
      telegramId: '999999999',
      isKycVerified: true,
    }
  });
  console.log(`Upserted Test Client: ${testClientEmail}`);

  // Test Guest (User) - Anonymous limits check
  const testGuestEmail = 'guest@smmplan.test';
  const testGuestHash = await hashPassword('GuestPassword2026!');
  await prisma.user.upsert({
    where: { email: testGuestEmail },
    update: {
      passwordHash: testGuestHash,
      role: 'USER',
      balance: 100000_00, // 100,000 RUB
      telegramId: null,
      isKycVerified: false,
    },
    create: {
      email: testGuestEmail,
      passwordHash: testGuestHash,
      role: 'USER',
      balance: 100000_00,
      telegramId: null,
      isKycVerified: false,
    }
  });
  console.log(`Upserted Test Guest: ${testGuestEmail}`);

  // 4. Sample Category and Service
  let network = await prisma.network.findFirst({ where: { slug: 'instagram' } });
  if (!network) {
    network = await prisma.network.create({
      data: { name: 'Instagram', slug: 'instagram', sort: 1 }
    });
    console.log('Created Network: Instagram');
  }

  let category = await prisma.category.findFirst();
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Instagram Likes',
        networkId: network.id,
        sort: 1
      }
    });
    console.log('Created Category');
  }

  let existingService = await prisma.service.findFirst({
    where: { externalId: "1001" } // Matches mock provider ID
  });

  if (!existingService) {
    existingService = await prisma.service.create({
      data: {
        name: 'TEST: Instagram Likes [Instant, Fast]',
        categoryId: category.id,
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
  // Only insert if no payments exist
  const existingPayments = await prisma.payment.count();
  if (existingPayments === 0 && process.env.NODE_ENV !== 'production') {
    console.log('Generating dummy dashboard data [TEST_DATA]...');
    
    // Create random users
    const users = [];
    for (let i = 1; i <= 3; i++) {
        const u = await prisma.user.upsert({
            where: { email: `testclient${i}@example.com` },
            update: {},
            create: { email: `testclient${i}@example.com`, role: 'USER', balance: 500000 }
        });
        users.push(u);
    }

    // Create 10 Payments to simulate Revenue
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

    // Create 50 Orders
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
