import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const p = await prisma.provider.findMany();
  console.log(p.map(x => `"${x.name}"`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
