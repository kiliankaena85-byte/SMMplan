import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { renderSafeTelegramText } from '@/app/admin/settings/telegram/telegram-live-preview';

describe('XSS-03: Telegram Live Preview Safe Rendering', () => {
  it('neutralizes malicious XSS scripts without executing HTML', () => {
    const maliciousPayload = '<script>window.__xss_executed = true;</script><img src="x" onerror="alert(1)">Hello';
    const { container } = render(<div>{renderSafeTelegramText(maliciousPayload)}</div>);

    // No <script> or <img> tags should exist in the DOM
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();

    // The text should be safely rendered as textContent
    expect(container.textContent).toContain('<script>window.__xss_executed = true;</script>');
    expect(container.textContent).toContain('<img src="x" onerror="alert(1)">Hello');
  });

  it('renders safe telegram tags (<b>, <i>, <code>, <br>) as React elements', () => {
    const formatted = '<b>Bold text</b> and <i>Italic text</i> with <code>some_code</code><br/>Next line';
    const { container } = render(<div>{renderSafeTelegramText(formatted)}</div>);

    const strongEl = container.querySelector('strong');
    expect(strongEl).not.toBeNull();
    expect(strongEl?.textContent).toBe('Bold text');

    const emEl = container.querySelector('em');
    expect(emEl).not.toBeNull();
    expect(emEl?.textContent).toBe('Italic text');

    const codeEl = container.querySelector('code');
    expect(codeEl).not.toBeNull();
    expect(codeEl?.textContent).toBe('some_code');

    expect(container.textContent).toContain('Next line');
  });

  it('guarantees zero occurrences of dangerouslySetInnerHTML in telegram-live-preview.tsx', () => {
    const previewFilePath = path.resolve(__dirname, '../../app/admin/settings/telegram/telegram-live-preview.tsx');
    const content = fs.readFileSync(previewFilePath, 'utf8');

    expect(content).not.toContain('dangerouslySetInnerHTML');
  });
});
