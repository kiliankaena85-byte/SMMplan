import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const nets = await prisma.network.findMany({
    include: {
      categories: {
        include: {
          services: true
        }
      }
    }
  });
  console.log("=== DB DUMP ===");
  nets.forEach(net => {
    console.log(`Network: ${net.name} (Slug: ${net.slug}, IsActive: ${net.isActive})`);
    net.categories.forEach(cat => {
      console.log(`  Category: ${cat.name} (Services count: ${cat.services.length})`);
      cat.services.forEach(srv => {
        console.log(`    Service: ${srv.name} (IsActive: ${srv.isActive})`);
      });
    });
  });
}

main().finally(() => prisma.$disconnect());
