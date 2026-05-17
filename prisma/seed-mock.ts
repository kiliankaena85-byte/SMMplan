import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding massive mock data for Enterprise UX testing...');

  // 1. Providers
  const providerNames = ['Vexboost', 'HQ-SMM', 'SMM-Panel-Pro', 'Cheap-SMM'];
  for (const name of providerNames) {
    await prisma.provider.upsert({
      where: { name },
      update: {},
      create: {
        name,
        apiUrl: `https://${name.toLowerCase().replace('-', '')}.com/api/v2`,
        apiKey: `mock_key_${name}`,
        isActive: true,
      }
    });
  }
  const providers = await prisma.provider.findMany();

  // 2. Networks & Categories
  const networks = ['Instagram', 'Telegram', 'VKontakte', 'YouTube', 'TikTok'];
  for (let i = 0; i < networks.length; i++) {
    const nw = await prisma.network.upsert({
      where: { slug: networks[i].toLowerCase() },
      update: {},
      create: { name: networks[i], slug: networks[i].toLowerCase(), sort: i }
    });

    const categoryNames = ['Лайки', 'Подписчики', 'Просмотры', 'Комментарии'];
    for (let j = 0; j < categoryNames.length; j++) {
      let cat = await prisma.category.findFirst({
        where: { name: categoryNames[j], networkId: nw.id }
      });
      if (!cat) {
        cat = await prisma.category.create({
          data: { name: categoryNames[j], networkId: nw.id, sort: j }
        });
      }
    }
  }

  const categories = await prisma.category.findMany();

  // 3. Services
  for (let i = 0; i < 20; i++) {
    const cat = categories[i % categories.length];
    const prv = providers[i % providers.length];
    
    let srv = await prisma.service.findFirst({
      where: { externalId: `srv_${i}` }
    });
    if (!srv) {
      srv = await prisma.service.create({
        data: {
          name: `[${prv.name}] ${cat.name} — Super Fast ⚡`,
          categoryId: cat.id,
          providerId: prv.id,
          rate: 10 + i * 5, 
          markup: 50 + i * 10,
          minQty: 10,
          maxQty: 50000,
          externalId: `srv_${i}`,
          isActive: true
        }
      });
    }
  }
  const services = await prisma.service.findMany();

  // 4. Users (Clients)
  const roles = ['USER', 'USER', 'USER', 'MANAGER', 'ADMIN', 'BANNED'];
  for (let i = 1; i <= 25; i++) {
    await prisma.user.upsert({
      where: { email: `mockclient${i}@example.com` },
      update: {},
      create: {
        email: `mockclient${i}@example.com`,
        role: roles[i % roles.length] as any,
        balance: Math.floor(Math.random() * 1000000), // Random up to 10k RUB
        totalSpent: Math.floor(Math.random() * 5000000),
      }
    });
  }
  const users = await prisma.user.findMany();

  // 5. Orders (Generating 150 diverse orders)
  const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELED', 'ERROR'];
  const errorMsgs = [
    'Not enough funds on provider balance',
    'Invalid link format (private profile)',
    'Service disabled by provider',
    'API Rate Limit Exceeded'
  ];

  console.log('Generating Orders...');
  for (let i = 0; i < 150; i++) {
    const u = users[Math.floor(Math.random() * users.length)];
    const s = services[Math.floor(Math.random() * services.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isDripFeed = Math.random() > 0.8;
    const qty = Math.floor(Math.random() * 5000) + 100;
    
    const createdAt = new Date(Date.now() - Math.floor(Math.random() * 2592000000 * 3)); // up to 3 months ago

    await prisma.order.create({
      data: {
        userId: u.id,
        serviceId: s.id,
        externalId: `ord_ext_${crypto.randomUUID().substring(0, 8)}`,
        link: `https://social.com/p/${crypto.randomUUID().substring(0, 8)}`,
        quantity: qty,
        charge: Math.floor(qty * s.markup / 1000 * 100), // cents
        providerCost: Math.floor(qty * s.rate / 1000 * 100), // cents
        remains: status === 'PARTIAL' ? Math.floor(qty / 2) : (status === 'CANCELED' ? qty : 0),
        status: status as any,
        error: status === 'ERROR' ? errorMsgs[Math.floor(Math.random() * errorMsgs.length)] : null,
        isDripFeed: isDripFeed,
        runs: isDripFeed ? 5 : undefined,
        interval: isDripFeed ? 15 : undefined,
        currentRun: isDripFeed && status === 'IN_PROGRESS' ? 2 : undefined,
        dripExternalIds: isDripFeed ? ['drip1', 'drip2'] : [],
        createdAt: createdAt
      }
    });
  }

  // 6. Support Tickets
  console.log('Generating Tickets...');
  const ticketStatuses = ['OPEN', 'ANSWERED', 'CLOSED'];
  for (let i = 0; i < 30; i++) {
    const u = users[Math.floor(Math.random() * users.length)];
    await prisma.ticket.create({
      data: {
        userId: u.id,
        subject: `Order Issue #${Math.floor(Math.random() * 1000)}`,
        status: ticketStatuses[Math.floor(Math.random() * ticketStatuses.length)] as any,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
        messages: {
          create: {
            sender: 'USER',
            text: `Hello, please check my order. It's stuck for a week now!`,
          }
        }
      }
    });
  }

  // 7. Payments for Finance Graphs
  console.log('Generating Payments...');
  for (let i = 0; i < 80; i++) {
    const u = users[Math.floor(Math.random() * users.length)];
    await prisma.payment.create({
      data: {
        userId: u.id,
        amount: Math.floor(Math.random() * 500000) + 50000,
        gateway: 'yookassa',
        status: 'SUCCEEDED',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 2592000000 * 3)) // up to 3 months ago
      }
    });
  }

  console.log('Massive seeding completed successfully! 🎉');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
