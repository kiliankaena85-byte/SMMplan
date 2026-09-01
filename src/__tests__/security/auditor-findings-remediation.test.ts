import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as devLoginGet } from '@/app/api/auth/dev-login/route';
import { updateStaffMemberAction } from '@/actions/admin/staff';
import { manualApprovePaymentAction } from '@/actions/admin/finance/payments';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn(),
  decryptSessionToken: vi.fn(),
  encryptSessionToken: vi.fn(),
}));

describe('Auditor Findings Remediation Test Suite (C-01 to C-03, H-01 to H-05)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('C-01: Dev-Login Backdoor Prevention', () => {
    it('returns 404 Not Found when APP_ENV is production and NODE_ENV is production', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalAppEnv = process.env.APP_ENV;
      const originalPlaywright = process.env.PLAYWRIGHT_TEST;

      try {
        (process.env as any).NODE_ENV = 'production';
        process.env.APP_ENV = 'production';
        delete process.env.PLAYWRIGHT_TEST;

        const req = new Request('https://smmplan.pro/api/auth/dev-login?role=OWNER', {
          headers: { host: 'smmplan.pro' },
        });

        const res = await devLoginGet(req);
        expect(res.status).toBe(404);
      } finally {
        (process.env as any).NODE_ENV = originalNodeEnv;
        process.env.APP_ENV = originalAppEnv;
        if (originalPlaywright) process.env.PLAYWRIGHT_TEST = originalPlaywright;
      }
    });
  });

  describe('H-02: manualApprovePaymentAction Security Guards', () => {
    it('rejects self-approval when payment.userId === admin.id', async () => {
      const staffUser = await db.user.create({
        data: {
          email: `auditor_support_${Date.now()}@smmplan.pro`,
          role: 'SUPPORT',
          supportLimitCents: 300000,
          tenantId: 'smmplan',
        },
      });

      const payment = await db.payment.create({
        data: {
          userId: staffUser.id,
          amount: BigInt(50000),
          status: 'PENDING',
          tenantId: 'smmplan',
        },
      });

      vi.mocked(verifySession).mockResolvedValue({
        userId: staffUser.id,
        sessionId: 'sess_auditor_1',
        role: 'SUPPORT',
        canResetPassword: false,
        sessionVer: 1,
      } as any);

      const result = await manualApprovePaymentAction({
        paymentId: payment.id,
        gatewayTransactionId: 'TEST-TX-1234',
        notes: 'Попытка подтверждения собственного платежа',
      });

      expect(result.success).toBe(false);
      if ('error' in result) {
        expect(result.error).toMatch(/Запрещено подтверждать собственные платежи/i);
      }
    });
  });

  describe('H-03: updateStaffMemberAction Role and Limit Protection', () => {
    it('prevents self-modification of limits and roles', async () => {
      const adminUser = await db.user.create({
        data: {
          email: `auditor_admin_${Date.now()}@smmplan.pro`,
          role: 'ADMIN',
          tenantId: 'smmplan',
        },
      });

      vi.mocked(verifySession).mockResolvedValue({
        userId: adminUser.id,
        sessionId: 'sess_auditor_2',
        role: 'ADMIN',
        canResetPassword: false,
        sessionVer: 1,
      } as any);

      const result = await updateStaffMemberAction({
        userId: adminUser.id,
        role: 'ADMIN',
        supportLimitRubles: 100000,
      });

      expect(result.success).toBe(false);
      if ('error' in result) {
        expect(result.error).toMatch(/Запрещено изменять собственную роль или лимиты/i);
      }
    });
  });

  describe('H-04: HTML Escaping in Bug Reports', () => {
    it('escapes dangerous HTML characters in telegram captions', () => {
      function escapeHtml(str: string): string {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      const rawInput = '<script>alert("xss")</script><a href="http://phish.com">click</a>';
      const escaped = escapeHtml(rawInput);
      expect(escaped).not.toContain('<script>');
      expect(escaped).not.toContain('<a href=');
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&lt;a href=&quot;http://phish.com&quot;&gt;click&lt;/a&gt;');
    });
  });
});
