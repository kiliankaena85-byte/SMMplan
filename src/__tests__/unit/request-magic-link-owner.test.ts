import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { requestMagicLink } from '@/actions/auth/request-magic-link';
import { sendMagicLink } from '@/lib/smtp';

const mockTx = {
  user: {
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  authToken: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    create: vi.fn().mockResolvedValue({ id: 'token-1' }),
  },
};

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<any>) => cb(mockTx)),
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn().mockReturnValue(undefined),
  })),
  headers: vi.fn(async () => ({
    get: vi.fn((key: string) => {
      if (key === 'x-tenant-id') return 'flux';
      if (key === 'x-forwarded-for') return '127.0.0.1';
      return null;
    }),
  })),
}));

vi.mock('@/lib/smtp', () => ({
  sendMagicLink: vi.fn().mockResolvedValue(undefined),
  sendWelcomeLetter: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/core/rate-limit.service', () => ({
  RateLimitService: {
    check: vi.fn().mockResolvedValue(true),
    checkCustomKey: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/lib/security/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/services/security/smartcaptcha.service', () => ({
  verifySmartCaptchaToken: vi.fn().mockResolvedValue({ success: true }),
}));

describe('requestMagicLink cross-tenant OWNER / ADMIN fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('finds existing OWNER from smmplan when logging in on flux tenant without creating new user', async () => {
    // 1st findFirst (scoped to tenantId: 'flux') returns null
    // 2nd findFirst (fallback for OWNER/ADMIN) returns the smmplan OWNER user
    mockTx.user.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'owner-uuid-1',
        email: 'art@artmspektr.ru',
        role: 'OWNER',
        tenantId: 'smmplan',
        isActive: true,
        isDeleted: false,
      });

    const formData = new FormData();
    formData.append('email', 'art@artmspektr.ru');

    const res = await requestMagicLink({}, formData);

    expect(res).toEqual({ success: true, error: null });
    // Should NOT create a new user
    expect(mockTx.user.create).not.toHaveBeenCalled();
    // Auth token created for owner
    expect(mockTx.authToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'owner-uuid-1',
        tenantId: 'flux',
      }),
    });
    // Magic link sent
    expect(sendMagicLink).toHaveBeenCalledWith(
      'art@artmspektr.ru',
      expect.any(String),
      'flux',
      undefined
    );
  });
});
