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
  OK = 'OK',
  RUTUBE = 'RUTUBE',
  DZEN = 'DZEN',
  DISCORD = 'DISCORD',
  KICK = 'KICK',
  SPOTIFY = 'SPOTIFY',
  FACEBOOK = 'FACEBOOK',
  THREADS = 'THREADS',
  MAX = 'MAX',
  STEAM = 'STEAM',
  WIBES = 'WIBES',
  TROVO = 'TROVO',
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
      type: 'private_post',
      pattern: /(?:t\.me|telegram\.me|telegram\.dog)\/c\/(\d+)\/(\d+)\/?(?:\?.*)?$/i,
      suggestedCategories: [], // No standard services can process private channels without a bot
      context: 'private'
  },
  {
      platform: IntelligencePlatform.TELEGRAM,
      type: 'post',
      pattern: /(?:t\.me|telegram\.me|telegram\.dog)\/[\w-]+\/(?:s\/)?(\d+)\/?(?:\?.*)?$/i,
      suggestedCategories: [CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.REACTIONS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS, CATEGORY_LABELS.STARS],
      context: 'engagement'
  },
  {
      platform: IntelligencePlatform.TELEGRAM,
      type: 'bot',
      pattern: /(?:t\.me|telegram\.me|telegram\.dog)\/(?:[\w-]+bot|[\w-]+_bot)\/?(?:\?.*)?$/i,
      suggestedCategories: [CATEGORY_LABELS.BOTS, CATEGORY_LABELS.REFERRALS, CATEGORY_LABELS.SUBSCRIBERS],
      context: 'automation'
  },
  {
      platform: IntelligencePlatform.TELEGRAM,
      type: 'channel',
      pattern: /(?:t\.me|telegram\.me|telegram\.dog)\/(?:joinchat\/|\+)?(?:s\/)?@?([\w-]+)\/?(?:\?.*)?$|web\.telegram\.org\/(?:k|a)\/#@?([\w-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.PREMIUM, CATEGORY_LABELS.BOOSTS, CATEGORY_LABELS.GROUPS, CATEGORY_LABELS.STORIES, CATEGORY_LABELS.STARS, CATEGORY_LABELS.AUTO_VIEWS, CATEGORY_LABELS.AUTO_REACTIONS, CATEGORY_LABELS.AUTO_REPOSTS],
      context: 'global_search_optimization'
  },
  // ===================== YOUTUBE =====================
  {
      platform: IntelligencePlatform.YOUTUBE,
      type: 'video',
      pattern: /(?:v=|be\/|shorts\/|embed\/)([\w-]{6,12})(?:[^\w-]|$)/,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS, CATEGORY_LABELS.STREAMS],
      context: 'high_retention_target'
  },
  {
      platform: IntelligencePlatform.YOUTUBE,
      type: 'channel',
      pattern: /youtube\.com\/((?:@)[\w-.]+|channel\/[\w-.]+|user\/[\w-.]+)/,
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
      type: 'live',
      pattern: /tiktok\.com\/@[\w.]+\/live/,
      suggestedCategories: [CATEGORY_LABELS.STREAMS],
      context: 'live_stream'
  },
  {
      platform: IntelligencePlatform.TIKTOK,
      type: 'profile',
      pattern: /tiktok\.com\/(@[\w.]+)/,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.AUTO_LIKES],
      context: 'influence'
  },
  // ===================== VK =====================
  {
      platform: IntelligencePlatform.VK,
      type: 'comment',
      pattern: /(?:vk\.(?:com|ru)|vkvideo\.ru)\/(?:wall|video|photo|clip)(-?\d+_\d+)\?(?:[^#&]*&)*reply=(\d+)/i,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.REACTIONS],
      context: 'social_reach'
  },
  {
      platform: IntelligencePlatform.VK,
      type: 'post',
      pattern: /(?:vk\.(?:com|ru)|vkvideo\.ru)\/(?:wall|clip|video|photo)(-?\d+_\d+)/,
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
  // ===================== OK =====================
  {
      platform: IntelligencePlatform.OK,
      type: 'post',
      pattern: /ok\.ru\/(?:group|profile)\/\d+\/(?:topic|statuses)\/(\d+)/i,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS, CATEGORY_LABELS.REACTIONS],
      context: 'social_reach'
  },
  {
      platform: IntelligencePlatform.OK,
      type: 'group',
      pattern: /ok\.ru\/group\/(\d+)/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.VIEWS],
      context: 'community_authority'
  },
  {
      platform: IntelligencePlatform.OK,
      type: 'profile',
      pattern: /ok\.ru\/(?:profile\/(\d+)|([\w.-]+))/i,
      suggestedCategories: [CATEGORY_LABELS.FRIENDS, CATEGORY_LABELS.VIEWS],
      context: 'networking'
  },
  // ===================== RUTUBE =====================
  {
      platform: IntelligencePlatform.RUTUBE,
      type: 'video',
      pattern: /rutube\.ru\/video\/(?:private\/)?([\w-]{32})/i,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS],
      context: 'authority_growth'
  },
  {
      platform: IntelligencePlatform.RUTUBE,
      type: 'channel',
      pattern: /rutube\.ru\/(?:channel\/(\d+)|u\/([\w.-]+))/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS],
      context: 'viral_momentum'
  },
  // ===================== DZEN =====================
  {
      platform: IntelligencePlatform.DZEN,
      type: 'post',
      pattern: /dzen\.ru\/(?:a|b|video\/watch)\/([\w-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS],
      context: 'authority_growth'
  },
  {
      platform: IntelligencePlatform.DZEN,
      type: 'channel',
      pattern: /dzen\.ru\/(?:id\/([\w-]+)|([\w.-]+))/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.VIEWS],
      context: 'viral_momentum'
  },
  // ===================== DISCORD =====================
  {
      platform: IntelligencePlatform.DISCORD,
      type: 'invite',
      pattern: /(?:discord\.gg|discord\.com\/invite)\/([\w-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.GROUPS],
      context: 'automation'
  },
  // ===================== KICK =====================
  {
      platform: IntelligencePlatform.KICK,
      type: 'channel',
      pattern: /kick\.com\/([\w.-]+)$/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.STREAMS],
      context: 'live_stream'
  },
  // ===================== SPOTIFY =====================
  {
      platform: IntelligencePlatform.SPOTIFY,
      type: 'track',
      pattern: /open\.spotify\.com\/track\/([\w-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.PLAYS, CATEGORY_LABELS.SAVES],
      context: 'viral_reach'
  },
  {
      platform: IntelligencePlatform.SPOTIFY,
      type: 'playlist',
      pattern: /open\.spotify\.com\/(?:playlist|album)\/([\w-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.PLAYS],
      context: 'networking'
  },
  // ===================== FACEBOOK =====================
  {
      platform: IntelligencePlatform.FACEBOOK,
      type: 'post',
      pattern: /facebook\.com\/[^/]+\/(?:posts|videos|photos)\/([\w.-]+)|permalink\.php\?story_fbid=([\w.-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS, CATEGORY_LABELS.REACTIONS],
      context: 'social_reach'
  },
  {
      platform: IntelligencePlatform.FACEBOOK,
      type: 'profile',
      pattern: /facebook\.com\/([\w.-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.FRIENDS],
      context: 'networking'
  },
  // ===================== THREADS =====================
  {
      platform: IntelligencePlatform.THREADS,
      type: 'post',
      pattern: /threads\.net\/@[\w.-]+\/post\/([\w.-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS],
      context: 'viral_momentum'
  },
  {
      platform: IntelligencePlatform.THREADS,
      type: 'profile',
      pattern: /threads\.net\/@[\w.-]+/,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS],
      context: 'networking'
  },
  // ===================== MAX MESSENGER =====================
  {
      platform: IntelligencePlatform.MAX,
      type: 'channel',
      pattern: /(?:max\.ru)\/c\/(-?\d+(?:\/[\w-]+)?|[\w.-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.GROUPS],
      context: 'automation'
  },
  {
      platform: IntelligencePlatform.MAX,
      type: 'profile',
      pattern: /(?:max\.ru)\/([\w_.-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.BOTS],
      context: 'networking'
  },
  // ===================== STEAM =====================
  {
      platform: IntelligencePlatform.STEAM,
      type: 'post',
      pattern: /steamcommunity\.com\/sharedfiles\/filedetails\/\?id=(\d+)/i,
      suggestedCategories: [CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.LIKES],
      context: 'social_reach'
  },
  {
      platform: IntelligencePlatform.STEAM,
      type: 'profile',
      pattern: /steamcommunity\.com\/(?:id\/([\w.-]+)|profiles\/(\d+))/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.FRIENDS],
      context: 'networking'
  },
  // ===================== WIBES =====================
  {
      platform: IntelligencePlatform.WIBES,
      type: 'post',
      pattern: /wibes\.ru\/[\w.-]+\/([\w.-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.LIKES, CATEGORY_LABELS.VIEWS, CATEGORY_LABELS.COMMENTS, CATEGORY_LABELS.REPOSTS, CATEGORY_LABELS.SAVES],
      context: 'social_reach'
  },
  {
      platform: IntelligencePlatform.WIBES,
      type: 'profile',
      pattern: /wibes\.ru\/([\w.-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS],
      context: 'networking'
  },
  // ===================== TROVO =====================
  {
      platform: IntelligencePlatform.TROVO,
      type: 'live',
      pattern: /trovo\.live\/([\w.-]+)\/(\d+)/i,
      suggestedCategories: [CATEGORY_LABELS.STREAMS],
      context: 'live_stream'
  },
  {
      platform: IntelligencePlatform.TROVO,
      type: 'channel',
      pattern: /trovo\.live\/([\w.-]+)/i,
      suggestedCategories: [CATEGORY_LABELS.SUBSCRIBERS, CATEGORY_LABELS.STREAMS],
      context: 'streaming_growth'
  },
  // ===================== FALLBACK WEBSITE =====================
  {
      platform: IntelligencePlatform.WEBSITE,
      type: 'seo_traffic',
      pattern: /^https?:\/\/[^/\s]+\.[a-z]{2,}/i,
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
