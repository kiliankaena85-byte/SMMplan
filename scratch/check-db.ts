import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const nets = await prisma.network.findMany();
  console.log('--- Network Details ---');
  nets.forEach(n => {
    console.log(`ID: ${n.id}, Name: ${n.name}, Slug: ${n.slug}, IsActive: ${n.isActive}`);
  });

  const telegramServices = await prisma.service.findMany({
    where: { category: { network: { slug: 'telegram' } } },
    include: { category: true },
    take: 5
  });

  console.log('\n--- Telegram Services ---');
  telegramServices.forEach(s => {
    console.log(`ID: ${s.id}, Name: ${s.name}, Category: ${s.category.name}, Rate: ${s.rate}, Min: ${s.minQty}, Max: ${s.maxQty}`);
  });
}

main().finally(() => prisma.$disconnect());

