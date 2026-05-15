import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const nets = await prisma.network.count();
  const cats = await prisma.category.count();
  const svcs = await prisma.service.count();
  const activeNets = await prisma.network.count({where: {isActive: true}});
  const activeSvcs = await prisma.service.count({where: {isActive: true}});
  
  console.log('Networks:', nets, 'Active:', activeNets);
  console.log('Categories:', cats);
  console.log('Services:', svcs, 'Active:', activeSvcs);
}

main().finally(() => prisma.$disconnect());
