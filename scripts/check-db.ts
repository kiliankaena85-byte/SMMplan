import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  await prisma.service.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.network.deleteMany({});
  console.log('Cleaned entire catalog for fresh sync.');
}

check().finally(() => prisma.$disconnect());
