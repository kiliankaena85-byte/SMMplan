import { IntelligencePlatform } from '@/services/analyzer/link-rules';

export interface ExtractedLink {
  id: string;
  url: string;
  platform: IntelligencePlatform;
  cleanTitle: string;
}

export function extractLinks(text: string): string[] {
  if (!text) return [];
  // Regex to extract URLs
  const regex = /https?:\/\/[^\s]+/g;
  const matches = text.match(regex);
  if (!matches) {
    // Also try to find links without http (e.g. t.me/durov)
    const lazyRegex = /(?:t\.me|vk\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|twitch\.tv|x\.com|twitter\.com|likee\.video)\/[^\s]+/g;
    const lazyMatches = text.match(lazyRegex) || [];
    return Array.from(new Set(lazyMatches.map(m => 'https://' + m)));
  }
  return Array.from(new Set(matches)); // Deduplicate
}

export function detectPlatformLite(url: string): IntelligencePlatform {
  const lower = url.toLowerCase();
  if (lower.includes('t.me') || lower.includes('telegram')) return IntelligencePlatform.TELEGRAM;
  if (lower.includes('vk.com') || lower.includes('vkontakte')) return IntelligencePlatform.VK;
  if (lower.includes('instagram.com')) return IntelligencePlatform.INSTAGRAM;
  if (lower.includes('tiktok.com')) return IntelligencePlatform.TIKTOK;
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return IntelligencePlatform.YOUTUBE;
  if (lower.includes('twitch.tv')) return IntelligencePlatform.TWITCH;
  if (lower.includes('twitter.com') || lower.includes('x.com')) return IntelligencePlatform.TWITTER;
  if (lower.includes('likee.video')) return IntelligencePlatform.LIKEE;
  return IntelligencePlatform.OTHER;
}

export function cleanUrlTitle(url: string): string {
  try {
    let clean = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (clean.length > 40) clean = clean.substring(0, 37) + '...';
    return clean;
  } catch (e) {
    return url;
  }
}
