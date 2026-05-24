import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing old mock records...');
  await prisma.order.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.network.deleteMany({});

  const networks = ['Instagram', 'Telegram', 'VKontakte', 'YouTube', 'TikTok'];
  for (let i = 0; i < networks.length; i++) {
    const name = networks[i];
    const slug = name.toLowerCase();
    
    console.log(`\n--- Working on Network: ${name} (slug: ${slug}) ---`);
    
    const nw = await prisma.network.create({
      data: { name, slug, sort: i }
    });
    console.log(`Created Network:`, nw);

    // Verify it exists in DB
    const verifiedNet = await prisma.network.findUnique({ where: { id: nw.id } });
    console.log(`Verified Network in DB:`, verifiedNet ? 'Found' : 'NOT FOUND');

    let categoryNames = ['Лайки', 'Подписчики', 'Просмотры', 'Комментарии'];
    if (name === 'Telegram') {
      categoryNames = [...categoryNames, 'Бусты (Telegram Levels)', 'Звезды (Telegram Stars)', 'Автопросмотры'];
    }

    for (let j = 0; j < categoryNames.length; j++) {
      const catName = categoryNames[j];
      console.log(`Creating Category "${catName}" with networkId: "${nw.id}"`);
      
      try {
        const cat = await prisma.category.create({
          data: { name: catName, networkId: nw.id, sort: j }
        });
        console.log(`Created Category successfully: "${cat.name}" (id: ${cat.id})`);
      } catch (err: any) {
        console.error(`FAILED to create category "${catName}":`, err);
        console.log('Details:', JSON.stringify(err, null, 2));
        throw err;
      }
    }
  }
}

main()
  .catch(e => {
    console.error('Fatal Error:', e);
  })
  .finally(() => prisma.$disconnect());
