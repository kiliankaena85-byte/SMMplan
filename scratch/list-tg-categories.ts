import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const networks = await prisma.network.findMany({
    include: {
      categories: {
        include: {
          _count: {
            select: { services: true }
          }
        }
      }
    }
  });

  console.log('--- ALL NETWORKS AND CATEGORIES IN DB ---');
  for (const net of networks) {
    console.log(`\nNetwork: ${net.name} (${net.slug})`);
    for (const cat of net.categories) {
      console.log(`  - Category: "${cat.name}" (slug: "${cat.slug}"), Services Count: ${cat._count.services}`);
    }
  }

  // Also check if there are any services with name or category related to Stars, Boosts, Mass Views
  const targetServices = await prisma.service.findMany({
    where: {
      OR: [
        { name: { contains: 'звезд', mode: 'insensitive' } },
        { name: { contains: 'star', mode: 'insensitive' } },
        { name: { contains: 'буст', mode: 'insensitive' } },
        { name: { contains: 'boost', mode: 'insensitive' } },
        { name: { contains: 'просмотр', mode: 'insensitive' } },
        { name: { contains: 'view', mode: 'insensitive' } }
      ]
    },
    include: {
      category: {
        include: {
          network: true
        }
      }
    }
  });

  console.log(`\n--- SERVICES RELATED TO STARS/BOOSTS/VIEWS (${targetServices.length} found) ---`);
  for (const s of targetServices) {
    console.log(`Service ID: ${s.id}`);
    console.log(`  Name: "${s.name}"`);
    console.log(`  Active: ${s.isActive}`);
    console.log(`  Category: "${s.category.name}" in Network "${s.category.network.name}"`);
  }
}

main().finally(() => prisma.$disconnect());
