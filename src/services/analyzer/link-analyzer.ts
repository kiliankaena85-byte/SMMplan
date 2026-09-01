import { IntelligencePlatform, LINK_RULES } from './link-rules';
import { stripQueryParams } from '@/utils/link-normalizer';
import { safeUrlForLog } from '@/lib/log-safe';

interface IntelligenceLinkMetadata {
    isLive?: boolean;
    context?: string;
    isPrivate?: boolean;
    isAlbum?: boolean;
    isMediaGroupCandidate?: boolean;
    advice?: string;
}

export interface IntelligenceAnalysisResult {
    platform: IntelligencePlatform;
    type: string;
    id: string;
    canonicalUrl: string;
    metadata: IntelligenceLinkMetadata;
    suggestedCategories: string[];
    warnings: string[];
    tips?: string[];
}

export class IntelligenceLinkAnalyzer {
    
    async analyze(rawUrl: string): Promise<IntelligenceAnalysisResult> {
        if (!rawUrl || rawUrl.trim() === '') {
             return this.getFallbackResult(rawUrl);
        }
        const boundedRaw = rawUrl.length > 2048 ? rawUrl.slice(0, 2048) : rawUrl;
        let cleanUrl = boundedRaw.trim();
        // If it's a plain handle without slash or dot, e.g. "durov" or "@durov"
        if (!cleanUrl.includes('/') && !cleanUrl.includes('.')) {
            const rawHandle = cleanUrl.startsWith('@') ? cleanUrl.substring(1) : cleanUrl;
            if (/^[a-zA-Z0-9_]+$/.test(rawHandle)) {
                cleanUrl = `https://t.me/${rawHandle}`;
            }
        }
        const hasSingleParam = rawUrl.toLowerCase().includes('single');
        const sanitizedUrl = this.sanitize(cleanUrl);
        const expandedUrl = await this.resolve(sanitizedUrl);
        const normalizedVk = this.normalizeVkUrl(expandedUrl);
        const normalizedForMatch = this.normalizeForMatch(normalizedVk);
        return this.match(normalizedForMatch, hasSingleParam);
    }

    private normalizeVkUrl(url: string): string {
        if (!url.includes('vk.com') && !url.includes('vk.ru') && !url.includes('vkvideo.ru')) return url;
        try {
            const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
            const wParam = parsed.searchParams.get('w');
            const zParam = parsed.searchParams.get('z');
            
            if (wParam && /^(wall|clip|video)-?\d+_\d+/.test(wParam)) {
                return `${parsed.origin}/${wParam}`;
            }
            if (zParam && /^(wall|clip|video)-?\d+_\d+/.test(zParam)) {
                return `${parsed.origin}/${zParam}`;
            }
            return url;
        } catch {
            return url;
        }
    }

    private normalizeForMatch(url: string): string {
        try {
            const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
            parsed.hostname = parsed.hostname.toLowerCase();
            let decodedPath = parsed.pathname;
            try {
                decodedPath = decodeURIComponent(parsed.pathname);
            } catch {
                // Ignore malformed percent-encoding
            }
            parsed.pathname = decodedPath;
            return parsed.toString().replace(/%40/g, '@');
        } catch {
            return url.replace(/%40/g, '@');
        }
    }

    private sanitize(url: string): string {
        try {
            let cleanUrl = url.trim();
            // Pre-strip trailing encoded spaces and spaces
            cleanUrl = cleanUrl.replace(/(?:%20|\s)+$/, '');
            
            // 1. Fuzzy URL Extraction: find a URL-like match inside any surrounding text
            // e.g. "подпишитесь на https://t.me/durov!" -> "https://t.me/durov"
            const urlPattern = /(https?:\/\/[^\s!,;()]+|www\.[^\s!,;()]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/[^\s!,;()]*)/i;
            const match = cleanUrl.match(urlPattern);
            if (match) {
                cleanUrl = match[0];
                // Split by %20 or space if they were captured inside the pattern match
                cleanUrl = cleanUrl.split('%20')[0].split(' ')[0];
                // Strip trailing punctuation like ?, !, ., ,, ; from the end of the URL
                cleanUrl = cleanUrl.replace(/[?.,!;:]+$/, '');
            } else {
                cleanUrl = cleanUrl.split(' ')[0];
                cleanUrl = cleanUrl.split('%20')[0];
                cleanUrl = cleanUrl.replace(/[?.,!;:]+$/, '');
            }

            // Clean up UTM parameters using our dedicated normalizer
            cleanUrl = stripQueryParams(cleanUrl);

            // 2. Convert plain @username to proper URL if it starts with @
            if (cleanUrl.startsWith('@')) {
                const handle = cleanUrl.substring(1);
                if (/^[a-zA-Z0-9_]+$/.test(handle)) {
                    cleanUrl = `https://t.me/${handle}`;
                }
            }

            // Only parse full URL if it has http scheme
            if (!cleanUrl.startsWith('http') && cleanUrl.includes('.')) {
                cleanUrl = 'https://' + cleanUrl;
            }

            const urlObj = new URL(cleanUrl);
            return urlObj.toString().replace(/%40/g, '@');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) {
            const cleanUrl = url.trim().replace(/%40/g, '@');
            if (cleanUrl.startsWith('@')) {
                const handle = cleanUrl.substring(1);
                if (/^[a-zA-Z0-9_]+$/.test(handle)) {
                    return `https://t.me/${handle}`;
                }
            }
            return cleanUrl;
        }
    }

    private async resolve(url: string): Promise<string> {
        try {
            const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
            const { SHORT_LINK_HOSTS, resolveShortLink } = await import('@/lib/ssrf-guard');
            if (SHORT_LINK_HOSTS.has(parsed.hostname.toLowerCase())) {
                if (url.includes('youtu.be/')) {
                    return url.replace('youtu.be/', 'youtube.com/watch?v=');
                }
                return await resolveShortLink(url);
            }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            console.warn(`[LinkAnalyzer] Resolution skipped for ${safeUrlForLog(url)}`);
        }
        return url;
    }

    private match(url: string, isSingleParam = false): IntelligenceAnalysisResult {
        const decodedUrl = url.replace(/%40/g, '@');
        for (const rule of LINK_RULES) {
            const match = decodedUrl.match(rule.pattern);
            if (match) {
                const isTgPost = rule.platform === IntelligencePlatform.TELEGRAM && rule.type === 'post';
                const isSinglePhoto = isSingleParam || decodedUrl.toLowerCase().includes('single');
                const tips: string[] = [];

                let advice: string | undefined = undefined;
                if (isTgPost) {
                    tips.push('telegram_mediagroup_dual_order_recommended');
                    advice = isSinglePhoto 
                        ? 'Вы указали ссылку на отдельное медиа. Для синхронизации просмотров на iOS и Android оформите второй заказ на последнее фото альбома.'
                        : 'Если пост содержит альбом (несколько фото), оформите заказы на первое и последнее фото для синхронизации просмотров на всех устройствах.';
                }

                return {
                    platform: rule.platform,
                    type: rule.type,
                    id: match[1] || match[2] || match[3] || 'unknown',
                    canonicalUrl: decodedUrl,
                    metadata: {
                        isLive: decodedUrl.includes('/live/') || decodedUrl.includes('/reel/'),
                        context: rule.context,
                        isAlbum: isSinglePhoto,
                        isMediaGroupCandidate: isTgPost,
                        advice
                    },
                    suggestedCategories: rule.suggestedCategories,
                    warnings: [],
                    tips: tips.length > 0 ? tips : undefined
                };
            }
        }

        return this.getFallbackResult(decodedUrl);
    }

    private getFallbackResult(url: string): IntelligenceAnalysisResult {
        return {
            platform: IntelligencePlatform.OTHER,
            type: 'generic_link',
            id: 'none',
            canonicalUrl: url,
            metadata: {},
            suggestedCategories: [],
            warnings: ['platform_not_supported']
        }
    }
}
