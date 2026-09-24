import { describe, it, expect } from 'vitest';
import { serializeJsonLd } from '@/lib/sanitize';

describe('XSS-02: JSON-LD Script Tag Escaping', () => {
  it('replaces all "<" occurrences with unicode \\u003c to prevent script injection', () => {
    const maliciousPayload = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: '</script><script>alert("xss")</script>',
      description: '<img src=x onerror=alert(1)>',
    };

    const output = serializeJsonLd(maliciousPayload);

    // Raw script and HTML tags must NOT be present
    expect(output).not.toContain('</script>');
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('<img');

    // Unicode escapes must be present
    expect(output).toContain('\\u003c/script>');
    expect(output).toContain('\\u003cscript>');
    expect(output).toContain('\\u003cimg');

    // JSON must still parse cleanly back to original string in JavaScript
    const parsed = JSON.parse(output);
    expect(parsed.name).toBe('</script><script>alert("xss")</script>');
    expect(parsed.description).toBe('<img src=x onerror=alert(1)>');
  });

  it('handles nested objects, arrays, and null/undefined values safely', () => {
    expect(serializeJsonLd(null)).toBe('');
    expect(serializeJsonLd(undefined)).toBe('');

    const complex = [
      { text: 'A < B and C > D' },
      { list: ['<b>bold</b>', '<iframe src="evil.com">'] }
    ];
    const res = serializeJsonLd(complex);
    expect(res).not.toContain('<');
    expect(res).toContain('\\u003c');
  });
});
