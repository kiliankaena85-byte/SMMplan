/**
 * Infers the correct targetType from a category name.
 * Used as a safety net when `service.targetType` is missing or defaulted to 'POST'.
 *
 * IMPORTANT: This mapping MUST stay in sync with SmartAnalyzerLogic.detectSync()
 * in src/services/providers/smart-analyzer.logic.ts (lines 384-427).
 */

const CHANNEL_KEYWORDS = [
  'подписчик', 'участник', 'subscriber', 'follower',
  'буст', 'boost',
  'груп', 'group',
  'друз', 'friend',
  'premium', 'премиум участ',
  'автопросмотр', 'автолайк', 'автореакци', 'авторепост', 'автокоммент',
  'массовые просмотры', 'просмотры массовых', 'auto', 'future view',
];

const STORY_KEYWORDS = [
  'стори', 'story', 'stories', 'истори',
];

const CUSTOM_KEYWORDS = [
  'звёзд', 'звезд', 'star',
];

/**
 * Determines targetType based on category name keywords.
 * Falls back to 'POST' only for engagement metrics (likes, views, comments, etc.).
 */
export function inferTargetTypeFromCategory(categoryName: string | null | undefined): string {
  if (!categoryName) return 'POST';

  const lower = categoryName.toLowerCase();

  if (CHANNEL_KEYWORDS.some(k => lower.includes(k))) return 'CHANNEL';
  if (STORY_KEYWORDS.some(k => lower.includes(k))) return 'STORY';
  if (CUSTOM_KEYWORDS.some(k => lower.includes(k))) return 'CUSTOM';

  // Engagement categories: likes, views, comments, reactions, reposts → POST
  return 'POST';
}
