import { z } from "zod";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";

// Using IntelligencePlatform from link-rules for platform types
export const platformUrlSchemas: Record<string, z.ZodString> = {
  telegram: z.string().regex(
    /^https?:\/\/(t\.me|telegram\.me)\/[a-zA-Z0-9_]{5,32}(\/\d+)?\/?(\?.*)?$/,
    "Введите корректную ссылку на канал Telegram, например https://t.me/channel"
  ),
  vk: z.string().regex(
    /^https?:\/\/(m\.)?vk\.com\/(id\d+|club\d+|public\d+|video-?\d+_\d+|wall-?\d+_\d+|photo-?\d+_\d+|[a-zA-Z0-9_.]+)(\?.*)?$/,
    "Введите ссылку на страницу VK, например https://vk.com/id123"
  ),
  instagram: z.string().regex(
    /^https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9_.]+\/?|p\/[a-zA-Z0-9_-]+\/?|reel\/[a-zA-Z0-9_-]+\/?)$/,
    "Введите ссылку на профиль или пост Instagram"
  ),
  youtube: z.string().regex(
    /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|channel\/|c\/|@|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]+.*$/,
    "Введите ссылку на YouTube видео или канал"
  ),
  tiktok: z.string().regex(
    /^https?:\/\/(www\.)?(tiktok\.com\/(@[a-zA-Z0-9_.]+(\/video\/\d+)?)|vm\.tiktok\.com\/[a-zA-Z0-9]+\/?).*$/,
    "Введите ссылку на профиль или видео TikTok"
  ),
};

// Fallback schema for generic URLs
const fallbackSchema = z.string()
  .min(3, "Ссылка слишком короткая")
  .refine(val => !val.includes(' '), "Ссылка не должна содержать пробелов")
  .refine(val => val.includes('.') || val.includes('t.me/'), "Ссылка должна быть корректным URL или username");

export function validateUrl(url: string, platform: IntelligencePlatform | string | null) {
  if (!url) {
    return { success: false, error: "Ссылка обязательна" };
  }
  
  // Clean URL
  let cleanUrl = url.trim();
  
  if (platform && typeof platform === 'string' && platformUrlSchemas[platform.toLowerCase()]) {
    const schema = platformUrlSchemas[platform.toLowerCase()];
    const result = schema.safeParse(cleanUrl);
    if (!result.success) {
      return { success: false, error: result.error.errors[0].message };
    }
    return { success: true, error: null };
  }
  
  // Use generic validation if platform schema not found
  const result = fallbackSchema.safeParse(cleanUrl);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }
  
  return { success: true, error: null };
}
