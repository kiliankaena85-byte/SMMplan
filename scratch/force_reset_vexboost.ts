import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== FORCE RESETTING VEXBOOST SERVICES IN DATABASE ===\n');

  const dbProvider = await prisma.provider.findFirst({ where: { name: 'Vexboost' } });
  if (!dbProvider) {
    console.error('No Vexboost provider found.');
    return;
  }

  // Get all Vexboost services
  const services = await prisma.service.findMany({
    where: { providerId: dbProvider.id }
  });

  console.log(`Found ${services.length} services for Vexboost.`);
  
  let updatedCount = 0;
  for (const s of services) {
    let targetRate = s.rate;
    
    // If it has a pendingRate from the sync (which is correctly divided by 95), use it!
    // Otherwise, if s.rate > 100, it means it's still in the old RUB scale, so divide it by 95!
    if (s.pendingRate && Number(s.pendingRate) > 0) {
      targetRate = Number(s.pendingRate);
    } else if (Number(s.rate) > 50) {
      targetRate = Number(s.rate) / 95.0;
    }

    await prisma.service.update({
      where: { id: s.id },
      data: {
        rate: targetRate,
        isQuarantined: false,
        pendingRate: null,
        quarantineReason: null,
        quarantinedAt: null,
        isActive: true
      }
    });
    updatedCount++;
  }

  console.log(`\nSuccessfully unquarantined and updated rates for ${updatedCount} Vexboost services!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
