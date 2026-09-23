import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

let databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5435/smmplan_lite?schema=public';
if (databaseUrl.includes(':5433')) {
  databaseUrl = databaseUrl.replace(':5433', ':5435');
}
if (databaseUrl.includes('localhost')) {
  databaseUrl = databaseUrl.replace('localhost', '127.0.0.1');
}
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

const PLATFORM_TO_SLUGS = {
  TELEGRAM: ['telegram'],
  VK: ['vkontakte', 'vk'],
  INSTAGRAM: ['instagram'],
  YOUTUBE: ['youtube'],
  TIKTOK: ['tiktok'],
  TWITCH: ['twitch'],
  TWITTER: ['twitter'],
  WEBSITE: ['website'],
  LIKEE: ['likee'],
  OK: ['ok'],
  RUTUBE: ['rutube'],
  DZEN: ['dzen'],
  DISCORD: ['discord'],
  KICK: ['kick'],
  SPOTIFY: ['spotify'],
  FACEBOOK: ['facebook'],
  MAX: ['max'],
  STEAM: ['steam'],
  WIBES: ['wibes'],
  TROVO: ['trovo'],
  WHATSAPP: ['whatsapp'],
};

async function main() {
  console.log('Connecting to database...');
  const networks = await prisma.network.findMany({
    select: { id: true, name: true, slug: true },
  });
  console.log(`Found ${networks.length} networks in database.`);

  const networkBySlug = new Map();
  for (const net of networks) {
    networkBySlug.set(net.slug.toLowerCase(), net);
  }

  const rulesFilePath = path.join(process.cwd(), 'src', 'services', 'analyzer', 'link-rules.ts');
  const fileContent = fs.readFileSync(rulesFilePath, 'utf8');

  // Parse each rule block
  // Example block:
  // {
  //     platform: IntelligencePlatform.TELEGRAM,
  //     type: 'private_post',
  //     pattern: /(?:t\.me|telegram\.me|telegram\.dog)\/c\/(\d+)\/(\d+)\/?(?:\?.*)?$/i,
  //     ...
  // }
  const ruleBlockRegex = /\{\s*platform:\s*IntelligencePlatform\.(\w+),\s*type:\s*['"]([^'"]+)['"],\s*pattern:\s*\/((?:\\\/|[^\/])+)\/([gimsuy]*)/g;

  let match;
  let parsedRules = [];
  while ((match = ruleBlockRegex.exec(fileContent)) !== null) {
    parsedRules.push({
      platform: match[1],
      contentType: match[2],
      pattern: match[3],
    });
  }

  console.log(`Extracted ${parsedRules.length} rules from link-rules.ts`);

  let createdCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < parsedRules.length; i++) {
    const rule = parsedRules[i];
    const slugs = PLATFORM_TO_SLUGS[rule.platform];
    if (!slugs) continue;

    for (const slug of slugs) {
      const net = networkBySlug.get(slug);
      if (!net) continue;

      // Check if existing
      const existing = await prisma.urlPattern.findFirst({
        where: {
          networkId: net.id,
          pattern: rule.pattern,
        },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      await prisma.urlPattern.create({
        data: {
          networkId: net.id,
          pattern: rule.pattern,
          contentType: rule.contentType,
          sort: i,
        },
      });

      createdCount++;
    }
  }

  console.log(`Successfully created ${createdCount} UrlPattern rows.`);
  console.log(`Skipped ${skippedCount} already existing rows.`);

  const total = await prisma.urlPattern.count();
  console.log(`Total UrlPattern rows in DB: ${total}`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
