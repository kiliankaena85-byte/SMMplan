import { CATEGORY_LABELS } from '../providers/smart-analyzer.logic';

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
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.PREMIUM, CATEGORY_LABELS.BOOSTS, CATEGORY_LABELS.GROUPS, CATEGORY_LABELS.STORIES, CATEGORY_LABELS.STARS, CATEGORY_LABELS.AUTO_VIEWS, CATEGORY_LABELS.AUTO_REACTIONS, CATEGORY_LABELS.AUTO_REPOSTS],
      context: 'global_search_optimization'
  },
  {
      platform: IntelligencePlatform.TELEGRAM,
      type: 'post',
      pattern: /t\.me\/[\w_-]+\/(?:s\/)?(\d+)/,
      suggestedCategories: [CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.REACTIONS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS, CATEGORY_LABELS.STARS],
      context: 'engagement'
  },
  {
      platform: IntelligencePlatform.TELEGRAM,
      type: 'bot',
      pattern: /t\.me\/(?:[\w_-]+bot|[\w_-]+_bot)/,
      suggestedCategories: [CATEGORY_LABELS.BOTS, CATEGORY_LABELS.REFERRALS, CATEGORY_LABELS.SUBSCRIBERS],
      context: 'automation'
  },
  // ===================== YOUTUBE =====================
  {
      platform: IntelligencePlatform.YOUTUBE,
      type: 'video',
      pattern: /(?:v=|be\/|shorts\/|embed\/)([\w-]{6,12})/,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS, CATEGORY_LABELS.STREAMS],
      context: 'high_retention_target'
  },
  {
      platform: IntelligencePlatform.YOUTUBE,
      type: 'channel',
      pattern: /youtube\.com\/(?:@|channel\/|user\/)([\w-.]+)/,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS],
      context: 'authority_growth'
  },
  // ===================== INSTAGRAM =====================
  {
      platform: IntelligencePlatform.INSTAGRAM,
      type: 'post',
      pattern: /instagram\.com\/(?:p|reel|tv)\/([\w-]+)/,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS, CATEGORY_LABELS.SAVES, CATEGORY_LABELS.REACTIONS],
      context: 'viral_momentum'
  },
  {
      platform: IntelligencePlatform.INSTAGRAM,
      type: 'profile',
      pattern: /(?:instagram\.com|ig\.me)\/([\w._]+)/,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.STORIES, CATEGORY_LABELS.STREAMS, CATEGORY_LABELS.AUTO_LIKES, CATEGORY_LABELS.AUTO_VIEWS],
      context: 'trust_building'
  },
  // ===================== TIKTOK =====================
  {
      platform: IntelligencePlatform.TIKTOK,
      type: 'short_link',
      pattern: /(?:vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com\/t)\/([\w-]+)/,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS, CATEGORY_LABELS.SAVES],
      context: 'mobile_viral'
  },
  {
      platform: IntelligencePlatform.TIKTOK,
      type: 'video',
      pattern: /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS, CATEGORY_LABELS.SAVES],
      context: 'viral_reach'
  },
  {
      platform: IntelligencePlatform.TIKTOK,
      type: 'profile',
      pattern: /tiktok\.com\/(@[\w.]+)/,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.AUTO_LIKES],
      context: 'influence'
  },
  {
      platform: IntelligencePlatform.TIKTOK,
      type: 'live',
      pattern: /tiktok\.com\/@[\w.]+\/live/,
      suggestedCategories: [CATEGORY_LABELS.STREAMS],
      context: 'live_stream'
  },
  // ===================== VK =====================
  {
      platform: IntelligencePlatform.VK,
      type: 'post',
      pattern: /(?:vk\.(?:com|ru)|vkvideo\.ru)\/(?:wall|clip|video)(-?\d+_\d+)/,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS, CATEGORY_LABELS.REACTIONS, CATEGORY_LABELS.POLLS],
      context: 'social_reach'
  },
  {
      platform: IntelligencePlatform.VK,
      type: 'profile',
      pattern: /vk\.(?:com|ru)\/([\w._]+)/,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.FRIENDS, CATEGORY_LABELS.VIEWS],
      context: 'networking'
  },
  // ===================== TWITCH =====================
  {
      platform: IntelligencePlatform.TWITCH,
      type: 'channel',
      pattern: /twitch\.tv\/([\w]+)/,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.STREAMS, CATEGORY_LABELS.BOTS, CATEGORY_LABELS.GROUPS, CATEGORY_LABELS.OTHER],
      context: 'streaming_growth'
  },
  // ===================== TWITTER =====================
  {
      platform: IntelligencePlatform.TWITTER,
      type: 'post',
      pattern: /(?:twitter\.com|x\.com)\/([\w]+)\/status\/(\d+)/,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.REPOSTS, CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.BOOKMARKS],
      context: 'social_reach'
  },
  {
      platform: IntelligencePlatform.TWITTER,
      type: 'profile',
      pattern: /(?:twitter\.com|x\.com)\/([\w]+)/,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.AUTO_VIEWS],
      context: 'social_presence'
  },
  // ===================== LIKEE =====================
  {
      platform: IntelligencePlatform.LIKEE,
      type: 'video',
      pattern: /l\.likee\.video\/v\/([\w-]+)|likee\.video\/@[\w.]+\/video\/(\d+)/,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.VIEWS],
      context: 'mobile_viral'
  },
  // ===================== FALLBACK WEBSITE =====================
  {
      platform: IntelligencePlatform.WEBSITE,
      type: 'seo_traffic',
      pattern: /^https?:\/\/[^\/\s]+\.[a-z]{2,}/i,
      suggestedCategories: [CATEGORY_LABELS.TRAFFIC],
      context: 'seo_authority'
  },
  {
      platform: IntelligencePlatform.WEBSITE,
      type: 'direct_traffic',
      pattern: /^https?:\/\//,
      suggestedCategories: [CATEGORY_LABELS.OTHER, CATEGORY_LABELS.VIEWS],
      context: 'visibility'
  }
];
