import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const networks = await prisma.network.findMany({
    include: {
      categories: {
        include: {
          services: true
        }
      }
    }
  });

  console.log('\n=========================================');
  console.log('       SMMPLAN DATABASE CATALOG REPORT    ');
  console.log('=========================================\n');

  for (const nw of networks) {
    console.log(`🌐 NETWORK: ${nw.name} [slug: ${nw.slug}] (ID: ${nw.id})`);
    
    if (nw.categories.length === 0) {
      console.log('  └─ ❌ No categories');
      continue;
    }

    for (const cat of nw.categories) {
      console.log(`  📂 Category: ${cat.name} (ID: ${cat.id})`);
      
      if (cat.services.length === 0) {
        console.log('      └─ ⚠️ No services in this category');
        continue;
      }

      for (const srv of cat.services) {
        const rateRub = srv.rate / 100; // Assuming cents
        const markupPercent = srv.markup;
        const retailPriceRub = (srv.rate * (1 + srv.markup / 100)) / 100;
        console.log(
          `      ⚙️ [ID: ${srv.numericId || srv.id}] ${srv.name}\n` +
          `         └─ Active: ${srv.isActive ? '✅' : '❌'} | Min: ${srv.minQty} | Max: ${srv.maxQty}\n` +
          `         └─ Provider Cost: ${srv.rate.toFixed(2)} ${srv.providerCurrency} per 1000\n` +
          `         └─ Margin/Markup: ${srv.markup}%\n` +
          `         └─ Link Requirement: ${srv.targetType || 'DEFAULT'}`
        );
      }
    }
    console.log('');
  }

  console.log('=========================================');
  console.log(`Total Networks: ${networks.length}`);
  const totalCategories = await prisma.category.count();
  const totalServices = await prisma.service.count();
  console.log(`Total Categories: ${totalCategories}`);
  console.log(`Total Services: ${totalServices}`);
  console.log('=========================================\n');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
