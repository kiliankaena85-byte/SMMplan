import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing insertions...');
  
  // 1. Delete all categories and networks
  console.log('Deleting existing records...');
  await prisma.category.deleteMany({});
  await prisma.network.deleteMany({});
  
  console.log('Inserting network...');
  const nw = await prisma.network.create({
    data: {
      name: 'Telegram Test',
      slug: 'telegram-test',
      sort: 1
    }
  });
  console.log('Inserted Network:', nw);
  
  console.log('Inserting category...');
  const cat = await prisma.category.create({
    data: {
      name: 'Подписчики',
      networkId: nw.id,
      sort: 1
    }
  });
  console.log('Inserted Category:', cat);
  
  console.log('Success!');
}

main()
  .catch(e => {
    console.error('Error during test-db-insert:', e);
  })
  .finally(() => prisma.$disconnect());
