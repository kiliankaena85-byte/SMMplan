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

    console.log(`Analyzing ${services.length} services for category mismatches...`);
    const reactionMismatches = [];
    const viewMismatches = [];
    const subscriberMismatches = [];

    for (const s of services) {
      const name = s.name;
      const nameLower = name.toLowerCase();
      const catName = s.category?.name || '';
      const catNameLower = catName.toLowerCase();

      // 1. Reactions Mismatches
      const hasReactionKeyword = nameLower.includes('реакц') || nameLower.includes('reaction') || nameLower.includes('эмодзи') || nameLower.includes('emoji');
      const isInReactionCategory = catNameLower.includes('реакц') || catNameLower.includes('эмодзи') || catNameLower.includes('автореакц');
      if (hasReactionKeyword && !isInReactionCategory && !nameLower.includes('будущ') && !nameLower.includes('авто')) {
        reactionMismatches.push(s);
      }

      // 2. View Mismatches
      const hasViewKeyword = nameLower.includes('просмотр') || nameLower.includes('view') || nameLower.includes('eye') || nameLower.includes('глаз') || nameLower.includes('глядел');
      const isInViewCategory = catNameLower.includes('просмотр') || catNameLower.includes('охват') || catNameLower.includes('автопросмотр') || catNameLower.includes('стрим') || catNameLower.includes('stream') || catNameLower.includes('зрител') || catNameLower.includes('посещен') || catNameLower.includes('сигнал');
      if (hasViewKeyword && !isInViewCategory && !nameLower.includes('подпис') && !nameLower.includes('участн') && !nameLower.includes('лайк') && !nameLower.includes('like')) {
        viewMismatches.push(s);
      }

      // 3. Subscriber/Member mismatches in non-subscriber categories
      const hasSubscriberKeyword = nameLower.includes('подписч') || nameLower.includes('участник') || nameLower.includes('member') || nameLower.includes('follower') || nameLower.includes('фолловер') || nameLower.includes('инвайт');
      const isInSubscriberCategory = catNameLower.includes('подписч') || catNameLower.includes('участник') || catNameLower.includes('member') || catNameLower.includes('follower') || catNameLower.includes('групп') || catNameLower.includes('чат') || catNameLower.includes('буст') || catNameLower.includes('boost') || catNameLower.includes('друзья') || catNameLower.includes('friend') || catNameLower.includes('premium') || catNameLower.includes('робот') || catNameLower.includes('бот') || catNameLower.includes('реферал') || catNameLower.includes('сигнал');
      if (hasSubscriberKeyword && !isInSubscriberCategory && !nameLower.includes('просмотр') && !nameLower.includes('view') && !nameLower.includes('лайк') && !nameLower.includes('like') && !nameLower.includes('реакци') && !nameLower.includes('reaction')) {
        subscriberMismatches.push(s);
      }
    }

    console.log(`\n=== 1. Reactions Mismatches (${reactionMismatches.length} found) ===`);
    reactionMismatches.forEach(s => {
      console.log(`- ID: ${s.id} (Ext ID: ${s.externalId}) | Platform: ${s.category?.network?.name}`);
      console.log(`  Name: ${s.name}`);
      console.log(`  Category: ${s.category?.name}`);
      console.log(`  TargetType: ${s.targetType}`);
    });

    console.log(`\n=== 2. Views Mismatches (${viewMismatches.length} found) ===`);
    viewMismatches.forEach(s => {
      console.log(`- ID: ${s.id} (Ext ID: ${s.externalId}) | Platform: ${s.category?.network?.name}`);
      console.log(`  Name: ${s.name}`);
      console.log(`  Category: ${s.category?.name}`);
      console.log(`  TargetType: ${s.targetType}`);
    });

    console.log(`\n=== 3. Subscriber Mismatches (${subscriberMismatches.length} found) ===`);
    subscriberMismatches.forEach(s => {
      console.log(`- ID: ${s.id} (Ext ID: ${s.externalId}) | Platform: ${s.category?.network?.name}`);
      console.log(`  Name: ${s.name}`);
      console.log(`  Category: ${s.category?.name}`);
      console.log(`  TargetType: ${s.targetType}`);
    });

  } finally {
    await prisma.$disconnect();
  }
}

main();
