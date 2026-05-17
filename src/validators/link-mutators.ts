import { z } from 'zod';

/**
 * (c) 2026 Smmplan.
 * Link Mutators and Validators based on the LINK_TYPE_VALIDATION_MATRIX.
 * Ensures strict filtering, cleaning, and Soft Refusal validation.
 */

// --- 🧹 MUTATORS (Cleaners) ---

export const cleanInstagramUrl = (url: string, targetType: string): string => {
  try {
    const urlObj = new URL(url);
    urlObj.search = ''; // Strip ?igshid=... and everything else
    let cleaned = urlObj.toString();
    
    // For stories, users often paste /stories/username/123123
    // But providers require the profile URL for story views.
    if (targetType === 'STORY') {
      const match = cleaned.match(/\/stories\/([^\/]+)/);
      if (match) {
        return `https://www.instagram.com/${match[1]}/`;
      }
    }
    return cleaned;
  } catch {
    return url;
  }
};

export const cleanVkUrl = (url: string): string => {
  let cleaned = url.replace(/m\.vk\.com/, 'vk.com');
  // Extract photo ID from z=photo... if it's nested in a wall post
  const photoMatch = cleaned.match(/z=(photo-?\d+_\d+)/);
  if (photoMatch) {
    cleaned = `https://vk.com/${photoMatch[1]}`;
  }
  // Remove trailing query params for standard objects
  try {
      const urlObj = new URL(cleaned);
      if (urlObj.searchParams.has('reply')) {
          // Keep reply for comments
          return urlObj.toString();
      }
      urlObj.search = ''; 
      return urlObj.toString();
  } catch {
      return cleaned;
  }
};

export const cleanTelegramUrl = (url: string): string => {
  let cleaned = url.replace(/telegram\.me/, 't.me');
  try {
    const urlObj = new URL(cleaned);
    // Remove ?single
    if (urlObj.searchParams.has('single')) urlObj.searchParams.delete('single');
    return urlObj.toString();
  } catch {
    return cleaned;
  }
};

export const cleanYoutubeUrl = (url: string): string => {
  if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
  }
  if (url.includes('/shorts/')) {
      const id = url.split('/shorts/')[1]?.split('?')[0];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
  }
  // Strip &t= and other unnecessary params if we just need the video
  try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
          const v = urlObj.searchParams.get('v');
          if (v) return `https://www.youtube.com/watch?v=${v}`;
      }
  } catch {}
  return url;
};

export const cleanTikTokUrl = (url: string): string => {
    // For TikTok, mobile share links (vm.tiktok.com) have tracking query params too.
    try {
        const urlObj = new URL(url);
        urlObj.search = '';
        return urlObj.toString();
    } catch {
        return url.split('?')[0];
    }
};

// --- 🚀 MAIN MUTATOR PIPELINE ---
export const mutateLink = (url: string, platform: string, targetType: string): string => {
   let trimmed = url.trim();
   if (!trimmed.startsWith('http')) {
       trimmed = 'https://' + trimmed;
   }
   
   switch(platform.toUpperCase()) {
       case 'INSTAGRAM': return cleanInstagramUrl(trimmed, targetType);
       case 'VK': return cleanVkUrl(trimmed);
       case 'TELEGRAM': return cleanTelegramUrl(trimmed);
       case 'YOUTUBE': return cleanYoutubeUrl(trimmed);
       case 'TIKTOK': return cleanTikTokUrl(trimmed);
       default: return trimmed;
   }
};

// --- 🛡️ VALIDATORS (Zod Schemas for Soft Refusal) ---

export const getLinkValidator = (platform: string, targetType: string) => {
    switch (platform.toUpperCase()) {
        case 'TELEGRAM':
            if (targetType === 'CHANNEL') {
                 return z.string().regex(/^https?:\/\/(t\.me|telegram\.me)\/[a-zA-Z0-9_]+$/, "Укажите публичную ссылку на канал (например, https://t.me/durov)");
            }
            if (targetType === 'POST') {
                 // Disallow /c/ (private)
                 return z.string()
                    .refine(val => !val.includes('/c/'), "Невозможно заказать услугу в закрытый чат (ссылка содержит /c/). Сделайте канал публичным.")
                    .and(z.string().regex(/^https?:\/\/(t\.me|telegram\.me)\/[a-zA-Z0-9_]+\/\d+$/, "Укажите ссылку на конкретный пост (например, https://t.me/durov/123)"));
            }
            break;
            
        case 'VK':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(m\.)?vk\.com\/(wall|video|clip|photo)-?\d+_\d+/, "Укажите ссылку на пост, фото или видео ВКонтакте.");
            }
            if (targetType === 'CHANNEL') {
                return z.string().regex(/^https?:\/\/(m\.)?vk\.com\/[a-zA-Z0-9_.]+$/, "Укажите прямую ссылку на группу или профиль ВКонтакте.");
            }
            break;
            
        case 'INSTAGRAM':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[a-zA-Z0-9_-]+\/?/, "Укажите ссылку на публикацию или Reel.");
            }
            if (targetType === 'CHANNEL' || targetType === 'STORY') {
                return z.string().regex(/^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/, "Укажите правильную ссылку на профиль Instagram.");
            }
            break;
            
        case 'TIKTOK':
            if (targetType === 'POST') {
                // Supports both Web and Mobile (vm.tiktok / vt.tiktok)
                return z.string().regex(/^https?:\/\/(www\.tiktok\.com\/@[a-zA-Z0-9_.]+\/video\/\d+|(vm|vt)\.tiktok\.com\/[a-zA-Z0-9_]+)/, "Скопируйте ссылку на видео из приложения TikTok.");
            }
            if (targetType === 'CHANNEL') {
                return z.string().regex(/^https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/?$/, "Укажите ссылку на профиль TikTok.");
            }
            break;
            
        case 'YOUTUBE':
            if (targetType === 'POST') {
                 return z.string().regex(/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[a-zA-Z0-9_-]+/, "Укажите ссылку на YouTube видео или Shorts.");
            }
            if (targetType === 'CHANNEL') {
                 return z.string().regex(/^https?:\/\/(www\.)?youtube\.com\/(@[a-zA-Z0-9_-]+|channel\/UC[a-zA-Z0-9_-]+|c\/[a-zA-Z0-9_-]+)$/, "Укажите ссылку на канал YouTube.");
            }
            break;
    }

    // Default fallback validator if we don't have strict rules
    return z.string().url("Укажите корректную ссылку (URL), начинающуюся с https://");
};
