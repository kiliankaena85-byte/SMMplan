/**
 * Target Type Mapper & Compatibility Engine
 * Bridges the gap between IntelligenceLinkAnalyzer (lowercase URL types)
 * and ServiceTargetType / SmartAnalyzerLogic (uppercase DB types).
 */

export type ServiceTargetType =
  | 'CHANNEL'
  | 'POST'
  | 'PROFILE'
  | 'VIDEO'
  | 'STORY'
  | 'POLL'
  | 'COMMENTS'
  | 'CHANNEL_POSTS'
  | 'BOT'
  | 'CUSTOM';

/**
 * Normalizes any detected link type string into canonical uppercase ServiceTargetType.
 * Handles casing ('channel' -> 'CHANNEL', 'post' -> 'POST', 'video' -> 'VIDEO').
 */
export function normalizeTargetType(rawType: string | null | undefined): ServiceTargetType {
  if (!rawType) return 'CUSTOM';
  const clean = rawType.trim().toUpperCase();

  switch (clean) {
    case 'CHANNEL':
    case 'GROUP':
    case 'CHAT':
      return 'CHANNEL';

    case 'POST':
    case 'PRIVATE_POST':
    case 'PHOTO':
    case 'WALL':
    case 'TWEET':
    case 'STATUS':
      return 'POST';

    case 'PROFILE':
    case 'USER':
    case 'ACCOUNT':
      return 'PROFILE';

    case 'VIDEO':
    case 'SHORT_VIDEO':
    case 'SHORT_LINK':
    case 'CLIP':
    case 'REEL':
    case 'SHORTS':
    case 'VK_VIDEO':
    case 'VK_CLIP':
    case 'VK_PLAY':
      return 'VIDEO';

    case 'STORY':
    case 'STORIES':
      return 'STORY';

    case 'POLL':
    case 'VOTE':
      return 'POLL';

    case 'COMMENT':
    case 'COMMENTS':
      return 'COMMENTS';

    case 'BOT':
      return 'BOT';

    case 'CHANNEL_POSTS':
    case 'AUTO_POSTS':
    case 'AUTO':
      return 'CHANNEL_POSTS';

    default:
      return 'CUSTOM';
  }
}

/**
 * Checks whether a detected URL link target type is compatible with a Service target type.
 *
 * Compatibility Matrix:
 * - CHANNEL URL -> compatible with CHANNEL (subscribers) and CHANNEL_POSTS (auto-views on future posts) and PROFILE.
 * - POST URL -> compatible ONLY with POST, VIDEO, COMMENTS. NEVER with CHANNEL or CHANNEL_POSTS.
 * - PROFILE URL -> compatible with PROFILE, CHANNEL (followers), but NOT with POST.
 * - VIDEO URL -> compatible with VIDEO, POST.
 * - STORY URL -> compatible with STORY.
 * - POLL URL -> compatible with POLL, POST.
 * - Fallback: If either is 'CUSTOM' or missing, returns true.
 */
export function isTargetTypeCompatible(
  detectedLinkType: string | null | undefined,
  serviceTargetType: string | null | undefined
): boolean {
  if (!detectedLinkType || !serviceTargetType) return true;

  const detected = normalizeTargetType(detectedLinkType);
  const service = normalizeTargetType(serviceTargetType);

  // Wildcard / Custom is always compatible
  if (detected === 'CUSTOM' || service === 'CUSTOM') return true;

  // Exact match is always compatible
  if (detected === service) return true;

  switch (detected) {
    case 'CHANNEL':
      // A channel URL can receive subscribers (CHANNEL) or auto-monitoring on future posts (CHANNEL_POSTS) or profile followers
      return service === 'CHANNEL' || service === 'CHANNEL_POSTS' || service === 'PROFILE';

    case 'POST':
      // A post URL can ONLY receive post engagement (likes, views, comments, reposts).
      // It CANNOT receive channel subscribers or channel-wide auto-monitoring.
      return service === 'POST' || service === 'VIDEO' || service === 'COMMENTS';

    case 'PROFILE':
      // A profile URL can receive followers (PROFILE or CHANNEL), but NOT individual post likes.
      return service === 'PROFILE' || service === 'CHANNEL';

    case 'VIDEO':
      // A video URL can receive video metrics or standard post metrics (likes, comments).
      return service === 'VIDEO' || service === 'POST';

    case 'STORY':
      return service === 'STORY';

    case 'POLL':
      return service === 'POLL' || service === 'POST';

    case 'BOT':
      return service === 'BOT' || service === 'CHANNEL';

    case 'CHANNEL_POSTS':
      return service === 'CHANNEL_POSTS' || service === 'CHANNEL';

    default:
      return true;
  }
}
