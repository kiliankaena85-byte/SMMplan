import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const services = await prisma.service.findMany({
      where: {
        category: {
          network: {
            slug: 'telegram'
          }
        }
      },
      include: {
        category: true
      }
    });

    console.log(`Telegram services count: ${services.length}`);
    const suspectServices = [];

    for (const s of services) {
      const name = s.name;
      const nameLower = name.toLowerCase();
      const catName = s.category?.name || '';
      const targetType = s.targetType;

      const hasReactionKeyword = nameLower.includes('реакц') || nameLower.includes('reaction') || nameLower.includes('эмодзи') || nameLower.includes('emoji');
      
      // Suspect if name has reaction keyword but category is not Reactions/Emoji or Auto-reactions,
      // OR if targetType is CHANNEL but it's a single post reaction,
      // OR if targetType is POST but it's a multi-post auto-reaction.
      if (hasReactionKeyword) {
        suspectServices.push(s);
      }
    }

    console.log(`Found ${suspectServices.length} Telegram services with reaction keywords:`);
    suspectServices.forEach(s => {
      console.log(`- ID: ${s.id} (Ext ID: ${s.externalId})`);
      console.log(`  Name: ${s.name}`);
      console.log(`  Category: ${s.category?.name}`);
      console.log(`  TargetType: ${s.targetType}`);
      console.log(`  CustomDataType: ${s.customDataType}`);
      console.log('--------------------------------------------------');
    });

  } finally {
    await prisma.$disconnect();
  }
}

main();
