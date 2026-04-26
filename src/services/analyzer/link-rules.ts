export enum IntelligencePlatform {
  YOUTUBE = 'YOUTUBE',
  INSTAGRAM = 'INSTAGRAM',
  TELEGRAM = 'TELEGRAM',
  TIKTOK = 'TIKTOK',
  VK = 'VK',
  TWITCH = 'TWITCH',
  TWITTER = 'TWITTER',
  WEBSITE = 'WEBSITE',
  LIKEE = 'LIKEE',
  OTHER = 'OTHER'
}

export interface LinkRule {
  platform: IntelligencePlatform;
  type: string;
  pattern: RegExp;
  suggestedCategories: string[];
  context?: string;
}

export const LINK_RULES: LinkRule[] = [
  // ===================== TELEGRAM =====================
  {
      platform: IntelligencePlatform.TELEGRAM,
      type: 'channel',
      pattern: /t\.me\/(?:joinchat\/|\+)?([\w_-]+)$|web\.telegram\.org\/(?:k|a)\/#@([\w_-]+)/,
      suggestedCategories: ['Подписчики', 'Premium', 'Бусты', 'Вступление', 'Сториз', 'Звезды', 'Автопросмотры', 'Автореакции', 'Авторепосты'],
      context: 'global_search_optimization'
  },
  {
      platform: IntelligencePlatform.TELEGRAM,
      type: 'post',
      pattern: /t\.me\/[\w_-]+\/(?:s\/)?(\d+)/,
      suggestedCategories: ['Просмотры', 'Реакции', 'Комментарии', 'Репосты', 'Звезды'],
      context: 'engagement'
  },
  {
      platform: IntelligencePlatform.TELEGRAM,
      type: 'bot',
      pattern: /t\.me\/(?:[\w_-]+bot|[\w_-]+_bot)/,
      suggestedCategories: ['Боты', 'Рефералы', 'Подписчики'],
      context: 'automation'
  },
  // ===================== YOUTUBE =====================
  {
      platform: IntelligencePlatform.YOUTUBE,
      type: 'video',
      pattern: /(?:v=|be\/|shorts\/|embed\/)([\w-]{6,12})/,
      suggestedCategories: ['Лайки', 'Просмотры', 'Комментарии', 'Репосты', 'Стримы'],
      context: 'high_retention_target'
  },
  {
      platform: IntelligencePlatform.YOUTUBE,
      type: 'channel',
      pattern: /youtube\.com\/(?:@|channel\/|user\/)([\w-.]+)/,
      suggestedCategories: ['Подписчики'],
      context: 'authority_growth'
  },
  // ===================== INSTAGRAM =====================
  {
      platform: IntelligencePlatform.INSTAGRAM,
      type: 'post',
      pattern: /instagram\.com\/(?:p|reel|tv)\/([\w-]+)/,
      suggestedCategories: ['Лайки', 'Просмотры', 'Комментарии', 'Репосты', 'Сохранения', 'Реакции'],
      context: 'viral_momentum'
  },
  {
      platform: IntelligencePlatform.INSTAGRAM,
      type: 'profile',
      pattern: /(?:instagram\.com|ig\.me)\/([\w._]+)/,
      suggestedCategories: ['Подписчики', 'Сториз', 'Стримы', 'Автолайки', 'Автопросмотры'],
      context: 'trust_building'
  },
  // ===================== TIKTOK =====================
  {
      platform: IntelligencePlatform.TIKTOK,
      type: 'short_link',
      pattern: /(?:vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com\/t)\/([\w-]+)/,
      suggestedCategories: ['Лайки', 'Просмотры', 'Комментарии', 'Репосты', 'Сохранения'],
      context: 'mobile_viral'
  },
  {
      platform: IntelligencePlatform.TIKTOK,
      type: 'video',
      pattern: /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
      suggestedCategories: ['Лайки', 'Просмотры', 'Комментарии', 'Репосты', 'Сохранения'],
      context: 'viral_reach'
  },
  {
      platform: IntelligencePlatform.TIKTOK,
      type: 'profile',
      pattern: /tiktok\.com\/(@[\w.]+)/,
      suggestedCategories: ['Подписчики', 'Автолайки'],
      context: 'influence'
  },
  {
      platform: IntelligencePlatform.TIKTOK,
      type: 'live',
      pattern: /tiktok\.com\/@[\w.]+\/live/,
      suggestedCategories: ['Стримы'],
      context: 'live_stream'
  },
  // ===================== VK =====================
  {
      platform: IntelligencePlatform.VK,
      type: 'post',
      pattern: /(?:vk\.(?:com|ru)|vkvideo\.ru)\/(?:wall|clip|video)(-?\d+_\d+)/,
      suggestedCategories: ['Лайки', 'Просмотры', 'Комментарии', 'Репосты', 'Реакции', 'Голосования'],
      context: 'social_reach'
  },
  {
      platform: IntelligencePlatform.VK,
      type: 'profile',
      pattern: /vk\.(?:com|ru)\/([\w._]+)/,
      suggestedCategories: ['Подписчики', 'Друзья', 'Просмотры'],
      context: 'networking'
  },
  // ===================== TWITCH =====================
  {
      platform: IntelligencePlatform.TWITCH,
      type: 'channel',
      pattern: /twitch\.tv\/([\w]+)/,
      suggestedCategories: ['Подписчики', 'Стримы', 'Боты', 'Вступление', 'Другое'],
      context: 'streaming_growth'
  },
  // ===================== TWITTER =====================
  {
      platform: IntelligencePlatform.TWITTER,
      type: 'profile',
      pattern: /(?:twitter\.com|x\.com)\/([\w]+)/,
      suggestedCategories: ['Подписчики', 'Автопросмотры'],
      context: 'social_presence'
  },
  // ===================== LIKEE =====================
  {
      platform: IntelligencePlatform.LIKEE,
      type: 'video',
      pattern: /l\.likee\.video\/v\/([\w-]+)|likee\.video\/@[\w.]+\/video\/(\d+)/,
      suggestedCategories: ['Лайки', 'Просмотры'],
      context: 'mobile_viral'
  },
  // ===================== FALLBACK WEBSITE =====================
  {
      platform: IntelligencePlatform.WEBSITE,
      type: 'seo_traffic',
      pattern: /[^:]+:[^ \n]+$/,
      suggestedCategories: ['Трафик'],
      context: 'seo_authority'
  },
  {
      platform: IntelligencePlatform.WEBSITE,
      type: 'direct_traffic',
      pattern: /^https?:\/\//,
      suggestedCategories: ['Статистика', 'Просмотры', 'Другое'],
      context: 'visibility'
  }
];
