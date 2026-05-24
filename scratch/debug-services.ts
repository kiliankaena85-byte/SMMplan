import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function inferTargetTypeForSeed(categoryName: string): string {
  const lower = categoryName.toLowerCase();
  if (['подписчик', 'участник', 'subscriber', 'follower', 'буст', 'boost', 'груп', 'group', 'друз', 'friend', 'автопросмотр', 'массовые просмотры', 'auto view'].some(k => lower.includes(k))) return 'CHANNEL';
  if (['стори', 'story', 'stories', 'истори'].some(k => lower.includes(k))) return 'STORY';
  if (['звёзд', 'звезд', 'star'].some(k => lower.includes(k))) return 'CUSTOM';
  return 'POST';
}

async function main() {
  const providers = await prisma.provider.findMany();
  console.log(`Found ${providers.length} providers`);
  
  const categories = await prisma.category.findMany();
  console.log(`Found ${categories.length} categories`);

  console.log('Deleting existing services...');
  await prisma.service.deleteMany({});
  
  let serviceCounter = 0;
  for (const cat of categories) {
    const tiers = ['Эконом', 'Стандарт', 'Премиум'];
    for (let t = 0; t < tiers.length; t++) {
      const prv = providers[serviceCounter % providers.length];
      const baseRate = 0.05 + (t * 0.1) + (serviceCounter % 3) * 0.02;
      const markupMultiplier = 1.6;
      const pricePer1000Cents = Math.round(baseRate * markupMultiplier * 90 * 100);

      const externalId = `srv_${cat.id}_${t}`;
      
      // Verify Category and Provider exist
      const catCheck = await prisma.category.findUnique({ where: { id: cat.id } });
      const prvCheck = await prisma.provider.findUnique({ where: { id: prv.id } });
      
      console.log(`Creating service for Category: "${cat.name}" (exists: ${!!catCheck}), Provider: "${prv.name}" (exists: ${!!prvCheck})`);
      
      try {
        const srv = await prisma.service.create({
          data: {
            name: `${cat.name} • ${tiers[t]}`,
            categoryId: cat.id,
            providerId: prv.id,
            rate: baseRate,
            markup: markupMultiplier,
            pricePer1000Cents,
            minQty: 10,
            maxQty: 100000,
            externalId,
            isActive: true,
            targetType: inferTargetTypeForSeed(cat.name)
          }
        });
        console.log(`Created service: "${srv.name}" (id: ${srv.id})`);
      } catch (err: any) {
        console.error(`FAILED to create service:`, err);
        throw err;
      }
      serviceCounter++;
    }
  }
  console.log('Service seeding complete!');
}

main()
  .catch(e => {
    console.error('Fatal Error:', e);
  })
  .finally(() => prisma.$disconnect());
