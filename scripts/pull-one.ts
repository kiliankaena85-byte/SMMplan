import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true },
    take: 5
  });
  console.log(JSON.stringify(services, null, 2));
}
run().finally(() => prisma.$disconnect());
