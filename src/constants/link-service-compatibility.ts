/**
 * Centralized Link-Service Compatibility Layer
 * Enforces strict domain rules between detected URL link types and service target types.
 */

export enum LinkType {
  CHANNEL = 'CHANNEL',
  PROFILE = 'PROFILE',
  POST = 'POST',
  VIDEO = 'VIDEO',
  STORY = 'STORY',
  POLL = 'POLL',
  BOT = 'BOT',
  CUSTOM = 'CUSTOM',
}

export enum ServiceTargetType {
  CHANNEL = 'CHANNEL',
  PROFILE = 'PROFILE',
  POST_INTERACTION = 'POST_INTERACTION',
  VIDEO_INTERACTION = 'VIDEO_INTERACTION',
  STORY_INTERACTION = 'STORY_INTERACTION',
  CHANNEL_POSTS = 'CHANNEL_POSTS',
  POLL_VOTES = 'POLL_VOTES',
  BOT_STARTS = 'BOT_STARTS',
  COMMENTS = 'COMMENTS',
  CUSTOM = 'CUSTOM',
}

/**
 * Normalizes any detected URL link type string into canonical LinkType enum.
 */
export function normalizeLinkType(rawType: string | null | undefined): LinkType {
  if (!rawType) return LinkType.CUSTOM;
  const clean = rawType.trim().toUpperCase();

  switch (clean) {
    case 'CHANNEL':
    case 'GROUP':
    case 'CHAT':
      return LinkType.CHANNEL;

    case 'PROFILE':
    case 'USER':
    case 'ACCOUNT':
    case 'ARTIST':
      return LinkType.PROFILE;

    case 'POST':
    case 'PRIVATE_POST':
    case 'PHOTO':
    case 'WALL':
    case 'TWEET':
    case 'STATUS':
    case 'TRACK':
      return LinkType.POST;

    case 'VIDEO':
    case 'SHORT_VIDEO':
    case 'SHORT_LINK':
    case 'CLIP':
    case 'REEL':
    case 'SHORTS':
    case 'VK_VIDEO':
    case 'VK_CLIP':
    case 'VK_PLAY':
    case 'PHOTO_MODE':
      return LinkType.VIDEO;

    case 'STORY':
    case 'STORIES':
    case 'HIGHLIGHT':
    case 'HIGHLIGHTS':
      return LinkType.STORY;

    case 'POLL':
    case 'VOTE':
      return LinkType.POLL;

    case 'BOT':
      return LinkType.BOT;

    case 'GENERIC_LINK':
    case 'OTHER':
    case 'UNKNOWN':
      return LinkType.CUSTOM;

    default:
      return LinkType.CUSTOM;
  }
}

/**
 * Normalizes service target type strings (including legacy strings) into ServiceTargetType enum.
 */
export function normalizeServiceTargetType(rawType: string | null | undefined): ServiceTargetType {
  if (!rawType) return ServiceTargetType.CUSTOM;
  const clean = rawType.trim().toUpperCase();

  switch (clean) {
    case 'CHANNEL':
    case 'GROUP':
    case 'PUBLIC':
    case 'COMMUNITY':
    case 'COMMUNITIES':
    case 'SUBSCRIBERS':
    case 'MEMBERS':
    case 'BOOST':
      return ServiceTargetType.CHANNEL;

    case 'PROFILE':
    case 'FOLLOWERS':
    case 'FRIENDS':
      return ServiceTargetType.PROFILE;

    case 'POST_INTERACTION':
    case 'POST':
    case 'LIKES':
    case 'REACTIONS':
    case 'VIEWS':
    case 'REPOSTS':
    case 'SHARES':
      return ServiceTargetType.POST_INTERACTION;

    case 'VIDEO_INTERACTION':
    case 'VIDEO':
    case 'WATCH_TIME':
    case 'LIVESTREAM':
      return ServiceTargetType.VIDEO_INTERACTION;

    case 'STORY_INTERACTION':
    case 'STORY':
    case 'STORIES':
      return ServiceTargetType.STORY_INTERACTION;

    case 'CHANNEL_POSTS':
    case 'AUTO_POSTS':
    case 'AUTO_VIEWS':
    case 'AUTO_LIKES':
    case 'AUTO':
      return ServiceTargetType.CHANNEL_POSTS;

    case 'POLL_VOTES':
    case 'POLL':
    case 'VOTES':
      return ServiceTargetType.POLL_VOTES;

    case 'BOT_STARTS':
    case 'BOT':
    case 'REFERRAL':
      return ServiceTargetType.BOT_STARTS;

    case 'COMMENTS':
    case 'COMMENT':
    case 'REVIEWS':
      return ServiceTargetType.COMMENTS;

    default:
      return ServiceTargetType.CUSTOM;
  }
}

/**
 * Compatibility Truth Table mapping LinkType -> Set of permitted ServiceTargetTypes.
 */
const COMPATIBILITY_MAP: Record<LinkType, Set<ServiceTargetType>> = {
  [LinkType.CHANNEL]: new Set([
    ServiceTargetType.CHANNEL,
    ServiceTargetType.CHANNEL_POSTS,
    ServiceTargetType.PROFILE, // Permitted in platforms where channel and profile share namespace
    ServiceTargetType.CUSTOM,
  ]),
  [LinkType.PROFILE]: new Set([
    ServiceTargetType.PROFILE,
    ServiceTargetType.CHANNEL, // Permitted in Instagram/TikTok (account followers)
    ServiceTargetType.CHANNEL_POSTS, // Permitted for automated post monitoring subscriptions on profile
    ServiceTargetType.CUSTOM,
  ]),
  [LinkType.POST]: new Set([
    ServiceTargetType.POST_INTERACTION,
    ServiceTargetType.VIDEO_INTERACTION,
    ServiceTargetType.COMMENTS,
    ServiceTargetType.POLL_VOTES,
    ServiceTargetType.CUSTOM,
  ]),
  [LinkType.VIDEO]: new Set([
    ServiceTargetType.VIDEO_INTERACTION,
    ServiceTargetType.POST_INTERACTION,
    ServiceTargetType.COMMENTS,
    ServiceTargetType.CUSTOM,
  ]),
  [LinkType.STORY]: new Set([
    ServiceTargetType.STORY_INTERACTION,
    ServiceTargetType.CUSTOM,
  ]),
  [LinkType.POLL]: new Set([
    ServiceTargetType.POLL_VOTES,
    ServiceTargetType.POST_INTERACTION,
    ServiceTargetType.CUSTOM,
  ]),
  [LinkType.BOT]: new Set([
    ServiceTargetType.BOT_STARTS,
    ServiceTargetType.CHANNEL,
    ServiceTargetType.CUSTOM,
  ]),
  [LinkType.CUSTOM]: new Set([
    ServiceTargetType.CUSTOM,
    ServiceTargetType.CHANNEL,
    ServiceTargetType.PROFILE,
    ServiceTargetType.POST_INTERACTION,
    ServiceTargetType.VIDEO_INTERACTION,
    ServiceTargetType.STORY_INTERACTION,
    ServiceTargetType.CHANNEL_POSTS,
    ServiceTargetType.POLL_VOTES,
    ServiceTargetType.BOT_STARTS,
    ServiceTargetType.COMMENTS,
  ]),
};

/**
 * Checks whether a detected URL link type is compatible with a service target type.
 */
export function isLinkServiceCompatible(
  rawLinkType: LinkType | string | null | undefined,
  rawTargetType: ServiceTargetType | string | null | undefined
): boolean {
  if (!rawLinkType || !rawTargetType) return true;

  const link = normalizeLinkType(rawLinkType);
  const target = normalizeServiceTargetType(rawTargetType);

  // CUSTOM is a universal non-blocking fallback
  if (link === LinkType.CUSTOM || target === ServiceTargetType.CUSTOM) {
    return true;
  }

  const allowedTargets = COMPATIBILITY_MAP[link];
  if (!allowedTargets) return true;

  return allowedTargets.has(target);
}

/**
 * Human-readable, educational error messages for incompatible combinations.
 */
export function getCompatibilityError(
  rawLinkType: LinkType | string | null | undefined,
  rawTargetType: ServiceTargetType | string | null | undefined,
  serviceName?: string
): string {
  const link = normalizeLinkType(rawLinkType);
  const target = normalizeServiceTargetType(rawTargetType);

  const prefix = serviceName ? `Услуга «${serviceName}»` : 'Выбранная услуга';

  if (link === LinkType.PROFILE && target === ServiceTargetType.POST_INTERACTION) {
    return `${prefix} предназначена для публикаций (лайки/просмотры/реакции). Для ее выполнения укажите прямую ссылку на конкретный пост или фото, а не на страницу профиля.`;
  }

  if (link === LinkType.CHANNEL && target === ServiceTargetType.POST_INTERACTION) {
    return `${prefix} применяется к конкретным записям. Укажите ссылку на отдельный пост в канале (например, https://t.me/channel/123), а не на канал целиком.`;
  }

  if (link === LinkType.POST && target === ServiceTargetType.CHANNEL) {
    return `${prefix} предназначена для привлечения подписчиков в канал/группу. Пожалуйста, укажите ссылку на сам канал (например, https://t.me/channel), а не на отдельную публикацию.`;
  }

  if (link === LinkType.POST && target === ServiceTargetType.PROFILE) {
    return `${prefix} предназначена для подписчиков на аккаунт/профиль. Укажите ссылку на страницу профиля, а не на отдельный пост.`;
  }

  if (link === LinkType.POST && target === ServiceTargetType.CHANNEL_POSTS) {
    return `${prefix} — это пакет авто-активностей на будущие публикации канала. Для ее запуска требуется ссылка на канал целиком, а не на разовый пост.`;
  }

  if (link === LinkType.STORY && target !== ServiceTargetType.STORY_INTERACTION) {
    return `${prefix} не совместима со ссылками на Истории (Stories). Для историй доступны только просмотры и реакции на сториз.`;
  }

  if (link !== LinkType.STORY && target === ServiceTargetType.STORY_INTERACTION) {
    return `${prefix} работает исключительно со ссылками на Истории (Stories). Укажите прямую ссылку на активную историю.`;
  }

  return `${prefix} (тип цели: ${target}) несовместима с указанным типом ссылки (${link}). Пожалуйста, проверьте формат ссылки.`;
}
