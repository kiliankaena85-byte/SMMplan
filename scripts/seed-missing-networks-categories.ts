import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import type { NormalizedServiceBlueprint } from './extract-erp-blueprint';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_HOST || 'postgresql://postgres:postgres@localhost:5435/smmplan_lite?schema=public'
    }
  }
});

interface NetworkDef {
  slug: string;
  name: string;
  sort: number;
  icon: string;
  patterns: { pattern: string; contentType: string }[];
}

const NETWORKS_CANONICAL: NetworkDef[] = [
  {
    slug: 'telegram',
    name: 'Telegram',
    sort: 1,
    icon: 'brand:telegram',
    patterns: [
      { pattern: 't\\.me\\/([a-zA-Z0-9_+]+)', contentType: 'channel' },
      { pattern: 't\\.me\\/c\\/(\\d+)\\/(\\d+)', contentType: 'post' },
      { pattern: 'telegram\\.me\\/([a-zA-Z0-9_+]+)', contentType: 'channel' }
    ]
  },
  {
    slug: 'vk',
    name: 'ВКонтакте',
    sort: 2,
    icon: 'brand:vk',
    patterns: [
      { pattern: 'vk\\.com\\/(wall|video|clip)-?\\d+_\\d+', contentType: 'post' },
      { pattern: 'vk\\.com\\/[a-zA-Z0-9_.]+', contentType: 'channel' },
      { pattern: 'vkvideo\\.ru\\/video-?\\d+_\\d+', contentType: 'video' }
    ]
  },
  {
    slug: 'instagram',
    name: 'Instagram',
    sort: 3,
    icon: 'brand:instagram',
    patterns: [
      { pattern: 'instagram\\.com\\/(p|reel|tv)\\/[^/]+', contentType: 'post' },
      { pattern: 'instagram\\.com\\/stories\\/[^/]+', contentType: 'story' },
      { pattern: 'instagram\\.com\\/[a-zA-Z0-9_.]+', contentType: 'profile' }
    ]
  },
  {
    slug: 'youtube',
    name: 'YouTube',
    sort: 4,
    icon: 'brand:youtube',
    patterns: [
      { pattern: 'youtube\\.com\\/(watch\\?v=|shorts\\/)[a-zA-Z0-9_-]+', contentType: 'video' },
      { pattern: 'youtu\\.be\\/[a-zA-Z0-9_-]+', contentType: 'video' },
      { pattern: 'youtube\\.com\\/(@|channel\\/)[a-zA-Z0-9_-]+', contentType: 'channel' }
    ]
  },
  {
    slug: 'tiktok',
    name: 'TikTok',
    sort: 5,
    icon: 'brand:tiktok',
    patterns: [
      { pattern: 'tiktok\\.com\\/@[^/]+\\/video\\/\\d+', contentType: 'video' },
      { pattern: 'vt\\.tiktok\\.com\\/[a-zA-Z0-9]+', contentType: 'video' },
      { pattern: 'tiktok\\.com\\/@[a-zA-Z0-9_.]+', contentType: 'profile' }
    ]
  },
  {
    slug: 'rutube',
    name: 'Rutube',
    sort: 6,
    icon: 'brand:rutube',
    patterns: [
      { pattern: 'rutube\\.ru\\/video\\/[a-zA-Z0-9]+', contentType: 'video' },
      { pattern: 'rutube\\.ru\\/shorts\\/[a-zA-Z0-9]+', contentType: 'video' },
      { pattern: 'rutube\\.ru\\/(channel|u)\\/[a-zA-Z0-9_-]+', contentType: 'channel' }
    ]
  },
  {
    slug: 'dzen',
    name: 'Дзен',
    sort: 7,
    icon: 'brand:dzen',
    patterns: [
      { pattern: 'dzen\\.ru\\/(a|b|video|media)\\/[^/]+', contentType: 'post' },
      { pattern: 'dzen\\.ru\\/id\\/[a-zA-Z0-9_-]+', contentType: 'channel' },
      { pattern: 'dzen\\.ru\\/[a-zA-Z0-9_.-]+', contentType: 'channel' }
    ]
  },
  {
    slug: 'twitch',
    name: 'Twitch',
    sort: 8,
    icon: 'brand:twitch',
    patterns: [
      { pattern: 'twitch\\.tv\\/videos\\/\\d+', contentType: 'video' },
      { pattern: 'twitch\\.tv\\/[^/]+\\/clip\\/[^/]+', contentType: 'video' },
      { pattern: 'twitch\\.tv\\/[a-zA-Z0-9_]+', contentType: 'channel' }
    ]
  },
  {
    slug: 'likee',
    name: 'Likee',
    sort: 9,
    icon: 'brand:likee',
    patterns: [
      { pattern: 'likee\\.video\\/@[^/]+\\/video\\/\\d+', contentType: 'video' },
      { pattern: 'likee\\.video\\/@[a-zA-Z0-9_.]+', contentType: 'profile' }
    ]
  },
  {
    slug: 'twitter',
    name: 'Twitter (X)',
    sort: 10,
    icon: 'brand:twitter',
    patterns: [
      { pattern: '(twitter|x)\\.com\\/[^/]+\\/status\\/\\d+', contentType: 'post' },
      { pattern: '(twitter|x)\\.com\\/[a-zA-Z0-9_]+', contentType: 'profile' }
    ]
  },
  {
    slug: 'facebook',
    name: 'Facebook',
    sort: 11,
    icon: 'brand:facebook',
    patterns: [
      { pattern: 'facebook\\.com\\/([^/]+|groups)\\/posts\\/\\d+', contentType: 'post' },
      { pattern: 'facebook\\.com\\/reel\\/\\d+', contentType: 'video' },
      { pattern: 'facebook\\.com\\/groups\\/[^/]+', contentType: 'channel' },
      { pattern: 'facebook\\.com\\/[a-zA-Z0-9_.]+', contentType: 'profile' }
    ]
  },
  {
    slug: 'ok',
    name: 'Одноклассники',
    sort: 12,
    icon: 'brand:ok',
    patterns: [
      { pattern: 'ok\\.ru\\/video\\/\\d+', contentType: 'video' },
      { pattern: 'ok\\.ru\\/group\\/\\d+', contentType: 'channel' },
      { pattern: 'ok\\.ru\\/profile\\/\\d+', contentType: 'profile' }
    ]
  },
  {
    slug: 'max',
    name: 'MAX',
    sort: 13,
    icon: 'brand:max',
    patterns: [
      { pattern: 'max\\.ru\\/id[a-zA-Z0-9_-]+', contentType: 'channel' }
    ]
  }
];

async function seed() {
  console.log('🌐 Seeding Networks and Categories into smmplan_lite...');

  // 1. Networks
  const networkMap = new Map<string, string>(); // slug -> networkId

  for (const n of NETWORKS_CANONICAL) {
    const existing = await prisma.network.findFirst({
      where: {
        OR: [
          { slug: n.slug },
          { name: n.name }
        ]
      }
    });

    let networkId: string;
    if (existing) {
      const updated = await prisma.network.update({
        where: { id: existing.id },
        data: {
          slug: n.slug,
          name: n.name,
          sort: n.sort,
          icon: n.icon,
          isActive: true,
          tenantId: 'all'
        }
      });
      networkId = updated.id;
      console.log(`   🔄 Updated Network: ${n.name} (${n.slug})`);
    } else {
      const created = await prisma.network.create({
        data: {
          slug: n.slug,
          name: n.name,
          sort: n.sort,
          icon: n.icon,
          isActive: true,
          tenantId: 'all'
        }
      });
      networkId = created.id;
      console.log(`   ➕ Created Network: ${n.name} (${n.slug})`);
    }
    networkMap.set(n.slug, networkId);

    // Ensure UrlPatterns
    for (const p of n.patterns) {
      const existingPat = await prisma.urlPattern.findFirst({
        where: {
          networkId,
          pattern: p.pattern
        }
      });
      if (!existingPat) {
        await prisma.urlPattern.create({
          data: {
            networkId,
            pattern: p.pattern,
            contentType: p.contentType
          }
        });
      }
    }
  }

  // 2. Categories from Blueprint
  const blueprintPath = path.resolve(__dirname, 'data', 'master-services-blueprint.json');
  if (!fs.existsSync(blueprintPath)) {
    console.error('❌ master-services-blueprint.json not found. Run extract-erp-blueprint.ts first.');
    return;
  }

  const blueprint: NormalizedServiceBlueprint[] = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));
  console.log(`\n📦 Processing categories from ${blueprint.length} services...`);

  // Extract distinct categories
  const categoriesToSeed = new Map<string, {
    networkSlug: string;
    name: string;
    slug: string;
    activityType: string;
  }>();

  for (const item of blueprint) {
    const key = `${item.network.slug}:${item.category.name}`;
    if (!categoriesToSeed.has(key)) {
      categoriesToSeed.set(key, {
        networkSlug: item.network.slug,
        name: item.category.name,
        slug: item.category.slug,
        activityType: item.category.activityType
      });
    }
  }

  console.log(`📋 Total distinct categories to verify/seed: ${categoriesToSeed.size}`);

  let createdCats = 0;
  let updatedCats = 0;

  let sortCounter = 1;
  for (const cat of categoriesToSeed.values()) {
    const networkId = networkMap.get(cat.networkSlug);
    if (!networkId) {
      console.warn(`⚠️ Network not found for slug: ${cat.networkSlug}`);
      continue;
    }

    const existingCat = await prisma.category.findFirst({
      where: {
        networkId,
        name: { equals: cat.name, mode: 'insensitive' }
      }
    });

    if (existingCat) {
      await prisma.category.update({
        where: { id: existingCat.id },
        data: {
          activityType: cat.activityType,
          tenantId: 'all'
        }
      });
      updatedCats++;
    } else {
      // Ensure unique slug
      let uniqueSlug = cat.slug;
      const slugExists = await prisma.category.findUnique({ where: { slug: uniqueSlug } });
      if (slugExists) {
        uniqueSlug = `${cat.slug}-${Math.floor(Math.random() * 1000)}`;
      }

      await prisma.category.create({
        data: {
          name: cat.name,
          slug: uniqueSlug,
          networkId,
          activityType: cat.activityType,
          sort: sortCounter++,
          tenantId: 'all'
        }
      });
      createdCats++;
      console.log(`   ➕ Created Category: ${cat.name} (${cat.networkSlug})`);
    }
  }

  console.log(`\n🎉 SEED COMPLETED!`);
  console.log(`   Networks: ${networkMap.size}`);
  console.log(`   Categories Created: ${createdCats}`);
  console.log(`   Categories Updated: ${updatedCats}`);
  console.log(`   Total Categories in DB: ${await prisma.category.count()}`);
}

seed()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
