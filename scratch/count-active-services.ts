import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const activeCount = await prisma.service.count({ where: { isActive: true } });
  const totalCount = await prisma.service.count();
  console.log(`Total services: ${totalCount}`);
  console.log(`Active services: ${activeCount}`);

  const activeByProvider = await prisma.service.groupBy({
    by: ['providerId'],
    where: { isActive: true },
    _count: true,
  });

  const providers = await prisma.provider.findMany();
  const providerMap = new Map(providers.map(p => [p.id, p.name]));

  console.log('\nActive services by provider:');
  for (const group of activeByProvider) {
    const name = providerMap.get(group.providerId) || 'Unknown';
    console.log(`- ${name}: ${group._count} active services`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
