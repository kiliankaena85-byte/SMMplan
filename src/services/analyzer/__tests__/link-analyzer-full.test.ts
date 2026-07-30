import { describe, it, expect, vi } from 'vitest';
import { safeUrlForLog } from '@/lib/log-safe';
import { isPublicHost, isPublicIp, resolveShortLink } from '@/lib/ssrf-guard';
import { IntelligenceLinkAnalyzer } from '../link-analyzer';
import { IntelligencePlatform } from '../link-rules';
import { getCustomValidator } from '@/validators/link-mutators';
import { matchesSuggestedCategory } from '../category-matcher';
import * as adminAudit from '@/lib/admin-audit';

describe('Full Link Analyzer Remediation Suite (L-1, L-3, L-4, L-6, L-new1..L-new5)', () => {
  describe('L-new1: safeUrlForLog', () => {
    it('strips query parameters and hashes from URLs for privacy', () => {
      expect(safeUrlForLog('https://example.com/page?secret=123&user=admin#hash')).toBe('https://example.com/page');
      expect(safeUrlForLog('https://t.me/durov?start=ref123')).toBe('https://t.me/durov');
    });

    it('handles unparseable or null input safely', () => {
      expect(safeUrlForLog('')).toBe('[unparseable-url]');
      expect(safeUrlForLog(null)).toBe('[unparseable-url]');
      expect(safeUrlForLog(':::invalid-url')).toBe('[unparseable-url]');
    });
  });

  describe('L-1: SSRF Guard (protocol, internal IPs, redirect limits)', () => {
    it('returns raw input for non-HTTP/HTTPS protocols', async () => {
      expect(await resolveShortLink('file:///etc/passwd')).toBe('file:///etc/passwd');
      expect(await resolveShortLink('gopher://127.0.0.1:70')).toBe('gopher://127.0.0.1:70');
      expect(await resolveShortLink('dict://127.0.0.1:2628')).toBe('dict://127.0.0.1:2628');
    });

    it('rejects private and loopback IPv4/IPv6 addresses', () => {
      expect(isPublicIp('127.0.0.1')).toBe(false);
      expect(isPublicIp('10.0.0.1')).toBe(false);
      expect(isPublicIp('172.16.0.1')).toBe(false);
      expect(isPublicIp('192.168.1.1')).toBe(false);
      expect(isPublicIp('169.254.1.1')).toBe(false);
      expect(isPublicIp('0.0.0.0')).toBe(false);
      expect(isPublicIp('::1')).toBe(false);
      expect(isPublicIp('fc00::1')).toBe(false);
      expect(isPublicIp('fe80::1')).toBe(false);
      expect(isPublicIp('8.8.8.8')).toBe(true);
    });

    it('rejects internal hostnames like localhost, .local, .internal', async () => {
      expect(await isPublicHost('localhost')).toBe(false);
      expect(await isPublicHost('app.local')).toBe(false);
      expect(await isPublicHost('server.internal')).toBe(false);
    });
  });

  describe('L-new2 & L-new3: normalizeForMatch and first-match order', () => {
    const analyzer = new IntelligenceLinkAnalyzer();

    it('normalizes uppercase host and percent-encoding before matching', async () => {
      const res = await analyzer.analyze('https://T.ME/%64%75%72%6f%76');
      expect(res.platform).toBe(IntelligencePlatform.TELEGRAM);
      expect(res.id).toBe('durov');
    });

    it('guarantees first-match rule priority for chameleon links', async () => {
      // Private post matches private_post before generic channel rule
      const resPrivate = await analyzer.analyze('https://t.me/c/12345/6789');
      expect(resPrivate.platform).toBe(IntelligencePlatform.TELEGRAM);
      expect(resPrivate.type).toBe('private_post');

      // Bot link matches bot rule before generic channel rule
      const resBot = await analyzer.analyze('https://t.me/my_smm_bot');
      expect(resBot.platform).toBe(IntelligencePlatform.TELEGRAM);
      expect(resBot.type).toBe('bot');
    });

    it('validates @username handle with regex before t.me concatenation (L-6)', async () => {
      const resInvalid = await analyzer.analyze('@durov<script>');
      expect(resInvalid.platform).toBe(IntelligencePlatform.OTHER);

      const resValid = await analyzer.analyze('@durov');
      expect(resValid.platform).toBe(IntelligencePlatform.TELEGRAM);
      expect(resValid.id).toBe('durov');
    });
  });

  describe('L-new4: CUSTOM Validator (getCustomValidator)', () => {
    it('validates NUMBER custom input strictly', () => {
      const numberValidator = getCustomValidator('NUMBER');
      expect(numberValidator.safeParse('12345').success).toBe(true);
      expect(numberValidator.safeParse('123a45').success).toBe(false);
      expect(numberValidator.safeParse('').success).toBe(false);
    });

    it('validates TEXTAREA custom input with control character check', () => {
      const textareaValidator = getCustomValidator('TEXTAREA');
      expect(textareaValidator.safeParse('Hello World\nLine 2').success).toBe(true);
      expect(textareaValidator.safeParse('Bad\x00Control').success).toBe(false);
      expect(textareaValidator.safeParse('a'.repeat(10001)).success).toBe(false);
    });

    it('validates NONE custom input as non-empty string', () => {
      const defaultValidator = getCustomValidator('NONE');
      expect(defaultValidator.safeParse('Valid').success).toBe(true);
      expect(defaultValidator.safeParse('   ').success).toBe(false);
    });
  });

  describe('L-new5: CATEGORY_UNMAPPED Observability Alert', () => {
    it('triggers CATEGORY_UNMAPPED audit log on unmapped category mismatch', async () => {
      const spy = vi.spyOn(adminAudit, 'auditAdmin').mockImplementation(() => {});
      const matched = matchesSuggestedCategory('Неизвестная Категория 123', ['Подписчики']);
      expect(matched).toBe(false);
      // Give dynamic import promise a tick to execute
      await new Promise(r => setTimeout(r, 50));
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CATEGORY_UNMAPPED',
        target: 'Неизвестная Категория 123'
      }));
      spy.mockRestore();
    });
  });
});
