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

  // 1. Tenants & System Settings
  const tenants = [
    { id: 'smmplan', name: 'SMMplan', slug: 'smmplan', domain: 'smmplan.pro' },
    { id: 'flux', name: 'SMMflux', slug: 'flux', domain: 'smmflux.ru' },
  ];

  for (const t of tenants) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      update: { name: t.name, slug: t.slug, domain: t.domain },
      create: { id: t.id, name: t.name, slug: t.slug, domain: t.domain, isActive: true },
    });

    await prisma.systemSettings.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        taxRate: 6.0,
        opexMonthly: 0,
        maintenanceMode: false,
        isTestMode: true,
        siteName: t.name,
        siteDescription: `${t.name} Production Platform`,
      },
    });
  }
  console.log('Upserted Tenants and SystemSettings');

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

  // 4. Default Networks, Categories & Services (Multi-tenant 'all')
  const defaultCatalogData = [
    {
      network: { name: 'Telegram', slug: 'telegram', icon: 'telegram', sort: 1 },
      categories: [
        {
          name: 'Подписчики',
          slug: 'telegram-subscribers',
          services: [
            { name: 'Telegram Подписчики (Быстрые, Микс)', rate: 0.15, markup: 3.0, minQty: 100, maxQty: 50000, externalId: 'tg_sub_fast' },
            { name: 'Telegram Подписчики (Живые СНГ / Без отписок)', rate: 0.35, markup: 3.0, minQty: 50, maxQty: 20000, externalId: 'tg_sub_real' },
          ]
        },
        {
          name: 'Просмотры',
          slug: 'telegram-views',
          services: [
            { name: 'Telegram Просмотры на пост (Моментальные)', rate: 0.005, markup: 3.0, minQty: 100, maxQty: 100000, externalId: 'tg_views_fast' },
            { name: 'Telegram Автопросмотры на 10 постов', rate: 0.05, markup: 3.0, minQty: 100, maxQty: 50000, externalId: 'tg_views_auto' },
          ]
        },
        {
          name: 'Реакции',
          slug: 'telegram-reactions',
          services: [
            { name: 'Telegram Реакции (Позитивные 🔥👍❤️)', rate: 0.02, markup: 3.0, minQty: 50, maxQty: 50000, externalId: 'tg_react_pos' },
          ]
        }
      ]
    },
    {
      network: { name: 'ВКонтакте', slug: 'vk', icon: 'vk', sort: 2 },
      categories: [
        {
          name: 'Подписчики в группу',
          slug: 'vk-subscribers',
          services: [
            { name: 'VK Подписчики в сообщество (СНГ, Безопасные)', rate: 0.25, markup: 3.0, minQty: 100, maxQty: 25000, externalId: 'vk_sub_group' },
          ]
        },
        {
          name: 'Лайки и Просмотры',
          slug: 'vk-likes-views',
          services: [
            { name: 'VK Лайки на пост', rate: 0.05, markup: 3.0, minQty: 50, maxQty: 10000, externalId: 'vk_likes' },
            { name: 'VK Просмотры записей / клипов', rate: 0.01, markup: 3.0, minQty: 100, maxQty: 100000, externalId: 'vk_views' },
          ]
        }
      ]
    },
    {
      network: { name: 'YouTube', slug: 'youtube', icon: 'youtube', sort: 3 },
      categories: [
        {
          name: 'Просмотры',
          slug: 'youtube-views',
          services: [
            { name: 'YouTube Просмотры с удержанием (High Retention)', rate: 0.40, markup: 3.0, minQty: 500, maxQty: 500000, externalId: 'yt_views_hr' },
          ]
        },
        {
          name: 'Подписчики',
          slug: 'youtube-subscribers',
          services: [
            { name: 'YouTube Подписчики на канал (Гарантия 30 дней)', rate: 1.50, markup: 3.0, minQty: 50, maxQty: 10000, externalId: 'yt_subs_guar' },
          ]
        }
      ]
    },
    {
      network: { name: 'Instagram', slug: 'instagram', icon: 'instagram', sort: 4 },
      categories: [
        {
          name: 'Подписчики',
          slug: 'instagram-followers',
          services: [
            { name: 'Instagram Подписчики (Быстрый старт)', rate: 0.18, markup: 3.0, minQty: 100, maxQty: 50000, externalId: 'ig_fol_fast' },
          ]
        },
        {
          name: 'Лайки и Охваты',
          slug: 'instagram-likes',
          services: [
            { name: 'Instagram Лайки на фото / Reels', rate: 0.03, markup: 3.0, minQty: 50, maxQty: 25000, externalId: 'ig_likes_fast' },
          ]
        }
      ]
    },
    {
      network: { name: 'TikTok', slug: 'tiktok', icon: 'tiktok', sort: 5 },
      categories: [
        {
          name: 'Просмотры и Лайки',
          slug: 'tiktok-views-likes',
          services: [
            { name: 'TikTok Просмотры видео (Молниеносные)', rate: 0.008, markup: 3.0, minQty: 200, maxQty: 1000000, externalId: 'tt_views_fast' },
            { name: 'TikTok Лайки (Высокое качество)', rate: 0.12, markup: 3.0, minQty: 50, maxQty: 20000, externalId: 'tt_likes' },
          ]
        }
      ]
    }
  ];

  for (const item of defaultCatalogData) {
    let nw = await prisma.network.findFirst({ where: { slug: item.network.slug } });
    if (!nw) {
      nw = await prisma.network.create({
        data: {
          name: item.network.name,
          slug: item.network.slug,
          icon: item.network.icon,
          tenantId: 'all',
          isActive: true,
          sort: item.network.sort
        }
      });
      console.log(`Created Network: ${item.network.name}`);
    } else {
      nw = await prisma.network.update({
        where: { id: nw.id },
        data: { isActive: true, tenantId: 'all', sort: item.network.sort }
      });
    }

    for (const cat of item.categories) {
      let category = await prisma.category.findFirst({ where: { slug: cat.slug } });
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: cat.name,
            slug: cat.slug,
            tenantId: 'all',
            network: { connect: { id: nw.id } }
          }
        });
        console.log(`  Created Category: ${cat.name}`);
      } else {
        category = await prisma.category.update({
          where: { id: category.id },
          data: { network: { connect: { id: nw.id } }, tenantId: 'all' }
        });
      }

      for (const srv of cat.services) {
        let service = await prisma.service.findFirst({ where: { externalId: srv.externalId } });
        const pricePer1000Cents = Math.round(srv.rate * srv.markup * 10000); // in cents

        if (!service) {
          service = await prisma.service.create({
            data: {
              name: srv.name,
              category: { connect: { id: category.id } },
              provider: { connect: { id: provider.id } },
              rate: srv.rate,
              markup: srv.markup,
              pricePer1000Cents,
              minQty: srv.minQty,
              maxQty: srv.maxQty,
              externalId: srv.externalId,
              tenantId: 'all',
              isActive: true,
              isQuarantined: false
            }
          });
          console.log(`    Created Service: ${srv.name}`);
        } else {
          await prisma.service.update({
            where: { id: service.id },
            data: {
              category: { connect: { id: category.id } },
              tenantId: 'all',
              isActive: true,
              isQuarantined: false,
              cooldownReason: null,
              cooldownUntil: null
            }
          });
        }
      }
    }
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
    const firstService = await prisma.service.findFirst();
    for (let i = 0; i < 50; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        await prisma.order.create({
            data: {
                userId: users[i % 3].id,
                serviceId: firstService ? firstService.id : "1",
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
