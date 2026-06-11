import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Categories ---');
  const categories = await prisma.category.findMany();
  console.log(categories);

  console.log('--- Services ---');
  const services = await prisma.service.findMany();
  console.log(services);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
