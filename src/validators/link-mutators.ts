import { z } from 'zod';

/**
 * (c) 2026 SMMplan.
 * Link Mutators and Validators based on the LINK_TYPE_VALIDATION_MATRIX.
 * Ensures strict filtering, cleaning, and Soft Refusal validation.
 */

// --- 🧹 MUTATORS (Cleaners) ---

const cleanInstagramUrl = (url: string, targetType: string): string => {
  let cleaned = url
    .trim()
    .replace(/^http:\/\//i, 'https://')
    .replace(/m\.instagram\.com/i, 'www.instagram.com');
  
  // Convert instagram.com/@username -> instagram.com/username
  cleaned = cleaned.replace(/instagram\.com\/@/i, 'instagram.com/');

  // For stories, users often paste /stories/username/123123
  if (targetType === 'STORY') {
    const match = cleaned.match(/\/stories\/([^/?#]+)/i);
    if (match) {
      return `https://www.instagram.com/${match[1]}/`;
    }
  }

  // Normalize /reels/123/ -> /reel/123/
  cleaned = cleaned.replace(/\/reels\//i, '/reel/');
  // Normalize /share/p/123/ -> /p/123/ or /share/reel/123/ -> /reel/123/
  cleaned = cleaned.replace(/\/share\/p\/([a-zA-Z0-9_-]+)/i, '/p/$1/');
  cleaned = cleaned.replace(/\/share\/reel\/([a-zA-Z0-9_-]+)/i, '/reel/$1/');

  try {
    const urlObj = new URL(cleaned);
    urlObj.search = ''; // Strip ?igshid=... and tracking params
    let res = urlObj.toString();
    if (targetType === 'CHANNEL' || targetType === 'PROFILE' || targetType === 'STORY') {
      res = res.replace(/\/+$/, '');
    }
    return res;
  } catch {
    return cleaned.replace(/\/+$/, '');
  }
};

const cleanVkUrl = (url: string, targetType: string): string => {
  let cleaned = url
    .trim()
    .replace(/^http:\/\//i, 'https://')
    .replace(/m\.vk\.com/i, 'vk.com')
    .replace(/vk\.ru/i, 'vk.com');
  
  if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
    // If it's a post link (e.g. vk.com/wall-123456_789), convert to public group or user ID
    const wallMatch = cleaned.match(/vk\.com\/wall(-?\d+)_\d+/i);
    if (wallMatch) {
      const id = wallMatch[1];
      if (id.startsWith('-')) {
        return `https://vk.com/public${id.substring(1)}`;
      } else {
        return `https://vk.com/id${id}`;
      }
    }
  }

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
      let res = urlObj.toString();
      if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
        res = res.replace(/\/+$/, '');
      }
      return res;
  } catch {
      return cleaned.replace(/\/+$/, '');
  }
};

const cleanTelegramUrl = (url: string, targetType: string): string => {
  let cleaned = url
    .trim()
    .replace(/^http:\/\//i, 'https://')
    .replace(/telegram\.me/i, 't.me')
    .replace(/telegram\.dog/i, 't.me');

  // Handle bare handles: "@durov" or "durov"
  if (!cleaned.includes('/') && !cleaned.includes('.')) {
    const rawHandle = cleaned.startsWith('@') ? cleaned.substring(1) : cleaned;
    if (/^[a-zA-Z0-9_]+$/.test(rawHandle)) {
      cleaned = `https://t.me/${rawHandle}`;
    }
  }

  // Handle "t.me/@channel" -> "https://t.me/channel"
  cleaned = cleaned.replace(/t\.me\/@/i, 't.me/');

  // Handle "t.me/s/channel" -> "https://t.me/channel"
  cleaned = cleaned.replace(/t\.me\/s\/([a-zA-Z0-9_]+)/i, 't.me/$1');

  // Handle "web.telegram.org/k/#@channel" -> "https://t.me/channel"
  const webMatch = cleaned.match(/web\.telegram\.org\/(?:k|a)\/#@?([a-zA-Z0-9_]+)/i);
  if (webMatch) {
    cleaned = `https://t.me/${webMatch[1]}`;
  }

  // Ensure protocol
  if (!/^https?:\/\//i.test(cleaned) && cleaned.includes('t.me')) {
    cleaned = `https://${cleaned}`;
  }

  if (targetType === 'CHANNEL' || targetType === 'CHANNEL_POSTS' || targetType === 'PROFILE') {
    // If it's a post link (e.g. t.me/username/123), strip the post ID to make it a channel link
    const postMatch = cleaned.match(/^(https?:\/\/(?:t\.me|telegram\.dog)\/)([\w-]+)\/\d+\/?(?:\?.*)?$/i);
    if (postMatch && postMatch[2] !== 'c' && postMatch[2] !== 's') {
      cleaned = `${postMatch[1]}${postMatch[2]}`;
    }
  }

  try {
    const urlObj = new URL(cleaned);
    if (targetType === 'TELEGRAM_BOT') {
      const start = urlObj.searchParams.get('start');
      urlObj.search = '';
      if (start) {
        urlObj.searchParams.set('start', start);
      }
    } else if (targetType === 'CHANNEL' || targetType === 'CHANNEL_POSTS' || targetType === 'PROFILE') {
      // Strip query parameters for standard public channels
      if (!urlObj.pathname.includes('/+') && !urlObj.pathname.includes('/joinchat/')) {
        urlObj.search = '';
      }
    }
    let res = urlObj.toString();
    if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
      res = res.replace(/\/+$/, '');
    }
    return res;
  } catch {
    return cleaned.replace(/\/+$/, '');
  }
};

const cleanYoutubeUrl = (url: string, targetType: string): string => {
  let cleaned = url
    .trim()
    .replace(/^http:\/\//i, 'https://')
    .replace(/m\.youtube\.com/i, 'www.youtube.com');

  if (cleaned.includes('youtu.be/')) {
      const id = cleaned.split('youtu.be/')[1]?.split('?')[0]?.split('/')[0];
      if (id) cleaned = `https://www.youtube.com/watch?v=${id}`;
  }
  if (cleaned.includes('/shorts/')) {
      const id = cleaned.split('/shorts/')[1]?.split('?')[0]?.split('/')[0];
      if (id) {
        const userMatch = cleaned.match(/youtube\.com\/(@[\w.-]+)\/shorts\/\d+/i);
        if (userMatch && (targetType === 'CHANNEL' || targetType === 'PROFILE')) {
          return `https://www.youtube.com/${userMatch[1]}`;
        }
        cleaned = `https://www.youtube.com/watch?v=${id}`;
      }
  }
  if (cleaned.includes('/live/')) {
      const id = cleaned.split('/live/')[1]?.split('?')[0]?.split('/')[0];
      if (id) cleaned = `https://www.youtube.com/watch?v=${id}`;
  }
  if (cleaned.includes('/embed/')) {
      const id = cleaned.split('/embed/')[1]?.split('?')[0]?.split('/')[0];
      if (id) cleaned = `https://www.youtube.com/watch?v=${id}`;
  }

  try {
      const urlObj = new URL(cleaned);
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
          const v = urlObj.searchParams.get('v');
          if (v) {
            if (targetType === 'COMMENT') {
              const lc = urlObj.searchParams.get('lc');
              return `https://www.youtube.com/watch?v=${v}${lc ? `&lc=${lc}` : ''}`;
            }
            return `https://www.youtube.com/watch?v=${v}`;
          }
      }
      if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
        urlObj.search = '';
        return urlObj.toString().replace(/\/+$/, '');
      }
  } catch { /* ignore */ }
  return cleaned.replace(/\/+$/, '');
};

const cleanTikTokUrl = (url: string, targetType: string): string => {
    let cleaned = url
      .trim()
      .replace(/^http:\/\//i, 'https://')
      .replace(/:\/\/m\.tiktok\.com/i, '://www.tiktok.com');

    if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
      const noAtMatch = cleaned.match(/tiktok\.com\/([a-zA-Z0-9_.]+)$/i);
      if (noAtMatch && !noAtMatch[1].startsWith('@')) {
        cleaned = `https://www.tiktok.com/@${noAtMatch[1]}`;
      }
    }

    try {
        const urlObj = new URL(cleaned);
        urlObj.search = '';
        const cleanRes = urlObj.toString();
        if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
          const videoMatch = cleanRes.match(/tiktok\.com\/(@[\w.-]+)\/(?:video|photo)\/\d+/i);
          if (videoMatch) {
            return `https://www.tiktok.com/${videoMatch[1]}`;
          }
          return cleanRes.replace(/\/+$/, '');
        }
        return cleanRes;
    } catch {
        return cleaned.split('?')[0];
    }
};

const cleanTwitterUrl = (url: string, targetType: string): string => {
  let cleaned = url
    .trim()
    .replace(/^http:\/\//i, 'https://')
    .replace(/twitter\.com/i, 'x.com');
  cleaned = cleaned.replace(/x\.com\/@/i, 'x.com/');
  try {
    const urlObj = new URL(cleaned);
    urlObj.search = '';
    return urlObj.toString().replace(/\/+$/, '');
  } catch {
    return cleaned.replace(/\/+$/, '');
  }
};

const cleanRutubeUrl = (url: string, targetType: string): string => {
  let cleaned = url.trim().replace(/^http:\/\//i, 'https://');
  if (cleaned.includes('/shorts/')) {
    const id = cleaned.split('/shorts/')[1]?.split('?')[0]?.split('/')[0];
    if (id) cleaned = `https://rutube.ru/video/${id}/`;
  }
  try {
    const urlObj = new URL(cleaned);
    urlObj.search = '';
    return urlObj.toString().replace(/\/+$/, '');
  } catch {
    return cleaned.replace(/\/+$/, '');
  }
};

const cleanFacebookUrl = (url: string, targetType: string): string => {
  let cleaned = url
    .trim()
    .replace(/^http:\/\//i, 'https://')
    .replace(/m\.facebook\.com/i, 'www.facebook.com');
  try {
    const urlObj = new URL(cleaned);
    if (!urlObj.pathname.includes('permalink.php') && !urlObj.pathname.includes('profile.php')) {
      urlObj.search = '';
    }
    return urlObj.toString().replace(/\/+$/, '');
  } catch {
    return cleaned.replace(/\/+$/, '');
  }
};

const cleanThreadsUrl = (url: string, targetType: string): string => {
  let cleaned = url.trim().replace(/^http:\/\//i, 'https://');
  try {
    const urlObj = new URL(cleaned);
    urlObj.search = '';
    return urlObj.toString().replace(/\/+$/, '');
  } catch {
    return cleaned.replace(/\/+$/, '');
  }
};

// --- 🚀 MAIN MUTATOR PIPELINE ---
export const mutateLink = (url: string, platform: string, targetType: string): string => {
   let trimmed = url.trim();
   if (!trimmed) return '';

   // Handle bare @handle for any platform
   if (trimmed.startsWith('@')) {
     const handle = trimmed.substring(1);
     const plat = (platform || '').toUpperCase();
     if (plat === 'TELEGRAM' || plat === 'TG') return `https://t.me/${handle}`;
     if (plat === 'INSTAGRAM') return `https://www.instagram.com/${handle}`;
     if (plat === 'TIKTOK') return `https://www.tiktok.com/@${handle}`;
     if (plat === 'TWITTER' || plat === 'X') return `https://x.com/${handle}`;
     if (plat === 'YOUTUBE') return `https://www.youtube.com/@${handle}`;
     if (plat === 'THREADS') return `https://www.threads.net/@${handle}`;
     if (plat === 'VK') return `https://vk.com/${handle}`;
   }

   // Auto-fix double http(s):// prefixes like https://https://... or http://https://...
   trimmed = trimmed.replace(/^(?:https?:\/\/)+(https?:\/\/)/i, '$1');

   if (!/^https?:\/\//i.test(trimmed)) {
       trimmed = 'https://' + trimmed;
   }
   
   switch((platform || '').toUpperCase()) {
       case 'INSTAGRAM': return cleanInstagramUrl(trimmed, targetType);
       case 'VK': return cleanVkUrl(trimmed, targetType);
       case 'TELEGRAM': return cleanTelegramUrl(trimmed, targetType);
       case 'YOUTUBE': return cleanYoutubeUrl(trimmed, targetType);
       case 'TIKTOK': return cleanTikTokUrl(trimmed, targetType);
       case 'TWITTER':
       case 'X': return cleanTwitterUrl(trimmed, targetType);
       case 'RUTUBE': return cleanRutubeUrl(trimmed, targetType);
       case 'FACEBOOK': return cleanFacebookUrl(trimmed, targetType);
       case 'THREADS': return cleanThreadsUrl(trimmed, targetType);
       default: return trimmed;
   }
};

// --- 🛡️ VALIDATORS (Zod Schemas for Soft Refusal) ---

export const getLinkValidator = (platform: string, targetType: string) => {
    switch (platform.toUpperCase()) {
        case 'TELEGRAM':
            if (targetType === 'CHANNEL' || targetType === 'CHANNEL_POSTS' || targetType === 'PROFILE') {
                 return z.string().regex(/^https?:\/\/(?:t\.me|telegram\.me|telegram\.dog)\/(?:joinchat\/|\+)?@?[\w-]+\/?(?:\?.*)?$/i, "Укажите публичную ссылку на канал (например, https://t.me/durov)");
            }
            if (targetType === 'POST') {
                 // Disallow /c/ (private)
                 return z.string()
                    .refine(val => !val.includes('/c/'), "Невозможно заказать услугу в закрытый чат (ссылка содержит /c/). Сделайте канал публичным.")
                    .and(z.string().regex(/^https?:\/\/(?:t\.me|telegram\.me|telegram\.dog)\/[\w-]+\/\d+\/?(?:\?.*)?$/i, "Укажите ссылку на конкретный пост (например, https://t.me/durov/123)"));
            }
            if (targetType === 'TELEGRAM_BOT') {
                 return z.string().regex(/^https?:\/\/(?:t\.me|telegram\.me|telegram\.dog)\/[\w-]+_bot(?:\?start=[\w-]+)?$/i, "Укажите ссылку на Telegram-бота (например, https://t.me/my_bot или с реферальным кодом ?start=ref123)");
            }
            if (targetType === 'POLL') {
                 return z.string().regex(/^https?:\/\/(?:t\.me|telegram\.me|telegram\.dog)\/[\w-]+\/\d+\/?$/i, "Укажите ссылку на пост с опросом (например, https://t.me/durov/123)");
            }
            if (targetType === 'COMMENT') {
                 return z.string().regex(/^https?:\/\/(?:t\.me|telegram\.me|telegram\.dog)\/[\w-]+\/\d+\?comment=\d+$/i, "Укажите ссылку на комментарий в Telegram (например, https://t.me/durov/123?comment=456)");
            }
            break;
            
        case 'VK':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(?:m\.)?(?:vk\.(?:com|ru)|vkvideo\.ru)\/(?:wall|video|clip|photo)-?\d+_\d+/, "Укажите ссылку на пост, фото или видео ВКонтакте.");
            }
            if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
                return z.string().regex(/^https?:\/\/(?:m\.)?vk\.(?:com|ru)\/[a-zA-Z0-9_.]+\/?$/, "Укажите прямую ссылку на группу или профиль ВКонтакте.");
            }
            if (targetType === 'COMMENT') {
                return z.string().regex(/^https?:\/\/(?:m\.)?(?:vk\.(?:com|ru)|vkvideo\.ru)\/(?:wall|video|clip|photo)-?\d+_\d+\?(?:.*&)?reply=\d+/, "Укажите ссылку на комментарий ВКонтакте (должна содержать параметр reply).");
            }
            if (targetType === 'POLL') {
                return z.string().regex(/^https?:\/\/(?:m\.)?(?:vk\.(?:com|ru)|vkvideo\.ru)\/(?:wall|video|clip|photo)-?\d+_\d+/, "Укажите ссылку на пост с опросом ВКонтакте.");
            }
            break;
            
        case 'INSTAGRAM':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(?:www\.|m\.)?instagram\.com\/(?:p|reel|reels|tv|share\/[a-zA-Z0-9_-]+)\/[a-zA-Z0-9_-]+\/?/, "Укажите ссылку на публикацию или Reel.");
            }
            if (targetType === 'CHANNEL' || targetType === 'PROFILE' || targetType === 'STORY') {
                return z.string().regex(/^https?:\/\/(?:www\.|m\.)?instagram\.com\/@?[a-zA-Z0-9_.]+\/?$/, "Укажите правильную ссылку на профиль Instagram.");
            }
            if (targetType === 'COMMENT') {
                return z.string().regex(/^https?:\/\/(?:www\.|m\.)?instagram\.com\/(?:p|reel|reels|tv)\/[a-zA-Z0-9_-]+\/c\/[a-zA-Z0-9_-]+\/?/, "Укажите ссылку на комментарий Instagram.");
            }
            if (targetType === 'POLL') {
                return z.string().regex(/^https?:\/\/(?:www\.|m\.)?instagram\.com\/@?[a-zA-Z0-9_.]+\/?$/, "Укажите ссылку на профиль или историю Instagram с опросом.");
            }
            break;
            
        case 'TIKTOK':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(?:www\.|m\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/(?:video|photo)\/\d+|^https?:\/\/(?:vm|vt)\.tiktok\.com\/[a-zA-Z0-9_]+/, "Скопируйте ссылку на видео или фото из приложения TikTok.");
            }
            if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
                return z.string().regex(/^https?:\/\/(?:www\.|m\.)?tiktok\.com\/@?[a-zA-Z0-9_.]+\/?$/, "Укажите ссылку на профиль TikTok.");
            }
            break;
            
        case 'YOUTUBE':
            if (targetType === 'POST') {
                 return z.string().regex(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?.*v=|shorts\/|live\/|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]+/, "Укажите ссылку на YouTube видео, Shorts или стрим.");
            }
            if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
                 return z.string().regex(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/(@[a-zA-Z0-9_.-]+|channel\/UC[a-zA-Z0-9_.-]+|c\/[a-zA-Z0-9_.-]+|user\/[a-zA-Z0-9_.-]+)\/?$/, "Укажите ссылку на канал YouTube.");
            }
            break;

        case 'OK':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(?:www\.|m\.)?ok\.ru\/(?:group|profile)\/\d+\/(?:topic|statuses)\/\d+/i, "Укажите ссылку на тему или статус в Одноклассниках.");
            }
            if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
                return z.string().regex(/^https?:\/\/(?:www\.|m\.)?ok\.ru\/(?:group\/\d+|profile\/\d+|[a-zA-Z0-9_.-]+)\/?$/i, "Укажите прямую ссылку на группу или профиль в Одноклассниках.");
            }
            break;

        case 'RUTUBE':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(?:www\.)?rutube\.ru\/(?:video|shorts|play\/embed)\/[a-zA-Z0-9_-]+\/?/i, "Укажите ссылку на Rutube-видео или Shorts.");
            }
            if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
                return z.string().regex(/^https?:\/\/(?:www\.)?rutube\.ru\/(?:channel\/\d+|u\/[a-zA-Z0-9_.-]+|feeds\/[a-zA-Z0-9_.-]+)\/?/i, "Укажите ссылку на канал или профиль Rutube.");
            }
            break;

        case 'TWITTER':
        case 'X':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/\d+/i, "Укажите ссылку на твит/пост в Twitter / X.");
            }
            if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
                return z.string().regex(/^https?:\/\/(?:twitter\.com|x\.com)\/@?[a-zA-Z0-9_]+\/?$/i, "Укажите ссылку на профиль Twitter / X.");
            }
            break;

        case 'FACEBOOK':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/.+/i, "Укажите ссылку на публикацию или видео Facebook.");
            }
            if (targetType === 'CHANNEL' || targetType === 'PROFILE' || targetType === 'GROUP') {
                return z.string().regex(/^https?:\/\/(?:www\.|m\.)?facebook\.com\/.+/i, "Укажите ссылку на страницу, группу или профиль Facebook.");
            }
            break;

        case 'THREADS':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(?:www\.)?threads\.net\/@[a-zA-Z0-9_.]+\/post\/[a-zA-Z0-9_-]+/i, "Укажите ссылку на пост в Threads.");
            }
            if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
                return z.string().regex(/^https?:\/\/(?:www\.)?threads\.net\/@?[a-zA-Z0-9_.]+\/?$/i, "Укажите ссылку на профиль Threads.");
            }
            break;

        case 'TWITCH':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(?:clips\.twitch\.tv\/|twitch\.tv\/[\w]+\/clip\/|twitch\.tv\/videos\/\d+)/i, "Укажите ссылку на клип или запись стрима Twitch.");
            }
            if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
                return z.string().regex(/^https?:\/\/(?:www\.)?twitch\.tv\/[a-zA-Z0-9_]+\/?$/i, "Укажите ссылку на канал Twitch.");
            }
            break;

        case 'LIKEE':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(?:l\.likee\.video\/v\/[\w-]+|(?:likee\.video|likee\.com)\/@[\w.]+\/video\/\d+)/i, "Укажите ссылку на видео Likee.");
            }
            if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
                return z.string().regex(/^https?:\/\/(?:l\.likee\.video\/p\/[\w-]+|(?:likee\.video|likee\.com)\/@?[\w.]+)\/?$/i, "Укажите ссылку на профиль Likee.");
            }
            break;

        case 'DZEN':
            if (targetType === 'POST') {
                return z.string().regex(/^https?:\/\/(?:www\.)?dzen\.ru\/(?:a|b|video\/watch)\/[a-zA-Z0-9_-]+/i, "Укажите ссылку на статью, пост или видео Дзен.");
            }
            if (targetType === 'CHANNEL' || targetType === 'PROFILE') {
                return z.string().regex(/^https?:\/\/(?:www\.)?dzen\.ru\/(?:id\/[a-zA-Z0-9_-]+|[a-zA-Z0-9_.-]+)\/?$/i, "Укажите прямую ссылку на Дзен-канал.");
            }
            break;

        case 'DISCORD':
            return z.string().regex(/^https?:\/\/(?:discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9_-]+/i, "Укажите корректную ссылку-приглашение Discord (например, discord.gg/name)");

        case 'KICK':
            return z.string().regex(/^https?:\/\/(?:www\.)?kick\.com\/[a-zA-Z0-9_.-]+\/?$/i, "Укажите правильную ссылку на Kick-канал.");

        case 'SPOTIFY':
            if (targetType === 'POST') {
                 return z.string().regex(/^https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9_-]+/i, "Укажите ссылку на трек Spotify.");
            }
            return z.string().regex(/^https?:\/\/open\.spotify\.com\/(?:playlist|album|artist)\/[a-zA-Z0-9_-]+/i, "Укажите ссылку на плейлист, альбом или артиста Spotify.");

        case 'MAX':
            if (targetType === 'CHANNEL') {
                return z.string().regex(/^https?:\/\/(?:www\.)?max\.ru\/c\/(?:-?\d+(?:\/[a-zA-Z0-9_-]+)?|[a-zA-Z0-9_.-]+)/i, "Укажите ссылку на канал или чат мессенджера МАКС (например, max.ru/c/name).");
            }
            return z.string().regex(/^https?:\/\/(?:www\.)?max\.ru\/[a-zA-Z0-9_.-]+/i, "Укажите прямую ссылку на профиль или бота в мессенджере МАКС.");
    }

    // Default fallback validator if we don't have strict rules
    return z.string().url("Укажите корректную ссылку (URL), начинающуюся с https://");
};

export const getCustomValidator = (customDataType?: string | null) => {
  const type = customDataType?.toUpperCase() || 'NONE';
  if (type === 'NUMBER') {
    return z.string().trim().regex(/^\d+$/, "Значение должно состоять только из цифр");
  }
  if (type === 'TEXTAREA') {
    return z.string().trim()
      .min(1, "Поле не может быть пустым")
      .max(10000, "Текст слишком длинный (максимум 10000 символов)")
      // eslint-disable-next-line no-control-regex
      .refine(val => !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(val), "Текст содержит недопустимые управляющие символы");
  }
  return z.string().trim().min(1, "Поле не может быть пустым");
};

/**
 * Validates regular expression safety (ReDoS protection) and optionally runs smoke test URLs
 */
export function validateRegexSafetyAndSmoke(
  pattern: string,
  smokeCases?: { url: string; expectedMatch: boolean }[]
): { isValid: boolean; error?: string; warning?: string } {
  if (!pattern || !pattern.trim()) {
    return { isValid: false, error: 'Шаблон регулярного выражения не может быть пустым' };
  }

  // Length guard
  if (pattern.length > 300) {
    return { isValid: false, error: 'Слишком длинный шаблон регулярного выражения (макс. 300 символов)' };
  }

  // Nested quantifiers check (ReDoS)
  const redosDetectors = [
    /\([^)]*(\+|\*)[^)]*\)[+*]/,
    /\([^)]*(\+|\*)[^)]*\)\{/i,
    /\([a-z0-9_.\-\\s|]+\+[|][^)]+\)\+/i,
    /\([a-z0-9_.\-\\s|]+\*[|][^)]+\)\*/i,
    /\(\.\*\)\+/,
    /\(\.\+\)\+/,
    /\(\.\*\)\*/,
    /\([^)]*\|[^)]*\)[+*]/,
    /\(\.\*[^)]*\)\{\d+,?\}/,
  ];

  for (const dangerous of redosDetectors) {
    if (dangerous.test(pattern)) {
      return {
        isValid: false,
        error: 'Обнаружена потенциальная ReDoS уязвимость (вложенные квантификаторы вроде (a+)+ или (.*)+)'
      };
    }
  }

  // Compilation test
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, 'i');
  } catch (e: unknown) {
    return {
      isValid: false,
      error: `Синтаксическая ошибка в RegEx: ${e instanceof Error ? e.message : String(e)}`
    };
  }

  // Smoke test cases if provided
  if (smokeCases && smokeCases.length > 0) {
    for (const testCase of smokeCases) {
      const isMatch = Boolean(testCase.url.match(regex));
      if (isMatch !== testCase.expectedMatch) {
        return {
          isValid: false,
          error: `Smoke-тест не пройден для URL "${testCase.url}": ожидалось ${testCase.expectedMatch ? 'совпадение' : 'отклонение'}, получено ${isMatch ? 'совпадение' : 'отклонение'}`
        };
      }
    }
  }

  return { isValid: true };
}

