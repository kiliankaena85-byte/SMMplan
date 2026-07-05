import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const service = await prisma.service.findUnique({
    where: { id: 'cmr5dn1mu00q4ljachnhb3dnw' },
    include: { category: { include: { network: true } } }
  });
  console.log(JSON.stringify(service, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
