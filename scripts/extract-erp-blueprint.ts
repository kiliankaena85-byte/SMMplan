import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { TargetTypeEnum, inferTargetTypeFromName } from '../src/utils/target-type-mapper';

interface RawErpService {
  id: number;
  site_id: number;
  name: string;
  category: string;
  activity: string;
  provider_name: string;
  provider_service_id: number;
  price: number;
  status: string;
  markup_percent: number;
  real_markup: number;
}

export interface NormalizedServiceBlueprint {
  network: {
    slug: string;
    name: string;
    sort: number;
  };
  category: {
    name: string;
    slug: string;
    activityType: string;
  };
  service: {
    name: string;
    originalTariff: string;
    providerName: string;
    providerServiceId: string;
    retailPriceRub: number;
    retailPriceCents: number;
    targetType: string;
    customDataType: 'NONE' | 'TEXTAREA' | 'NUMBER';
    linkPlaceholder: string;
    linkHint: string;
    qualityTier: 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'VIP';
  };
}

const NETWORK_CONFIGS: Record<string, { slug: string; name: string; sort: number; placeholder: string }> = {
  'Telegram': { slug: 'telegram', name: 'Telegram', sort: 1, placeholder: 'https://t.me/channel_name' },
  'Вконтакте': { slug: 'vk', name: 'ВКонтакте', sort: 2, placeholder: 'https://vk.com/group_or_wall' },
  'Instagram': { slug: 'instagram', name: 'Instagram', sort: 3, placeholder: 'https://instagram.com/username' },
  'YouTube': { slug: 'youtube', name: 'YouTube', sort: 4, placeholder: 'https://youtube.com/watch?v=...' },
  'TikTok': { slug: 'tiktok', name: 'TikTok', sort: 5, placeholder: 'https://tiktok.com/@username/video/...' },
  'Rutube': { slug: 'rutube', name: 'Rutube', sort: 6, placeholder: 'https://rutube.ru/video/...' },
  'Яндекс Дзен': { slug: 'dzen', name: 'Дзен', sort: 7, placeholder: 'https://dzen.ru/id/...' },
  'Twitch': { slug: 'twitch', name: 'Twitch', sort: 8, placeholder: 'https://twitch.tv/username' },
  'Likee': { slug: 'likee', name: 'Likee', sort: 9, placeholder: 'https://likee.video/@username' },
  'Twitter (x)': { slug: 'twitter', name: 'Twitter (X)', sort: 10, placeholder: 'https://x.com/username/status/...' },
  'Facebook': { slug: 'facebook', name: 'Facebook', sort: 11, placeholder: 'https://facebook.com/page_or_post' },
  'Одноклассники': { slug: 'ok', name: 'Одноклассники', sort: 12, placeholder: 'https://ok.ru/group/...' },
  'MAX': { slug: 'max', name: 'MAX', sort: 13, placeholder: 'https://max.ru/id...' }
};

function transliterate(str: string): string {
  const ru: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    ' ': '-', '_': '-'
  };
  return str.toLowerCase().split('').map(char => ru[char] || (/[a-z0-9]/.test(char) ? char : '')).join('').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function resolveActivityType(categoryName: string): string {
  const c = categoryName.toLowerCase();
  if (c.includes('подписчик') || c.includes('фолловер') || c.includes('участник') || c.includes('друзь') || c.includes('заявк')) {
    return 'FOLLOWERS';
  }
  if (c.includes('лайк') || c.includes('дизлайк') || c.includes('реакци')) {
    return 'LIKES';
  }
  if (c.includes('просмотр') || c.includes('охват') || c.includes('прослушиван') || c.includes('прочтени') || c.includes('зрител')) {
    return 'VIEWS';
  }
  if (c.includes('репост') || c.includes('ретвит') || c.includes('сохранен') || c.includes('скачиван')) {
    return 'REPOSTS';
  }
  if (c.includes('коммент') || c.includes('отзыв')) {
    return 'COMMENTS';
  }
  if (c.includes('опрос') || c.includes('голос')) {
    return 'VOTES';
  }
  if (c.includes('буст') || c.includes('звезд') || c.includes('stars')) {
    return 'BOOSTS';
  }
  return 'OTHER';
}

function resolveLinkSpecification(
  networkSlug: string,
  categoryName: string,
  serviceName: string
): { targetType: TargetTypeEnum; customDataType: 'NONE' | 'TEXTAREA' | 'NUMBER'; placeholder: string; hint: string } {
  const cat = categoryName.toLowerCase();
  const sName = serviceName.toLowerCase();

  // Comments
  if (cat.includes('коммент')) {
    return {
      targetType: TargetTypeEnum.COMMENTS,
      customDataType: 'TEXTAREA',
      placeholder: networkSlug === 'telegram' ? 'https://t.me/channel/123' : 'https://... (ссылка на публикацию)',
      hint: 'Укажите ссылку на пост или видео, а в поле ниже — каждый комментарий с новой строки.'
    };
  }

  // Polls
  if (cat.includes('опрос') || cat.includes('голос')) {
    return {
      targetType: TargetTypeEnum.POLL,
      customDataType: 'NUMBER',
      placeholder: networkSlug === 'vk' ? 'https://vk.com/wall-123_456' : 'https://x.com/.../status/123',
      hint: 'Укажите ссылку на опрос, а в поле ниже — номер варианта ответа (например, 1).'
    };
  }

  // Bot referrals
  if (cat.includes('реферал') || cat.includes('бот')) {
    return {
      targetType: TargetTypeEnum.BOT,
      customDataType: 'NONE',
      placeholder: 'https://t.me/BotName?start=123456',
      hint: 'Укажите вашу персональную реферальную ссылку на бота.'
    };
  }

  // Telegram Multi-posts / Channel-posts (Auto-views)
  if (
    (networkSlug === 'telegram' || networkSlug === 'max') &&
    (sName.includes('последн') || sName.includes('будущ') || sName.includes('авто') || cat.includes('последн'))
  ) {
    return {
      targetType: TargetTypeEnum.CHANNEL_POSTS,
      customDataType: 'NONE',
      placeholder: 'https://t.me/channel_name',
      hint: 'Укажите ссылку на канал — просмотры будут автоматически распределены по публикациям.'
    };
  }

  // Subscribers / Followers
  if (cat.includes('подписчик') || cat.includes('участник') || cat.includes('буст')) {
    if (networkSlug === 'instagram' || networkSlug === 'tiktok' || networkSlug === 'likee' || (networkSlug === 'facebook' && cat.includes('профиль'))) {
      return {
        targetType: TargetTypeEnum.PROFILE,
        customDataType: 'NONE',
        placeholder: `https://${networkSlug}.com/username`,
        hint: 'Укажите ссылку на ваш открытый профиль/аккаунт.'
      };
    }
    if (networkSlug === 'vk' && cat.includes('друзь')) {
      return {
        targetType: TargetTypeEnum.PROFILE,
        customDataType: 'NONE',
        placeholder: 'https://vk.com/id12345678',
        hint: 'Укажите ссылку на вашу личную страницу ВКонтакте.'
      };
    }
    return {
      targetType: TargetTypeEnum.CHANNEL,
      customDataType: 'NONE',
      placeholder: networkSlug === 'telegram' ? 'https://t.me/channel_name' : `https://${networkSlug}.com/...`,
      hint: 'Укажите ссылку на публичный канал или группу (для приватных — инвайт-ссылку).'
    };
  }

  // Video / Reels / Clips / Streams
  if (
    cat.includes('видео') ||
    cat.includes('клип') ||
    cat.includes('стрим') ||
    cat.includes('зрител') ||
    cat.includes('эфир') ||
    cat.includes('рилс') ||
    cat.includes('прочтени') ||
    networkSlug === 'rutube' ||
    networkSlug === 'youtube' ||
    networkSlug === 'twitch'
  ) {
    if (cat.includes('подписчик')) {
      return {
        targetType: TargetTypeEnum.CHANNEL,
        customDataType: 'NONE',
        placeholder: networkSlug === 'youtube' ? 'https://youtube.com/@channel' : `https://${networkSlug}.tv/username`,
        hint: 'Укажите ссылку на ваш канал.'
      };
    }
    return {
      targetType: TargetTypeEnum.VIDEO,
      customDataType: 'NONE',
      placeholder: networkSlug === 'youtube' ? 'https://youtube.com/watch?v=...' : `https://${networkSlug}.ru/video/...`,
      hint: 'Укажите прямую ссылку на видеоролик, клип или текущий стрим.'
    };
  }

  // Single Posts (Likes, Reactions, Reposts, Single Views)
  if (cat.includes('лайк') || cat.includes('реакци') || cat.includes('репост') || cat.includes('просмотр') || cat.includes('сохранен') || cat.includes('звезд')) {
    return {
      targetType: TargetTypeEnum.POST,
      customDataType: 'NONE',
      placeholder: networkSlug === 'telegram' ? 'https://t.me/channel/123' : networkSlug === 'vk' ? 'https://vk.com/wall-123_456' : 'https://.../post/123',
      hint: 'Укажите ссылку на конкретный пост или публикацию.'
    };
  }

  return {
    targetType: TargetTypeEnum.CUSTOM,
    customDataType: 'NONE',
    placeholder: 'https://...',
    hint: 'Укажите корректную ссылку на объект накрутки.'
  };
}

function cleanServiceName(platformName: string, categoryName: string, tariffName: string): string {
  // Strip raw brand leaks
  let clean = tariffName
    .replace(/vexboost/gi, '')
    .replace(/primelike/gi, '')
    .replace(/smmtoolbox/gi, '')
    .replace(/smmprime/gi, '')
    .replace(/soc-rocket/gi, '')
    .replace(/stream-promotion/gi, '')
    .replace(/\(Live\s*\)/gi, '')
    .replace(/\[.*?\]/g, '') // remove brackets like [HQ | 0-1/H]
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length < 2) {
    clean = 'Стандарт';
  }

  // Capitalize first letter
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);

  // If tariff name already includes category or platform, don't duplicate
  if (clean.toLowerCase().includes(categoryName.toLowerCase())) {
    return `${platformName} ${clean}`;
  }

  return `${platformName} ${categoryName} — ${clean}`;
}

function determineQualityTier(name: string): 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'VIP' {
  const n = name.toLowerCase();
  if (n.includes('vip') || n.includes('вип')) return 'VIP';
  if (n.includes('премиум') || n.includes('premium') || n.includes('живые') || n.includes('hq')) return 'PREMIUM';
  if (n.includes('эконом') || n.includes('дешев') || n.includes('быстр') || n.includes('бот')) return 'ECONOMY';
  return 'STANDARD';
}

async function extractBlueprint() {
  console.log('🚀 Starting ERP Master Blueprint Extraction...');

  // Single-line query to prevent Windows cmd.exe multiline truncation
  const sql = "SELECT DISTINCT ON (provider_name, provider_service_id) id, site_id, name, category, activity, provider_name, provider_service_id, price, status, markup_percent, real_markup FROM services WHERE status = 'Активна' AND provider_service_id IS NOT NULL ORDER BY provider_name, provider_service_id, site_id ASC";

  const dockerCmd = `docker exec erp_system-postgres-1 psql -U smm_erp_user -d smm_erp -t -A -c "SELECT json_agg(row_to_json(t)) FROM (${sql}) t;"`;

  console.log('📦 Querying ERP database in Docker...');
  const jsonOutput = execSync(dockerCmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }).trim();

  if (!jsonOutput || jsonOutput === 'null') {
    console.error('❌ Failed to retrieve services from ERP database.');
    return;
  }

  const rawServices: RawErpService[] = JSON.parse(jsonOutput);
  console.log(`✅ Loaded ${rawServices.length} unique active services from ERP.`);

  const blueprint: NormalizedServiceBlueprint[] = [];
  const categoriesMap = new Map<string, { count: number; networkSlug: string; name: string }>();

  for (const s of rawServices) {
    const netConf = NETWORK_CONFIGS[s.category] || {
      slug: transliterate(s.category),
      name: s.category,
      sort: 99,
      placeholder: 'https://...'
    };

    // Extract clean Category name from activity (e.g. "Telegram - Реакции" -> "Реакции")
    let categoryName = s.activity || 'Общее';
    if (categoryName.includes(' - ')) {
      categoryName = categoryName.split(' - ').slice(1).join(' - ').trim();
    }

    const categorySlug = `${netConf.slug}-${transliterate(categoryName)}`;
    const activityType = resolveActivityType(categoryName);

    const catKey = `${netConf.slug}:${categoryName}`;
    if (!categoriesMap.has(catKey)) {
      categoriesMap.set(catKey, { count: 0, networkSlug: netConf.slug, name: categoryName });
    }
    categoriesMap.get(catKey)!.count++;

    const linkSpec = resolveLinkSpecification(netConf.slug, categoryName, s.name);
    const cleanName = cleanServiceName(netConf.name, categoryName, s.name);
    const qualityTier = determineQualityTier(cleanName);

    const retailPriceRub = Number(s.price);
    const retailPriceCents = Math.round(retailPriceRub * 100);

    blueprint.push({
      network: {
        slug: netConf.slug,
        name: netConf.name,
        sort: netConf.sort
      },
      category: {
        name: categoryName,
        slug: categorySlug,
        activityType
      },
      service: {
        name: cleanName,
        originalTariff: s.name,
        providerName: s.provider_name,
        providerServiceId: String(s.provider_service_id),
        retailPriceRub,
        retailPriceCents,
        targetType: linkSpec.targetType,
        customDataType: linkSpec.customDataType,
        linkPlaceholder: linkSpec.placeholder,
        linkHint: linkSpec.hint,
        qualityTier
      }
    });
  }

  const outDir = path.resolve(__dirname, 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'master-services-blueprint.json');
  fs.writeFileSync(outFile, JSON.stringify(blueprint, null, 2), 'utf-8');

  console.log(`\n🎉 MASTER BLUEPRINT GENERATED SUCCESSFULLY!`);
  console.log(`📁 File saved to: ${outFile}`);
  console.log(`📊 Total Services: ${blueprint.length}`);
  console.log(`🌐 Total Networks: ${Object.keys(NETWORK_CONFIGS).length}`);
  console.log(`📑 Total Categories: ${categoriesMap.size}`);

  // Summary per network
  const netCounts: Record<string, number> = {};
  for (const b of blueprint) {
    netCounts[b.network.name] = (netCounts[b.network.name] || 0) + 1;
  }
  console.log('\n📈 Services count per social network:');
  for (const [net, count] of Object.entries(netCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   - ${net}: ${count} services`);
  }
}

extractBlueprint().catch(console.error);
