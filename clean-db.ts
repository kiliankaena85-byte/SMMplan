import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.service.deleteMany();
  await prisma.category.deleteMany();
  await prisma.network.deleteMany();
  console.log('Cleaned db');
  await prisma.$disconnect();
}
main();
