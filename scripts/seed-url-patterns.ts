import { PrismaClient } from '@prisma/client';
import { LINK_RULES, IntelligencePlatform } from '../src/services/analyzer/link-rules';

const prisma = new PrismaClient();

// Platform enum to network slug mapping
const PLATFORM_TO_SLUGS: Record<string, string[]> = {
  [IntelligencePlatform.TELEGRAM]: ['telegram'],
  [IntelligencePlatform.VK]: ['vkontakte', 'vk'],
  [IntelligencePlatform.INSTAGRAM]: ['instagram'],
  [IntelligencePlatform.YOUTUBE]: ['youtube'],
  [IntelligencePlatform.TIKTOK]: ['tiktok'],
  [IntelligencePlatform.TWITCH]: ['twitch'],
  [IntelligencePlatform.TWITTER]: ['twitter'],
  [IntelligencePlatform.WEBSITE]: ['website'],
  [IntelligencePlatform.LIKEE]: ['likee'],
  [IntelligencePlatform.OK]: ['ok'],
  [IntelligencePlatform.RUTUBE]: ['rutube'],
  [IntelligencePlatform.DZEN]: ['dzen'],
  [IntelligencePlatform.DISCORD]: ['discord'],
  [IntelligencePlatform.KICK]: ['kick'],
  [IntelligencePlatform.SPOTIFY]: ['spotify'],
  [IntelligencePlatform.FACEBOOK]: ['facebook'],
  [IntelligencePlatform.MAX]: ['max'],
  [IntelligencePlatform.STEAM]: ['steam'],
  [IntelligencePlatform.WIBES]: ['wibes'],
  [IntelligencePlatform.TROVO]: ['trovo'],
  [IntelligencePlatform.WHATSAPP]: ['whatsapp'],
};

async function main() {
  console.log('--- Seeding UrlPattern from LINK_RULES ---');

  const networks = await prisma.network.findMany();
  console.log(`Found ${networks.length} networks in database.`);

  const networkBySlug = new Map<string, typeof networks[0]>();
  for (const net of networks) {
    networkBySlug.set(net.slug.toLowerCase(), net);
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < LINK_RULES.length; i++) {
    const rule = LINK_RULES[i];
    const slugs = PLATFORM_TO_SLUGS[rule.platform];
    if (!slugs) continue;

    for (const slug of slugs) {
      const net = networkBySlug.get(slug);
      if (!net) continue;

      const patternStr = rule.pattern.source;
      const contentType = rule.type;

      // Check if this pattern already exists for this network
      const existing = await prisma.urlPattern.findFirst({
        where: {
          networkId: net.id,
          pattern: patternStr,
        },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      await prisma.urlPattern.create({
        data: {
          networkId: net.id,
          pattern: patternStr,
          contentType: contentType,
          sort: i,
        },
      });

      createdCount++;
    }
  }

  console.log(`Successfully created ${createdCount} UrlPattern entries.`);
  console.log(`Skipped ${skippedCount} existing entries.`);
  
  const totalCount = await prisma.urlPattern.count();
  console.log(`Total UrlPattern in DB now: ${totalCount}`);
}

main()
  .catch((err) => {
    console.error('Failed to seed UrlPattern:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
