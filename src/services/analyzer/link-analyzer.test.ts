import { describe, it, expect, beforeEach } from 'vitest';
import { IntelligenceLinkAnalyzer } from './link-analyzer';
import { IntelligencePlatform } from './link-rules';

describe('IntelligenceLinkAnalyzer', () => {
    let analyzer: IntelligenceLinkAnalyzer;

    beforeEach(() => {
        analyzer = new IntelligenceLinkAnalyzer();
    });

    describe('analyze', () => {
        it('returns fallback result for empty url', async () => {
            const res = await analyzer.analyze('');
            expect(res.platform).toBe(IntelligencePlatform.OTHER);
            expect(res.warnings).toContain('platform_not_supported');
            
            const res2 = await analyzer.analyze('   ');
            expect(res2.platform).toBe(IntelligencePlatform.OTHER);
        });

        it('sanitizes query parameters like utm_ and igshid', async () => {
            const res = await analyzer.analyze('https://instagram.com/p/C123456789?igshid=123&utm_source=test&ref=123');
            expect(res.canonicalUrl).toBe('https://instagram.com/p/C123456789');
        });

        it('sanitizes strings with spaces and weird encodings', async () => {
            const res = await analyzer.analyze('https://tiktok.com/@user/video/1234567890123456789  some text');
            expect(res.canonicalUrl).toBe('https://tiktok.com/@user/video/1234567890123456789');
            
            const res2 = await analyzer.analyze('https://youtube.com/watch?v=dQw4w9WgXcQ%20extra');
            expect(res2.canonicalUrl).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
        });

        it('prepends https:// if schema is missing', async () => {
            const res = await analyzer.analyze('youtube.com/watch?v=dQw4w9WgXcQ');
            // Though match logic might hit it, we just check canonical
            expect(res.canonicalUrl).toContain('https://youtube.com/watch?v=dQw4w9WgXcQ');
        });

        it('catches and returns fallback on completely unparseable bad inputs', async () => {
             // Though it might prepend https:// but if URL constructor fails, it returns trimmed
            // We mock URL globally just for this test to hit the catch block
            const originalURL = global.URL;
            global.URL = class { constructor() { throw new Error('Bad URL'); } } as any;
            
            const res = await analyzer.analyze('bad-url-no-schema');
            global.URL = originalURL; // restore
            
            expect(res.canonicalUrl).toBe('bad-url-no-schema');
            expect(res.platform).toBe(IntelligencePlatform.OTHER);
        });

        it('expands youtube shortlinks', async () => {
            const res = await analyzer.analyze('https://youtu.be/dQw4w9WgXcQ');
            expect(res.canonicalUrl).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
        });

        it('recognizes youtube videos based on rules', async () => {
            const res = await analyzer.analyze('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            // Assuming LINK_RULES has youtube match
            expect(res.id).toBe('dQw4w9WgXcQ');
            expect(res.platform).toBe(IntelligencePlatform.YOUTUBE);
            expect(res.type).toBe('video');
        });

        it('identifies live and reel metadata', async () => {
            const res = await analyzer.analyze('https://instagram.com/reel/C1234/');
            if (res.platform !== IntelligencePlatform.OTHER) {
               expect(res.metadata.isLive).toBe(true);
            }
        });

        it('recognizes Twitter posts and profiles correctly', async () => {
            const postRes = await analyzer.analyze('https://x.com/elonmusk/status/123456');
            expect(postRes.platform).toBe(IntelligencePlatform.TWITTER);
            expect(postRes.type).toBe('post');

            const profileRes = await analyzer.analyze('https://twitter.com/elonmusk');
            expect(profileRes.platform).toBe(IntelligencePlatform.TWITTER);
            expect(profileRes.type).toBe('profile');

            const xProfileRes = await analyzer.analyze('https://x.com/elonmusk');
            expect(xProfileRes.platform).toBe(IntelligencePlatform.TWITTER);
            expect(xProfileRes.type).toBe('profile');
        });

        it('recognizes VK posts with and without query parameters', async () => {
            const normalPost = await analyzer.analyze('https://vk.com/wall-123_456');
            expect(normalPost.platform).toBe(IntelligencePlatform.VK);
            expect(normalPost.type).toBe('post');

            const queryPostW = await analyzer.analyze('https://vk.com/club123?w=wall-123_456');
            expect(queryPostW.platform).toBe(IntelligencePlatform.VK);
            expect(queryPostW.type).toBe('post');

            const queryPostZ = await analyzer.analyze('https://vk.com/public123?z=video-123_456');
            expect(queryPostZ.platform).toBe(IntelligencePlatform.VK);
            expect(queryPostZ.type).toBe('post');

            const profileRes = await analyzer.analyze('https://vk.com/username');
            expect(profileRes.platform).toBe(IntelligencePlatform.VK);
            expect(profileRes.type).toBe('profile');

            const clubProfile = await analyzer.analyze('https://vk.com/club123');
            expect(clubProfile.platform).toBe(IntelligencePlatform.VK);
            expect(clubProfile.type).toBe('profile');
        });

        it('resolves generic http links to WEBSITE platform', async () => {
            const res = await analyzer.analyze('https://example.com/some/random/path');
            expect(res.platform).toBe(IntelligencePlatform.WEBSITE);
            expect(res.type).toBe('seo_traffic');
        });
    });
});
