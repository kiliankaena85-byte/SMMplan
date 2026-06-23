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

    const ruleCounts: Record<string, number> = {};
    const sampleErrors: Record<string, Array<{ id: string, name: string, category: string, targetType: string, customDataType: string, details: string }>> = {};

    for (const s of services) {
      const name = s.name;
      const nameLower = name.toLowerCase();
      const desc = s.description || '';
      const descLower = desc.toLowerCase();
      const categoryName = s.category?.name || '';
      const categoryNameLower = categoryName.toLowerCase();
      const targetType = s.targetType;
      const customDataType = s.customDataType;
      const networkSlug = s.category?.network?.slug || 'unknown';

      const addError = (rule: string, details: string) => {
        ruleCounts[rule] = (ruleCounts[rule] || 0) + 1;
        if (!sampleErrors[rule]) sampleErrors[rule] = [];
        if (sampleErrors[rule].length < 5) {
          sampleErrors[rule].push({
            id: s.id,
            name,
            category: categoryName,
            targetType,
            customDataType,
            details
          });
        }
      };

      // Rule 1: Auto-services (multi-post) targetType check
      const isAuto = nameLower.includes('авто') || nameLower.includes('auto') || 
                     nameLower.includes('последних') || nameLower.includes('последние') || 
                     nameLower.includes('будущие') || nameLower.includes('на посты') || 
                     nameLower.includes('на новые посты') || nameLower.includes('авто-просмотры') || 
                     nameLower.includes('автопросмотр') || nameLower.includes('авто-лайки') ||
                     nameLower.includes('автолайк') || nameLower.includes('авто-реакци') ||
                     nameLower.includes('автореакци');
      
      if (isAuto && targetType === 'POST') {
        addError('Auto-Service expecting POST', `Name suggests auto/multi-post service, but targetType is POST.`);
      }

      // Rule 2: Subscribers / Members / Group joins targetType check
      const isSubscriber = categoryNameLower.includes('подписч') || categoryNameLower.includes('участн') || 
                           categoryNameLower.includes('фолловер') || categoryNameLower.includes('subscriber') || 
                           categoryNameLower.includes('follower') || categoryNameLower.includes('групп') || 
                           categoryNameLower.includes('буст') || categoryNameLower.includes('boost') ||
                           categoryNameLower.includes('друзья') || categoryNameLower.includes('friend') ||
                           categoryNameLower.includes('premium') || nameLower.includes('подписчики');
      
      if (isSubscriber && !nameLower.includes('истори') && !nameLower.includes('story') && !nameLower.includes('пост') && targetType === 'POST') {
        addError('Subscriber expecting POST', `Category is subscriber/group, but targetType is POST instead of CHANNEL.`);
      }

      // Rule 3: Single post services targetType check
      const isSinglePost = (categoryNameLower.includes('лайк') || categoryNameLower.includes('like') || 
                            categoryNameLower.includes('просмотр') || categoryNameLower.includes('view') || 
                            categoryNameLower.includes('реакц') || categoryNameLower.includes('reaction') || 
                            categoryNameLower.includes('репост') || categoryNameLower.includes('share') || 
                            categoryNameLower.includes('коммент') || categoryNameLower.includes('comment')) &&
                           !isAuto;
      
      if (isSinglePost && targetType === 'CHANNEL' && !nameLower.includes('канал') && !nameLower.includes('профиль') && !nameLower.includes('аккаунт')) {
        addError('Single Post service expecting CHANNEL', `Category is single post, but targetType is CHANNEL instead of POST.`);
      }

      // Rule 4: Custom comments comments format check
      const isCustomComment = nameLower.includes('свои комментари') || nameLower.includes('кастомные комментари') || 
                              nameLower.includes('со своим текстом') || nameLower.includes('custom comments') || 
                              nameLower.includes('custom text') || nameLower.includes('со своими') ||
                              nameLower.includes('текстовые') || descLower.includes('свой текст') || 
                              descLower.includes('свои комментари') || descLower.includes('кастомные комментари');
      
      if (isCustomComment && customDataType !== 'TEXTAREA' && !nameLower.includes('рандом')) {
        addError('Comment service lacks TEXTAREA', `Name/description indicates custom comments, but customDataType is ${customDataType}.`);
      }

      // Rule 5: Poll / Vote option check
      const isPoll = categoryNameLower.includes('опрос') || categoryNameLower.includes('голос') || 
                     categoryNameLower.includes('poll') || categoryNameLower.includes('vote') ||
                     nameLower.includes('опрос') || nameLower.includes('голос') || nameLower.includes('викторин');
      
      if (isPoll && customDataType !== 'NUMBER') {
        addError('Poll service lacks NUMBER', `Name/category indicates poll/vote, but customDataType is ${customDataType}.`);
      }

      // Rule 7: Telegram Reactions Category Mismatch
      const isTgReactionKeyword = nameLower.includes('реакци') || nameLower.includes('reaction') || 
                                  nameLower.includes('эмодзи') || nameLower.includes('emoji') ||
                                  (nameLower.includes('👍') && nameLower.includes('🔥') && nameLower.includes('❤️'));
      
      if (isTgReactionKeyword && networkSlug === 'telegram' && !categoryNameLower.includes('реакц') && !categoryNameLower.includes('эмодзи') && !categoryNameLower.includes('автореакц')) {
        addError('Reaction service not in Reaction category', `Telegram reaction service is in category '${categoryName}'.`);
      }
    }

    console.log('=== ERROR RULE COUNTS ===');
    console.log(JSON.stringify(ruleCounts, null, 2));

    console.log('\n=== SAMPLE ERRORS BY RULE ===');
    for (const [rule, samples] of Object.entries(sampleErrors)) {
      console.log(`\nRule: ${rule} (${ruleCounts[rule]} occurrences)`);
      samples.forEach(s => {
        console.log(`  - [${s.id}] "${s.name}"`);
        console.log(`    Cat: "${s.category}", TargetType: ${s.targetType}, CustomDataType: ${s.customDataType}`);
        console.log(`    Details: ${s.details}`);
      });
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
