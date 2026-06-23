import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const services = await prisma.service.findMany({
      include: {
        category: {
          include: {
            network: true
          }
        }
      }
    });

    console.log(`Total services in DB: ${services.length}`);
    
    // Group by category name and show targetType distribution
    const catStats: Record<string, { total: number, targetTypes: Record<string, number> }> = {};
    for (const s of services) {
      const catName = s.category?.name || 'No Category';
      const netName = s.category?.network?.name || 'No Network';
      const key = `[${netName}] ${catName}`;
      if (!catStats[key]) {
        catStats[key] = { total: 0, targetTypes: {} };
      }
      catStats[key].total++;
      catStats[key].targetTypes[s.targetType] = (catStats[key].targetTypes[s.targetType] || 0) + 1;
    }

    console.log('\n=== Category & TargetType Distribution ===');
    console.log(JSON.stringify(catStats, null, 2));

    // Inspect specifically Telegram reactions and other potential mismatches
    console.log('\n=== Inspecting Potential Telegram Reaction / Emoji Inconsistencies ===');
    const tgReactions = services.filter(s => {
      const nameLower = s.name.toLowerCase();
      const descLower = (s.description || '').toLowerCase();
      const catNameLower = (s.category?.name || '').toLowerCase();
      const isTg = s.category?.network?.slug === 'telegram';
      const hasReactionKeyword = nameLower.includes('реакц') || nameLower.includes('reaction') || nameLower.includes('эмодзи') || nameLower.includes('emoji') || 
                                 descLower.includes('реакц') || descLower.includes('reaction') || descLower.includes('эмодзи') || descLower.includes('emoji') ||
                                 nameLower.includes('👍') || nameLower.includes('🔥') || nameLower.includes('❤️') || descLower.includes('👍') || descLower.includes('🔥') || descLower.includes('❤️');
      return isTg && hasReactionKeyword;
    });

    console.log(`Found ${tgReactions.length} Telegram services matching reaction keywords/emojis.`);
    tgReactions.forEach(s => {
      console.log(`- Service ID ${s.id} (ExtId: ${s.externalId}):`);
      console.log(`  Name: ${s.name}`);
      console.log(`  Category: ${s.category?.name} (${s.categoryId})`);
      console.log(`  TargetType: ${s.targetType}`);
      console.log(`  CustomDataType: ${s.customDataType}`);
      console.log(`  Description (first 100 chars): ${s.description ? s.description.substring(0, 100).replace(/\n/g, ' ') : 'N/A'}`);
      console.log('--------------------------------------------------');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
