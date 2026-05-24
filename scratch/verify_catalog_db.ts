import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== VERIFYING DATABASE SMM CATALOG INTEGRITY ===\n');

  // 1. Providers Check
  const providers = await prisma.provider.findMany({
    orderBy: { createdAt: 'asc' },
  });
  console.log('Providers in database:');
  providers.forEach(p => {
    console.log(`- [${p.isActive ? 'ACTIVE' : 'INACTIVE'}] Name: ${p.name}, Type: ${p.providerType}, URL: ${p.apiUrl}`);
  });
  console.log('');

  // 2. Active Services and Categories Count
  const totalServices = await prisma.service.count();
  const activeServices = await prisma.service.count({ where: { isActive: true } });
  const quarantinedServices = await prisma.service.count({ where: { isQuarantined: true } });
  const totalCategories = await prisma.category.count();
  const totalNetworks = await prisma.network.count();
  const activeNetworks = await prisma.network.findMany({ where: { isActive: true } });

  console.log('Catalog stats:');
  console.log(`- Total Networks  : ${totalNetworks}`);
  console.log(`- Active Networks : ${activeNetworks.length} (${activeNetworks.map(n => n.slug).join(', ')})`);
  console.log(`- Total Categories: ${totalCategories}`);
  console.log(`- Total Services  : ${totalServices}`);
  console.log(`- Active Services : ${activeServices}`);
  console.log(`- Quarantined     : ${quarantinedServices}`);
  
  // Count by provider
  const providersCount = await prisma.service.groupBy({
    by: ['providerId'],
    _count: {
      id: true
    },
    where: {
      isActive: true
    }
  });

  console.log('Active services count by provider:');
  for (const group of providersCount) {
    const provName = group.providerId 
      ? (await prisma.provider.findUnique({ where: { id: group.providerId } }))?.name 
      : 'No Provider';
    console.log(`  - ${provName}: ${group._count.id} active services`);
  }
  console.log('');

  // 3. Check Vexboost Network Distribution
  console.log('Vexboost services by network:');
  const vexCountByNetwork = await prisma.service.groupBy({
    by: ['categoryId'],
    where: {
      provider: {
        name: 'Vexboost'
      },
      isActive: true
    },
    _count: {
      id: true
    }
  });

  const networkCounts = new Map<string, number>();
  for (const item of vexCountByNetwork) {
    const cat = await prisma.category.findUnique({
      where: { id: item.categoryId },
      include: { network: true }
    });
    const netName = cat?.network?.name || 'Unknown';
    networkCounts.set(netName, (networkCounts.get(netName) || 0) + item._count.id);
  }

  for (const [net, count] of networkCounts.entries()) {
    console.log(`  - ${net}: ${count} active Vexboost services`);
  }
  console.log('');

  // 4. Sample Vexboost Services check
  console.log('Sample Vexboost Telegram services:');
  const vexTg = await prisma.service.findMany({
    where: {
      provider: { name: 'Vexboost' },
      category: { network: { slug: 'telegram' } },
      isActive: true
    },
    select: {
      id: true,
      name: true,
      targetType: true,
      rate: true,
      category: { select: { name: true } }
    },
    take: 10
  });

  if (vexTg.length === 0) {
    console.log('  ⚠️ No Telegram services found for Vexboost.');
  } else {
    vexTg.forEach(s => {
      console.log(`  - [${s.category.name}] Name: "${s.name}" -> targetType: ${s.targetType}, Rate: $${s.rate}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
