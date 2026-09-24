import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendMagicLink } from '@/lib/smtp';

describe('PII-01: SMTP Magic Link Secret Masking in Production', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('suppresses magic link output to console.info in production', async () => {
    (process.env as any).NODE_ENV = 'production';
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await sendMagicLink('victim@example.com', 'secret-prod-token-xyz', 'smmplan');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
