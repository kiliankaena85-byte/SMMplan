import { describe, it, expect, vi } from 'vitest';
import { getLegalDocument } from '@/actions/order/legal';
import { escapeHtml } from '@/lib/sanitize';

vi.mock('@/lib/db', () => ({
  db: {
    post: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'post-1',
        title: 'Условия обслуживания',
        contentHtml: '<p>Компания: {{COMPANY_NAME}}, ИНН: {{COMPANY_INN}}, ОГРНИП: {{COMPANY_OGRNIP}}, Адрес: {{COMPANY_ADDRESS}}</p>',
      }),
    },
  },
}));

vi.mock('@/lib/settings', () => ({
  getTenantSettings: vi.fn().mockResolvedValue({
    COMPANY_NAME: '<img src=x onerror=alert(1)>ООО "Рога и Копыта"',
    COMPANY_INN: '7701234567<script>alert(2)</script>',
    COMPANY_OGRN: '1027700132195" onmouseover="alert(3)',
    COMPANY_ADDRESS: 'г. Москва<svg onload=alert(4)>',
    SUPPORT_EMAIL: 'support@smmplan.pro',
    PRIVACY_EMAIL: 'privacy@smmplan.pro',
    SITE_NAME: 'SMMplan',
  }),
}));

describe('XSS-01: Company Settings Escaping in Legal Documents', () => {
  it('escapeHtml helper properly encodes dangerous HTML characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(escapeHtml("a'b&c\"d<e>f")).toBe('a&#39;b&amp;c&quot;d&lt;e&gt;f');
  });

  it('escapes injected malicious HTML tags in legal document settings', async () => {
    const res = await getLegalDocument('terms', 'smmplan');
    expect(res.success).toBe(true);
    if (!res.success) return;

    const html = res.data.html;
    // Malicious tags must NOT be present as raw HTML elements
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<svg onload=alert(4)>');

    // They must be escaped
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
    expect(html).toContain('&lt;svg onload=alert(4)&gt;');
  });
});
