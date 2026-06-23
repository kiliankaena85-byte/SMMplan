import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const services = await prisma.service.findMany({
      where: {
        category: {
          name: {
            in: [
              '👨‍👩‍👧‍👦 Подписчики / Участники',
              '👥 Вступление в группы / чаты',
              '💎 Premium Подписчики'
            ]
          }
        }
      },
      include: {
        category: true
      }
    });

    console.log(`Checking ${services.length} services in subscribers/groups categories...`);
    const mismatches = [];

    for (const s of services) {
      const name = s.name;
      const nameLower = name.toLowerCase();
      
      // Look for reaction keywords or emoji indicators of reactions
      const hasReactionKeyword = nameLower.includes('реакц') || nameLower.includes('reaction') || nameLower.includes('эмодзи') || nameLower.includes('emoji');
      
      // Let's also look for common reaction emoji combinations like 👍, 🔥, ❤️, 🎉, 🤩, 👏, 💯
      const hasReactionEmojis = (nameLower.includes('👍') || nameLower.includes('🔥') || nameLower.includes('❤️') || nameLower.includes('🎉') || nameLower.includes('🤩') || nameLower.includes('👏') || nameLower.includes('💯') || nameLower.includes('🥰') || nameLower.includes('👀')) && 
                                !nameLower.includes('гарант') && !nameLower.includes('подпис') && !nameLower.includes('участ');

      if (hasReactionKeyword || hasReactionEmojis) {
        mismatches.push(s);
      }
    }

    console.log(`Found ${mismatches.length} potential mismatches:`);
    mismatches.forEach(s => {
      console.log(`- ID: ${s.id} (Ext ID: ${s.externalId})`);
      console.log(`  Name: ${s.name}`);
      console.log(`  Category: ${s.category?.name}`);
      console.log(`  TargetType: ${s.targetType}`);
      console.log('--------------------------------------------------');
    });

  } finally {
    await prisma.$disconnect();
  }
}

main();
