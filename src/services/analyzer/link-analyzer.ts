import { IntelligencePlatform, LINK_RULES } from './link-rules';
import { stripQueryParams } from '@/utils/link-normalizer';

interface IntelligenceLinkMetadata {
    isLive?: boolean;
    context?: string;
    isPrivate?: boolean;
    isAlbum?: boolean;
}

export interface IntelligenceAnalysisResult {
    platform: IntelligencePlatform;
    type: string;
    id: string;
    canonicalUrl: string;
    metadata: IntelligenceLinkMetadata;
    suggestedCategories: string[];
    warnings: string[];
}

export class IntelligenceLinkAnalyzer {
    
    async analyze(rawUrl: string): Promise<IntelligenceAnalysisResult> {
        if (!rawUrl || rawUrl.trim() === '') {
             return this.getFallbackResult(rawUrl);
        }
        const sanitizedUrl = this.sanitize(rawUrl);
        const expandedUrl = await this.resolve(sanitizedUrl);
        const normalizedUrl = this.normalizeVkUrl(expandedUrl);
        return this.match(normalizedUrl);
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

    private sanitize(url: string): string {
        try {
            let cleanUrl = url.trim();
            cleanUrl = cleanUrl.split(' ')[0];
            cleanUrl = cleanUrl.split('%20')[0];
            
            // Clean up UTM parameters using our dedicated normalizer
            cleanUrl = stripQueryParams(cleanUrl);

            // Only parse full URL if it has http scheme
            if (!cleanUrl.startsWith('http')) {
                cleanUrl = 'https://' + cleanUrl;
            }

            const urlObj = new URL(cleanUrl);
            return urlObj.toString().replace(/%40/g, '@');
        } catch (_e) {
            return url.trim().replace(/%40/g, '@');
        }
    }

    private async resolve(url: string): Promise<string> {
        const shortDomains = ['bit.ly', 'youtu.be', 'vm.tiktok.com', 't.co', 'cutt.ly'];
        if (shortDomains.some(d => url.includes(d))) {
            if (url.includes('youtu.be/')) {
                return url.replace('youtu.be/', 'youtube.com/watch?v=');
            }
            try {
                const fetchUrl = url.startsWith('http') ? url : `https://${url}`;
                const res = await fetch(fetchUrl, {
                    method: 'HEAD', 
                    redirect: 'follow',
                    signal: AbortSignal.timeout(1500)
                });
                if (res.url) return res.url;
            } catch (e) {
                // Silent fallback on timeout/error
            }
        }
        return url;
    }

    private match(url: string): IntelligenceAnalysisResult {
        const decodedUrl = url.replace(/%40/g, '@');
        for (const rule of LINK_RULES) {
            const match = decodedUrl.match(rule.pattern);
            if (match) {
                return {
                    platform: rule.platform,
                    type: rule.type,
                    id: match[1] || match[2] || match[3] || 'unknown',
                    canonicalUrl: decodedUrl,
                    metadata: {
                        isLive: decodedUrl.includes('/live/') || decodedUrl.includes('/reel/'),
                        context: rule.context
                    },
                    suggestedCategories: rule.suggestedCategories,
                    warnings: []
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
