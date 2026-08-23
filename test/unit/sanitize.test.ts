import { describe, it, expect } from 'vitest';
import { sanitizeArticleHtml } from '@/lib/sanitize';

describe('🔒 Sanitize Security: sanitizeArticleHtml XSS Protection', () => {
  it('SEC-SAN-001: removes <script> tags and executable javascript payloads', () => {
    expect(sanitizeArticleHtml('<p>Safe content</p><script>alert(1)</script>')).toBe('<p>Safe content</p>');
  });

  it('SEC-SAN-002: removes inline onerror event handlers', () => {
    expect(sanitizeArticleHtml('<img src="x" onerror="alert(1)">')).toBe('<img src="x" />');
  });

  it('SEC-SAN-003: removes javascript: pseudo-protocol in links', () => {
    expect(sanitizeArticleHtml('<a href="javascript:alert(1)">Click me</a>')).toBe('<a>Click me</a>');
  });

  it('SEC-SAN-004: preserves safe semantic HTML and formatting', () => {
    const input = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> and <a href="https://smmplan.pro">link</a></p>';
    const output = sanitizeArticleHtml(input);
    expect(output).toContain('<h1>Title</h1>');
    expect(output).toContain('<strong>bold</strong>');
    expect(output).toContain('href="https://smmplan.pro"');
  });
});
