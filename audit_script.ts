import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const quarantinedServices = await prisma.service.findMany({
    where: { isQuarantined: true },
    select: { id: true, name: true, providerId: true, externalId: true, rate: true, pendingRate: true, quarantineReason: true, quarantinedAt: true },
    take: 5
  }).catch(() => []);
  
  const qCount = await prisma.service.count({ where: { isQuarantined: true } }).catch(() => 0);
  const zCount = await prisma.service.count({ where: { cooldownReason: 'ZOMBIE_AUTO_DISABLED' } }).catch(() => 0);
  
  const zombieServices = await prisma.service.findMany({
    where: { cooldownReason: 'ZOMBIE_AUTO_DISABLED' },
    select: { id: true, name: true, providerId: true },
    take: 5
  }).catch(() => []);
  
  const providers = await prisma.provider.findMany({
    where: { errorCount5m: { gt: 0 } },
    select: { id: true, name: true, errorCount5m: true, lastErrorAt: true }
  }).catch(() => []);
  
  console.log(JSON.stringify({
    quarantinedServices,
    qCount,
    zCount,
    zombieServices,
    providers
  }, null, 2));
}

run().finally(() => prisma.$disconnect());
