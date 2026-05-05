import { IntelligencePlatform } from "@/services/analyzer/link-rules";

export function detectPlatformFromUrl(url: string): IntelligencePlatform | null {
  if (!url) return null;
  
  const cleanUrl = url.trim().toLowerCase();
  
  if (cleanUrl.includes('t.me') || cleanUrl.includes('telegram.me')) {
    return 'telegram' as IntelligencePlatform;
  }
  
  if (cleanUrl.includes('vk.com') || cleanUrl.includes('vk.ru')) {
    return 'vk' as IntelligencePlatform;
  }
  
  if (cleanUrl.includes('instagram.com')) {
    return 'instagram' as IntelligencePlatform;
  }
  
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    return 'youtube' as IntelligencePlatform;
  }
  
  if (cleanUrl.includes('tiktok.com')) {
    return 'tiktok' as IntelligencePlatform;
  }
  
  if (cleanUrl.includes('twitch.tv')) {
    return 'twitch' as IntelligencePlatform;
  }
  
  if (cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.watch')) {
    return 'facebook' as IntelligencePlatform;
  }
  
  if (cleanUrl.includes('twitter.com') || cleanUrl.includes('x.com')) {
    return 'twitter' as IntelligencePlatform;
  }

  // Not strictly an exhaustive list of all 30 platforms, but handles the most common 
  // ones where auto-detect is critical. 
  
  return null;
}
