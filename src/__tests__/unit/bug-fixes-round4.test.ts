import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateRoleAction, cloneRoleAction, createRoleAction } from '@/actions/admin/roles';
import { updateStaffMemberAction } from '@/actions/admin/staff';
import { generateApiKeyAction, resetApiKeyAction } from '@/actions/user/settings/api-key.action';
import { toggleClientCampaignStatus } from '@/actions/order/smart';
import { updateCampaignStatus } from '@/actions/admin/smart';
import { orderService } from '@/services/core/order.service';
import { paymentService } from '@/services/financial/payment.service';
import { approveFraudHoldAction, rejectFraudHoldAction } from '@/lib/fraud/manual-review-queue';
import { isPublicIp, resolveShortLink } from '@/lib/ssrf-guard';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { requireStaffPermission } from '@/lib/server/rbac';
import { verifyPassword } from '@/lib/auth/password';
import { WalletOps } from '@/services/financial/wallet-ops';

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn(),
}));

vi.mock('@/lib/server/rbac', () => ({
  requireStaffPermission: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    staffRole: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    staffPermission: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    smartCampaign: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    ledgerEntry: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (fn) => (typeof fn === 'function' ? fn(db) : fn)),
  },
}));

vi.mock('@/lib/smtp', () => ({
  sendOrderPaidMail: vi.fn().mockResolvedValue(true),
  sendOrderCanceledMail: vi.fn().mockResolvedValue(true),
  sendOrderCompletedMail: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/transactions', () => ({
  runSerializableTransaction: vi.fn(async (fn) => fn(db)),
}));

vi.mock('@/services/financial/wallet-ops', () => ({
  WalletOps: {
    credit: vi.fn().mockResolvedValue({ id: 'led_cred_1' }),
    charge: vi.fn().mockResolvedValue({ id: 'led_chrg_1' }),
    refund: vi.fn().mockResolvedValue({ id: 'led_ref_1' }),
  },
}));

vi.mock('@/services/users/loyalty.service', () => ({
  LoyaltyService: {
    reverseCommission: vi.fn().mockResolvedValue(true),
    confirmCommission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/admin-audit', () => ({
  auditAdmin: vi.fn(),
  auditAdminAwaitable: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/notifications', () => ({
  sendAdminAlert: vi.fn().mockResolvedValue(true),
  sendAdminAlertSync: vi.fn(),
}));

vi.mock('@/services/security/security-alert.service', () => ({
  SecurityAlertService: {
    record: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    del: vi.fn().mockResolvedValue(1),
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/utils/ip', () => ({
  getClientIp: vi.fn().mockResolvedValue('127.0.0.1'),
}));

describe('Round 4 Bug Fixes & Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Role Privilege Escalation Prevention', () => {
    it('blocks updateRoleAction when non-OWNER staff attempts to grant unpossessed permissions', async () => {
      const mockStaffUser = {
        id: 'staff_support',
        email: 'support@smmplan.pro',
        role: 'SUPPORT',
        staffRoleId: 'role_support_id',
      };

      vi.mocked(requireStaffPermission).mockImplementation(async (_sec, _act, fn: any) => {
        return fn(mockStaffUser);
      });

      // Existing role being edited
      vi.mocked(db.staffRole.findUnique).mockImplementation((async ({ where }: any) => {
        if (where.id === 'target_role_id') {
          return {
            id: 'target_role_id',
            name: 'Target Role',
            isSystem: false,
            permissions: [{ section: 'orders', canView: true, canEdit: false }],
          } as any;
        }
        if (where.id === 'role_support_id') {
          return {
            id: 'role_support_id',
            name: 'Support Role',
            isSystem: false,
            // Caller only has tickets:view and orders:view
            permissions: [
              { section: 'tickets', canView: true, canEdit: true },
              { section: 'orders', canView: true, canEdit: false },
            ],
          } as any;
        }
        return null;
      }) as any);

      // Caller attempts to add finance:edit (which they do NOT possess)
      const res = await updateRoleAction({
        id: 'target_role_id',
        name: 'Target Role',
        permissions: [
          { section: 'finance', canView: true, canEdit: true },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Нельзя предоставить право');
    });

    it('blocks cloneRoleAction when non-OWNER staff attempts to clone a role with higher permissions', async () => {
      const mockStaffUser = {
        id: 'staff_support',
        email: 'support@smmplan.pro',
        role: 'SUPPORT',
        staffRoleId: 'role_support_id',
      };

      vi.mocked(requireStaffPermission).mockImplementation(async (_sec, _act, fn: any) => {
        return fn(mockStaffUser);
      });

      // Source role to clone has finance:edit
      vi.mocked(db.staffRole.findUnique).mockImplementation((async ({ where }: any) => {
        if (where.id === 'source_finance_role') {
          return {
            id: 'source_finance_role',
            name: 'Finance Manager',
            isSystem: false,
            permissions: [{ section: 'finance', canView: true, canEdit: true }],
          } as any;
        }
        if (where.id === 'role_support_id') {
          return {
            id: 'role_support_id',
            name: 'Support Role',
            isSystem: false,
            permissions: [{ section: 'tickets', canView: true, canEdit: true }],
          } as any;
        }
        return null;
      }) as any);

      vi.mocked(db.staffRole.findFirst).mockResolvedValue(null);

      const res = await cloneRoleAction({
        id: 'source_finance_role',
        newName: 'Cloned Finance Role',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Нельзя клонировать роль с правом');
    });
  });

  describe('2. Staff Hierarchy Guard', () => {
    it('blocks callers with role USER from updating staff members', async () => {
      const mockUserWithStaffRole = {
        id: 'user_with_role',
        email: 'user@smmplan.pro',
        role: 'USER',
        staffRoleId: 'custom_role_id',
      };

      vi.mocked(requireStaffPermission).mockImplementation(async (_sec, _act, fn: any) => {
        return fn(mockUserWithStaffRole);
      });

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'target_employee',
        role: 'SUPPORT',
        supportLimitCents: 1000,
      } as any);

      const res = await updateStaffMemberAction({
        userId: 'target_employee',
        role: 'SUPPORT',
        supportLimitRubles: 5000,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('У вас недостаточно прав для управления профилями сотрудников');
    });
  });

  describe('3. Sudo-Mode Password Verification for API Key', () => {
    it('requires password when user has passwordHash set', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: 'usr_pwd_test' } as any);
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'usr_pwd_test',
        passwordHash: 'hashed_secret_123',
      } as any);

      // Call without password
      const resWithoutPwd = await generateApiKeyAction();
      expect(resWithoutPwd.success).toBe(false);
      expect(resWithoutPwd.error).toBe('Для изменения API-ключа требуется подтвердить пароль');

      // Call with invalid password
      vi.mocked(verifyPassword).mockResolvedValue(false);
      const resWithWrongPwd = await generateApiKeyAction('wrongpassword');
      expect(resWithWrongPwd.success).toBe(false);
      expect(resWithWrongPwd.error).toBe('Неверный пароль');

      // Call with correct password
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(db.user.update).mockResolvedValue({ id: 'usr_pwd_test' } as any);
      const resWithCorrectPwd = await generateApiKeyAction('correctpassword');
      expect(resWithCorrectPwd.success).toBe(true);
      expect(resWithCorrectPwd.apiKey).toMatch(/^smm_/);
    });
  });

  describe('4. Smart Drip Campaign Status TOCTOU Prevention', () => {
    it('returns typed error when atomic status transition fails', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: 'usr_smart_1' } as any);
      vi.mocked(db.smartCampaign.findUnique).mockResolvedValue({
        id: 'camp_1',
        userId: 'usr_smart_1',
        status: 'RUNNING',
      } as any);

      // Simulate concurrent update: updateMany affects 0 rows
      vi.mocked(db.smartCampaign.updateMany).mockResolvedValue({ count: 0 });

      const res = await toggleClientCampaignStatus('camp_1', 'PAUSED');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Статус кампании уже был изменен или кампания завершена');
    });
  });

  describe('5. Order Service ERROR Status Refund', () => {
    it('refunds customer when provider marks order with ERROR status', async () => {
      const mockOrder = {
        id: 'ord_err_test_1',
        numericId: 99112,
        userId: 'usr_client_1',
        externalId: 'ext_prov_123',
        status: 'IN_PROGRESS',
        charge: BigInt(50000), // 500 RUB
        quantity: 1000,
        remains: 1000,
        tenantId: 'smmplan',
        user: { email: 'client@example.com' },
      };

      vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
      vi.mocked(db.order.update).mockResolvedValue({ ...mockOrder, status: 'ERROR' } as any);
      vi.mocked(db.ledgerEntry.findFirst).mockResolvedValue(null);

      const res = await orderService.processStatusUpdate('ext_prov_123', 'Error', 1000);

      expect(res.success).toBe(true);
      expect(res.status).toBe('ERROR');
      expect(WalletOps.refund).toHaveBeenCalledWith(
        expect.anything(),
        'usr_client_1',
        50000,
        expect.stringContaining('ERROR'),
        expect.objectContaining({ idempotencyKey: 'refund-order-ord_err_test_1' })
      );
    });
  });

  describe('6. Section Normalization in Permission Ceiling', () => {
    it('allows granting "support" when creator possesses canonical "tickets" permission', async () => {
      const mockStaffUser = {
        id: 'staff_support_lead',
        email: 'lead@smmplan.pro',
        role: 'SUPPORT',
        staffRoleId: 'role_lead_id',
      };

      vi.mocked(requireStaffPermission).mockImplementation(async (_sec, _act, fn: any) => {
        return fn(mockStaffUser);
      });

      vi.mocked(db.staffRole.findFirst).mockResolvedValue(null);
      vi.mocked(db.staffRole.findUnique).mockResolvedValue({
        id: 'role_lead_id',
        name: 'Lead Support',
        isSystem: false,
        // Creator possesses canonical 'tickets'
        permissions: [
          { section: 'tickets', canView: true, canEdit: true },
        ],
      } as any);

      vi.mocked(db.staffRole.create).mockResolvedValue({
        id: 'new_support_role',
        name: 'Junior Support',
        permissions: [{ section: 'tickets', canView: true, canEdit: false }],
      } as any);

      // Target grants 'support' alias
      const res = await createRoleAction({
        name: 'Junior Support',
        permissions: [
          { section: 'support', canView: true, canEdit: false },
        ],
      });

      expect(res.success).toBe(true);
    });
  });

  describe('7. Sudo-Mode Password Verification Flag', () => {
    it('returns requiresPassword: true when password is not provided', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: 'usr_pwd_test' } as any);
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'usr_pwd_test',
        passwordHash: 'hashed_secret_123',
      } as any);

      const res = await generateApiKeyAction();
      expect(res.success).toBe(false);
      expect(res.requiresPassword).toBe(true);
      expect(res.error).toBe('Для изменения API-ключа требуется подтвердить пароль');

      const resetRes = await resetApiKeyAction();
      expect(resetRes.success).toBe(false);
      expect(resetRes.requiresPassword).toBe(true);
    });
  });

  describe('8. Admin Smart Drip Campaign Status TOCTOU & Error Handling', () => {
    it('returns typed error when admin campaign update fails or campaign not found', async () => {
      const mockAdmin = { id: 'admin_1', email: 'admin@smmplan.pro', role: 'ADMIN' };
      vi.mocked(requireStaffPermission).mockImplementation(async (_sec, _act, fn: any) => {
        return fn(mockAdmin);
      });

      vi.mocked(db.smartCampaign.findUnique).mockResolvedValue(null);

      const resNotFound = await updateCampaignStatus('non_existent', 'PAUSED');
      expect(resNotFound.success).toBe(false);
      expect(resNotFound.error).toBe('Кампания не найдена');

      // Campaign finished
      vi.mocked(db.smartCampaign.findUnique).mockResolvedValue({
        id: 'camp_done',
        status: 'COMPLETED',
      } as any);
      const resFinished = await updateCampaignStatus('camp_done', 'RUNNING');
      expect(resFinished.success).toBe(false);
      expect(resFinished.error).toBe('Нельзя изменить статус завершенной или ошибочной кампании');

      // Concurrent race condition
      vi.mocked(db.smartCampaign.findUnique).mockResolvedValue({
        id: 'camp_race',
        status: 'RUNNING',
      } as any);
      vi.mocked(db.smartCampaign.updateMany).mockResolvedValue({ count: 0 });
      const resRace = await updateCampaignStatus('camp_race', 'PAUSED');
      expect(resRace.success).toBe(false);
      expect(resRace.error).toBe('Статус кампании уже был изменен или кампания завершена');
    });
  });

  describe('9. Fraud Hold Manual Review Approval & Rejection', () => {
    it('approves FRAUD_HOLD payment, transitions to SUCCEEDED and activates PENDING_CHECK order', async () => {
      const mockPayment = {
        id: 'pay_fraud_1',
        gatewayId: 'yoo_pay_123',
        amount: BigInt(10000), // 100 RUB
        userId: 'usr_fraud_1',
        status: 'FRAUD_HOLD',
        gateway: 'yookassa',
        tenantId: 'smmplan',
      };

      const mockOrder = {
        id: 'ord_fraud_1',
        numericId: 88221,
        userId: 'usr_fraud_1',
        charge: BigInt(10000),
        status: 'PENDING_CHECK',
        tenantId: 'smmplan',
        isDripFeed: false,
        user: { email: 'client@example.com' },
        service: { name: 'Telegram Followers' },
      };

      vi.mocked(db.payment.findUnique).mockResolvedValue(mockPayment as any);
      vi.mocked(db.payment.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(db.order.findMany).mockResolvedValue([mockOrder] as any);
      vi.mocked(db.order.updateMany).mockResolvedValue({ count: 1 });

      const res = await approveFraudHoldAction('pay_fraud_1', 'staff_operator_1', 'Одобрено вручную');
      expect(res.success).toBe(true);
      expect(res.message).toBe('Платёж успешно одобрен и зачислен');

      expect(db.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['PENDING', 'FRAUD_HOLD'] },
          }),
          data: expect.objectContaining({ status: 'SUCCEEDED' }),
        })
      );

      expect(db.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['AWAITING_PAYMENT', 'PENDING_CHECK'] },
          }),
          data: { status: 'PENDING' },
        })
      );
    });

    it('rejects FRAUD_HOLD payment and cancels associated PENDING_CHECK order', async () => {
      const mockPayment = {
        id: 'pay_fraud_2',
        gatewayId: 'yoo_pay_456',
        amount: BigInt(5000),
        userId: 'usr_fraud_2',
        status: 'FRAUD_HOLD',
        gateway: 'yookassa',
      };

      vi.mocked(db.payment.findUnique).mockResolvedValue(mockPayment as any);
      vi.mocked(db.payment.update).mockResolvedValue({ ...mockPayment, status: 'CANCELED' } as any);
      vi.mocked(db.order.updateMany).mockResolvedValue({ count: 1 });

      const res = await rejectFraudHoldAction('pay_fraud_2', 'staff_operator_1', 'Фрод подтверждён');
      expect(res.success).toBe(true);
      expect(res.message).toBe('Платёж отклонён');

      expect(db.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_fraud_2' },
        data: { status: 'CANCELED' },
      });

      expect(db.order.updateMany).toHaveBeenCalledWith({
        where: {
          paymentId: 'pay_fraud_2',
          status: { in: ['PENDING_CHECK', 'AWAITING_PAYMENT'] },
        },
        data: { status: 'CANCELED' },
      });
    });
  });

  describe('10. SSRF Guard Carrier-Grade NAT & Redirect Boundary Protection', () => {
    it('blocks Carrier-Grade NAT (100.64.0.0/10) and Multicast ranges in isPublicIp', () => {
      expect(isPublicIp('100.64.0.1')).toBe(false);
      expect(isPublicIp('100.127.255.254')).toBe(false);
      expect(isPublicIp('100.63.255.255')).toBe(true); // Outside CGNAT
      expect(isPublicIp('100.128.0.1')).toBe(true); // Outside CGNAT
      expect(isPublicIp('224.0.0.1')).toBe(false); // Multicast
      expect(isPublicIp('240.0.0.1')).toBe(false); // Reserved
    });

    it('returns rawUrl safely when shortlink redirects to a private IP', async () => {
      const maliciousShortLink = 'https://bit.ly/fake-redirect';
      // If redirect target is private or invalid, resolveShortLink must not leak private IP
      const result = await resolveShortLink(maliciousShortLink);
      expect(result).toBe(maliciousShortLink);
    });
  });
});
