import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const telegramNetwork = await prisma.network.findFirst({
    where: { slug: 'telegram' },
    include: {
      categories: {
        include: {
          services: true
        }
      }
    }
  });

  if (!telegramNetwork) {
    console.log('Telegram network not found');
    return;
  }

  console.log(`Telegram Network ID: ${telegramNetwork.id}`);
  console.log(`Categories count: ${telegramNetwork.categories.length}`);
  telegramNetwork.categories.forEach(cat => {
    console.log(`Category: "${cat.name}" (ID: ${cat.id})`);
    console.log(`  Services count: ${cat.services.length}`);
    cat.services.forEach(srv => {
      console.log(`    Service: "${srv.name}" (ID: ${srv.id}, TargetType: ${srv.targetType})`);
    });
  });
}

main().finally(() => prisma.$disconnect());
