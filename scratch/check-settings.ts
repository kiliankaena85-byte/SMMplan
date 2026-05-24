import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'global' }
  });
  console.log('--- System Settings ---');
  console.log(JSON.stringify(settings, null, 2));
}

main().finally(() => prisma.$disconnect());
