import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';

export interface ShadowServiceSearchResult {
  id: string;
  providerId: string;
  providerName: string;
  externalId: string;
  name: string;
  cleanName: string | null;
  category: string | null;
  normalizedCategory: string | null;
  rate: number;
  rateRub: number;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  dripfeed: boolean;
  targetType: string;
  customDataType: string;
  isMediaGroupAware: boolean;
  warranty: number;
  anomalyScore: number;
}

export interface LinkSpecification {
  targetType: string;
  placeholder: string;
  hint: string;
  regex?: string;
  requiresBotAdmin: boolean;
  isMediaGroupAware: boolean;
  customDataType: string;
  customDataLabel?: string;
}

/**
 * Returns link validation and placeholder rules based on targetType and networkSlug
 */
export function getLinkSpecification(
  targetType: string,
  networkSlug: string = 'telegram',
  activityType: string = 'OTHER'
): LinkSpecification {
  const net = networkSlug.toLowerCase();
  const target = targetType.toUpperCase();
  const act = activityType.toUpperCase();

  // 1. Telegram Rules
  if (net.includes('telegram') || net === 'tg') {
    if (target === 'CHANNEL' || act === 'FOLLOWERS' || act === 'MEMBERS') {
      return {
        targetType: 'CHANNEL',
        placeholder: 'https://t.me/channel_username или https://t.me/+joinchat_hash',
        hint: 'Ссылка на публичный или закрытый Telegram канал/группу',
        regex: '^https?:\\/\\/t\\.me\\/([a-zA-Z0-9_+]+|joinchat\\/[a-zA-Z0-9_-]+)',
        requiresBotAdmin: false,
        isMediaGroupAware: false,
        customDataType: 'NONE',
      };
    }
    if (target === 'POST' || act === 'VIEWS' || act === 'REACTIONS') {
      return {
        targetType: 'POST',
        placeholder: 'https://t.me/channel_name/1234',
        hint: 'Прямая ссылка на пост или альбом в Telegram',
        regex: '^https?:\\/\\/t\\.me\\/[a-zA-Z0-9_]+\\/[0-9]+',
        requiresBotAdmin: false,
        isMediaGroupAware: true,
        customDataType: 'NONE',
      };
    }
    if (act === 'POLL' || act === 'VOTES' || target === 'POLL') {
      return {
        targetType: 'POLL',
        placeholder: 'https://t.me/channel_name/1234',
        hint: 'Ссылка на пост с опросом в Telegram (укажите номер варианта)',
        regex: '^https?:\\/\\/t\\.me\\/[a-zA-Z0-9_]+\\/[0-9]+',
        requiresBotAdmin: false,
        isMediaGroupAware: false,
        customDataType: 'NUMBER',
        customDataLabel: 'Номер варианта ответа (например: 1 или 2)',
      };
    }
    if (act === 'COMMENTS' || target === 'COMMENT') {
      return {
        targetType: 'COMMENT',
        placeholder: 'https://t.me/channel_name/1234',
        hint: 'Ссылка на пост в Telegram для публикации комментариев',
        regex: '^https?:\\/\\/t\\.me\\/[a-zA-Z0-9_]+\\/[0-9]+',
        requiresBotAdmin: false,
        isMediaGroupAware: false,
        customDataType: 'TEXTAREA',
        customDataLabel: 'Текст комментариев (каждый с новой строки)',
      };
    }
  }

  // 2. VK Rules
  if (net.includes('vk') || net === 'vkontakte') {
    if (target === 'PROFILE' || target === 'CHANNEL' || act === 'FOLLOWERS') {
      return {
        targetType: 'PROFILE',
        placeholder: 'https://vk.com/username или https://vk.com/public12345',
        hint: 'Ссылка на страницу, группу или паблик ВКонтакте',
        regex: '^https?:\\/\\/vk\\.com\\/[a-zA-Z0-9_.]+',
        requiresBotAdmin: false,
        isMediaGroupAware: false,
        customDataType: 'NONE',
      };
    }
    return {
      targetType: 'POST',
      placeholder: 'https://vk.com/wall-12345_67890',
      hint: 'Ссылка на конкретную запись на стене ВКонтакте',
      regex: '^https?:\\/\\/vk\\.com\\/wall-?[0-9]+_[0-9]+',
      requiresBotAdmin: false,
      isMediaGroupAware: false,
      customDataType: 'NONE',
    };
  }

  // 3. YouTube Rules
  if (net.includes('youtube') || net === 'yt') {
    if (target === 'CHANNEL' || act === 'FOLLOWERS' || act === 'SUBSCRIBERS') {
      return {
        targetType: 'CHANNEL',
        placeholder: 'https://youtube.com/@channel_name',
        hint: 'Ссылка на YouTube-канал',
        regex: '^https?:\\/\\/(www\\.)?youtube\\.com\\/(@[a-zA-Z0-9_.-]+|channel\\/[a-zA-Z0-9_-]+)',
        requiresBotAdmin: false,
        isMediaGroupAware: false,
        customDataType: 'NONE',
      };
    }
    return {
      targetType: 'VIDEO',
      placeholder: 'https://youtube.com/watch?v=dQw4w9WgXcQ или https://youtu.be/dQw4w9WgXcQ',
      hint: 'Ссылка на видео, Shorts или трансляцию YouTube',
      regex: '^https?:\\/\\/(www\\.)?(youtube\\.com\\/watch\\?v=|youtu\\.be\\/|youtube\\.com\\/shorts\\/)[a-zA-Z0-9_-]+',
      requiresBotAdmin: false,
      isMediaGroupAware: false,
      customDataType: 'NONE',
    };
  }

  // 4. Instagram Rules
  if (net.includes('instagram') || net === 'inst') {
    if (target === 'PROFILE' || act === 'FOLLOWERS') {
      return {
        targetType: 'PROFILE',
        placeholder: 'https://instagram.com/username',
        hint: 'Ссылка на профиль Instagram (аккаунт должен быть открыт)',
        regex: '^https?:\\/\\/(www\\.)?instagram\\.com\\/[a-zA-Z0-9_.]+',
        requiresBotAdmin: false,
        isMediaGroupAware: false,
        customDataType: 'NONE',
      };
    }
    return {
      targetType: 'POST',
      placeholder: 'https://instagram.com/p/CODE/ или https://instagram.com/reel/CODE/',
      hint: 'Ссылка на пост, Reels или публикацию в Instagram',
      regex: '^https?:\\/\\/(www\\.)?instagram\\.com\\/(p|reel|tv)\\/[a-zA-Z0-9_-]+',
      requiresBotAdmin: false,
      isMediaGroupAware: false,
      customDataType: 'NONE',
    };
  }

  // Default Fallback
  return {
    targetType: target || 'POST',
    placeholder: 'https://...',
    hint: 'Вставьте прямую публичную ссылку на объект продвижения',
    requiresBotAdmin: false,
    isMediaGroupAware: false,
    customDataType: 'NONE',
  };
}

/**
 * Searches cached ShadowServices across all providers with smart filtering
 */
export async function searchShadowServices(params: {
  query?: string;
  providerId?: string;
  platform?: string;
  targetType?: string;
  limit?: number;
}): Promise<ShadowServiceSearchResult[]> {
  const { query, providerId, platform, targetType, limit = 25 } = params;

    const where: Prisma.ShadowServiceWhereInput = {};

  if (providerId) {
    where.providerId = providerId;
  }

  if (platform) {
    where.platform = { contains: platform, mode: 'insensitive' };
  }

  if (targetType) {
    where.targetType = targetType;
  }

  if (query && query.trim()) {
    const term = query.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { cleanName: { contains: term, mode: 'insensitive' } },
      { category: { contains: term, mode: 'insensitive' } },
      { externalId: { equals: term } },
    ];
  }

  const items = await db.shadowService.findMany({
    where,
    include: {
      provider: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { anomalyScore: 'asc' },
      { rateRub: 'asc' },
    ],
    take: limit,
  });

  return items.map((s: (typeof items)[number]) => ({
    id: s.id,
    providerId: s.providerId,
    providerName: s.provider.name,
    externalId: s.externalId,
    name: s.name,
    cleanName: s.cleanName,
    category: s.category,
    normalizedCategory: s.normalizedCategory,
    rate: s.rate,
    rateRub: s.rateRub,
    min: s.min,
    max: s.max,
    refill: s.refill,
    cancel: s.cancel,
    dripfeed: s.dripfeed,
    targetType: s.targetType || 'POST',
    customDataType: s.customDataType || 'NONE',
    isMediaGroupAware: s.isMediaGroupAware || false,
    warranty: s.warranty || 0,
    anomalyScore: s.anomalyScore || 0,
  }));
}
