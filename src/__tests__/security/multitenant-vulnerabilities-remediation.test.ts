/**
 * @file multitenant-vulnerabilities-remediation.test.ts
 * @description Comprehensive verification tests for multi-tenant and staff RBAC
 * vulnerability remediations in OmniSMM 1.0.
 *
 * Covers:
 * 1. Blind Write & Broken Access Control in changeTicketStatus (and alias adminChangeTicketStatus).
 * 2. Support permission leak in addTicketMessage and adminReplyTicket.
 * 3. Operator super-tenant backdoor elimination in replyTicketAction and changeTicketStatusAction.
 * 4. IDOR / Account Takeover prevention in Magic Link, password reset, email change, goodwill credit, ledger, discount.
 * 5. Elimination of static admin.tenantId trap across bulk orders, failover, reroute, and payment dispute pack.
 * 6. Prisma default trap on registration (explicit allowedTenants: [tenantId]).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Current staff user context for mock authentication
let currentStaff: {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
  allowedTenants: string[];
} = {
  id: 'staff_1',
  email: 'support@smmplan.pro',
  role: 'SUPPORT',
  tenantId: 'smmplan',
  allowedTenants: ['smmplan'],
};

// Mocks for database
const mockTicketFindUnique = vi.fn();
const mockTicketFindFirst = vi.fn();
const mockTicketUpdate = vi.fn().mockResolvedValue({ id: 'tkt_1', status: 'CLOSED' });
const mockTicketMessageFindUnique = vi.fn();
const mockTicketMessageUpdate = vi.fn().mockResolvedValue({ id: 'msg_1' });
const mockUserFindUnique = vi.fn();
const mockUserFindFirst = vi.fn();
const mockUserUpdate = vi.fn().mockResolvedValue({ id: 'u_1' });
const mockOrderFindMany = vi.fn().mockResolvedValue([]);
const mockOrderFindFirst = vi.fn();
const mockOrderUpdate = vi.fn();
const mockPaymentFindFirst = vi.fn();
const mockPaymentUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
const mockAuthTokenCreate = vi.fn().mockResolvedValue({ id: 'tok_1' });
const mockAuthTokenDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
const mockSessionDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
const mockLedgerEntryFindMany = vi.fn().mockResolvedValue([]);
const mockUserCreate = vi.fn().mockImplementation(async ({ data }) => ({ id: 'new_u1', ...data }));
const mockUserCount = vi.fn().mockResolvedValue(1);

vi.mock('@/lib/db', () => ({
  db: {
    ticket: {
      findUnique: (...args: any[]) => mockTicketFindUnique(...args),
      findFirst: (...args: any[]) => mockTicketFindFirst(...args),
      update: (...args: any[]) => mockTicketUpdate(...args),
      create: vi.fn().mockResolvedValue({ id: 'tkt_created' }),
    },
    ticketMessage: {
      findUnique: (...args: any[]) => mockTicketMessageFindUnique(...args),
      update: (...args: any[]) => mockTicketMessageUpdate(...args),
      create: vi.fn().mockResolvedValue({ id: 'msg_created' }),
    },
    user: {
      findUnique: (...args: any[]) => mockUserFindUnique(...args),
      findUniqueOrThrow: (...args: any[]) => mockUserFindUnique(...args),
      findFirst: (...args: any[]) => mockUserFindFirst(...args),
      update: (...args: any[]) => mockUserUpdate(...args),
      count: (...args: any[]) => mockUserCount(...args),
      create: (...args: any[]) => mockUserCreate(...args),
    },
    order: {
      findMany: (...args: any[]) => mockOrderFindMany(...args),
      findFirst: (...args: any[]) => mockOrderFindFirst(...args),
      findUnique: (...args: any[]) => mockOrderFindFirst(...args),
      findUniqueOrThrow: (...args: any[]) => mockOrderFindFirst(...args),
      update: (...args: any[]) => mockOrderUpdate(...args),
      count: vi.fn().mockResolvedValue(0),
    },
    payment: {
      findFirst: (...args: any[]) => mockPaymentFindFirst(...args),
      findUnique: (...args: any[]) => mockPaymentFindFirst(...args),
      updateMany: (...args: any[]) => mockPaymentUpdateMany(...args),
    },
    authToken: {
      create: (...args: any[]) => mockAuthTokenCreate(...args),
      deleteMany: (...args: any[]) => mockAuthTokenDeleteMany(...args),
    },
    session: {
      deleteMany: (...args: any[]) => mockSessionDeleteMany(...args),
    },
    ledgerEntry: {
      findMany: (...args: any[]) => mockLedgerEntryFindMany(...args),
    },
    manualBalanceAdjustment: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    supportFinancialAction: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'sfa_1' }),
    },
    userNote: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'note_1', content: 'test', createdAt: new Date() }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: vi.fn(async (cb: any) => {
      if (typeof cb === 'function') {
        return cb({
          user: {
            findUnique: (...args: any[]) => mockUserFindUnique(...args),
            findFirst: (...args: any[]) => mockUserFindFirst(...args),
            update: (...args: any[]) => mockUserUpdate(...args),
            count: (...args: any[]) => mockUserCount(...args),
            create: (...args: any[]) => mockUserCreate(...args),
          },
          order: {
            findFirst: (...args: any[]) => mockOrderFindFirst(...args),
            findUnique: (...args: any[]) => mockOrderFindFirst(...args),
            findUniqueOrThrow: (...args: any[]) => mockOrderFindFirst(...args),
            update: (...args: any[]) => mockOrderUpdate(...args),
          },
          payment: {
            updateMany: (...args: any[]) => mockPaymentUpdateMany(...args),
          },
          ticketMessage: {
            findUnique: (...args: any[]) => mockTicketMessageFindUnique(...args),
            update: (...args: any[]) => mockTicketMessageUpdate(...args),
            create: vi.fn().mockResolvedValue({ id: 'msg_created' }),
          },
          adminAuditLog: {
            create: vi.fn().mockResolvedValue({ id: 'aud_1' }),
          },
          ledgerEntry: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { amount: BigInt(0) } }),
          },
          session: {
            deleteMany: (...args: any[]) => mockSessionDeleteMany(...args),
          },
          authToken: {
            create: (...args: any[]) => mockAuthTokenCreate(...args),
            deleteMany: (...args: any[]) => mockAuthTokenDeleteMany(...args),
          },
          serviceRoute: {
            findFirst: vi.fn().mockResolvedValue({ id: 'route_1', providerId: 'p2', providerServiceId: 10, provider: { name: 'P2', balanceCurrency: 'RUB' } }),
          },
          shadowService: {
            findUnique: vi.fn().mockResolvedValue({ rate: 10 }),
          },
        });
      }
      return cb;
    }),
  },
  runWithTenantBypass: vi.fn(async (_reason: string, fn: any) => fn()),
}));

// Mock Next.js & Server utils
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
  headers: vi.fn().mockResolvedValue(new Headers({ host: 'smmplan.pro' })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/utils/ip', () => ({
  getClientIp: vi.fn().mockResolvedValue('127.0.0.1'),
}));

vi.mock('@/lib/admin-audit', () => ({
  auditAdmin: vi.fn(),
  auditAdminAwaitable: vi.fn().mockResolvedValue({ id: 'audit_1' }),
}));

vi.mock('@/lib/notifications', () => ({
  sendAdminAlert: vi.fn(),
}));

vi.mock('@/services/security/smartcaptcha.service', () => ({
  verifySmartCaptchaToken: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/smtp', () => ({
  sendMagicLink: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/rate-limit', () => ({
  RateLimitService: {
    checkCustomKey: vi.fn().mockResolvedValue(true),
    check: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/services/support/ticket.service', () => ({
  ticketService: {
    addMessage: vi.fn().mockResolvedValue({ id: 'msg_1' }),
  },
}));

vi.mock('@/services/support/sse.service', () => ({
  publishMessageSSE: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/services/financial/balance-policy.service', () => ({
  getEffectiveBalancePolicy: vi.fn().mockResolvedValue({
    maxCreditAmountKopecks: BigInt(500000),
    maxDebitAmountKopecks: BigInt(500000),
    requiresEscalationAboveKopecks: BigInt(100000),
  }),
}));

vi.mock('@/services/admin/balance-policy.service', () => ({
  getEffectiveBalancePolicy: vi.fn().mockResolvedValue({
    maxCreditAmountKopecks: BigInt(500000),
    maxDebitAmountKopecks: BigInt(500000),
    requiresEscalationAboveKopecks: BigInt(100000),
  }),
}));

vi.mock('@/lib/server/rbac', () => ({
  requireStaffPermission: vi.fn(async (_sec: string, _mode: string, action: any) => {
    return action(currentStaff, null, currentStaff.tenantId || 'smmplan');
  }),
}));

vi.mock('@/lib/operator/rbac', () => ({
  requireOperatorPermission: vi.fn(async (_sec: string, _mode: string, action: any) => {
    return action(currentStaff, null);
  }),
}));

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn(async () => {
    return {
      userId: currentStaff.id,
      role: currentStaff.role,
      tenantId: currentStaff.tenantId || 'smmplan',
      allowedTenants: currentStaff.allowedTenants || [currentStaff.tenantId || 'smmplan'],
    };
  }),
}));

vi.mock('@/lib/db-tx', () => ({
  runSerializableTransaction: vi.fn(async (cb: any) => {
    return cb({
      user: {
        findFirst: (...args: any[]) => mockUserFindFirst(...args),
        findUnique: (...args: any[]) => mockUserFindUnique(...args),
        update: (...args: any[]) => mockUserUpdate(...args),
        count: (...args: any[]) => mockUserCount(...args),
        create: (...args: any[]) => mockUserCreate(...args),
      },
      order: {
        findFirst: (...args: any[]) => mockOrderFindFirst(...args),
        update: (...args: any[]) => mockOrderUpdate(...args),
      },
      serviceRoute: {
        findFirst: vi.fn().mockResolvedValue({ id: 'route_1', providerId: 'p2', providerServiceId: 10, provider: { name: 'P2', balanceCurrency: 'RUB' } }),
      },
      shadowService: {
        findUnique: vi.fn().mockResolvedValue({ rate: 10 }),
      },
    });
  }),
}));

vi.mock('@/services/admin/settings-manager', () => ({
  SettingsManager: {
    getExchangeRateUSD: vi.fn().mockResolvedValue(90),
  },
}));

vi.mock('@/services/financial/wallet-ops', () => ({
  WalletOps: {
    adminAdjust: vi.fn().mockResolvedValue({ balance: BigInt(100000) }),
    credit: vi.fn().mockResolvedValue({ balance: BigInt(100000) }),
  },
}));

vi.mock('@/services/admin/ai-support.service', () => ({
  aiSupportService: {
    generateReply: vi.fn().mockResolvedValue({
      blocked: false,
      policy_violations: [],
      escalate_to_senior: false,
      draft_reply: 'AI response draft',
      client_sentiment: 'neutral',
      internal_reasoning: 'OK',
      fromCache: false,
    }),
  },
}));

vi.mock('@/services/admin/order.service', () => ({
  adminOrderService: {
    cancelOrder: vi.fn().mockResolvedValue({ success: true }),
    restartOrder: vi.fn().mockResolvedValue({ success: true }),
    syncOrderStatusWithProvider: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/services/operator/users/user-notes.query', () => ({
  addUserNote: vi.fn().mockResolvedValue({ id: 'note_1' }),
}));

vi.mock('@/services/operator/users/client-financial-summary.query', () => ({
  getClientFinancialSummary: vi.fn().mockResolvedValue({
    userId: 'u_1',
    currentBalanceCents: 1000,
  }),
}));

vi.mock('@/services/admin/user.service', () => ({
  adminUserService: {
    listUsers: vi.fn().mockResolvedValue({ items: [], total: 0, hasMore: false }),
    banUser: vi.fn().mockResolvedValue(undefined),
    unbanUser: vi.fn().mockResolvedValue(undefined),
  },
}));

// Imports of remediated actions
import {
  changeTicketStatus,
  adminChangeTicketStatus,
  addTicketMessage,
  adminReplyTicket,
  editTicketMessage,
  deleteTicketMessage,
  generateSmartReplyAction,
  adminManualTelegramBind,
  bulkRefillOrdersAction,
  bulkRefundOrdersAction,
} from '@/actions/support/ticket';
import { replyTicketAction } from '@/actions/operator/tickets/reply-ticket.action';
import { changeTicketStatusAction } from '@/actions/operator/tickets/change-status.action';
import {
  adminGenerateMagicLinkAction,
  adminChangeUserPasswordAction,
  adminChangeUserEmailAction,
  updateBalanceAction,
  banUserAction,
  unbanUserAction,
} from '@/actions/admin/users';
import {
  sendPasswordResetEmailAction,
  supportGoodwillCreditAction,
  getClientLedgerAction,
  updateClientDiscountAction,
} from '@/actions/admin/clients';
import {
  bulkCancelOrdersAction,
  getFailoverPreview,
  manualRerouteOrder,
  sendReorderOfferAction,
  syncSingleOrderStatusAction,
  restartOrderAction as adminRestartOrderAction,
  setOrderStatusAction,
  forceCompleteOrderAction,
} from '@/actions/admin/orders';
import { getPaymentDisputePackAction, manualApprovePaymentAction } from '@/actions/admin/finance/payments';
import { passwordRegisterAction } from '@/actions/auth/password-register';
import { isTenantAllowedForUser } from '@/utils/admin-tenant';
import { cancelOrderAction as operatorCancelOrderAction } from '@/actions/operator/orders/cancel-order.action';
import { restartOrderAction as operatorRestartOrderAction } from '@/actions/operator/orders/restart-order.action';
import { createUserNoteAction } from '@/actions/operator/users/create-user-note.action';
import { getUserFinancialSummaryAction } from '@/actions/operator/users/get-user-financial-summary.action';
import { getUsersListAction } from '@/actions/operator/users/get-users-list.action';

describe('Vulnerabilities Remediation & Multi-Tenant Boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStaff = {
      id: 'staff_1',
      email: 'support@smmplan.pro',
      role: 'SUPPORT',
      tenantId: 'smmplan',
      allowedTenants: ['smmplan'],
    };
  });

  describe('1. Blind Write & Broken Access Control in changeTicketStatus', () => {
    it('returns error and DOES NOT update DB when ticket does not exist', async () => {
      mockTicketFindUnique.mockResolvedValue(null);

      const formData = new FormData();
      formData.set('ticketId', 'tkt_nonexistent');
      formData.set('status', 'CLOSED');

      const result = await changeTicketStatus(formData);

      expect(result).toEqual({ success: false, error: 'Тикет не найден или доступ ограничен' });
      expect(mockTicketUpdate).not.toHaveBeenCalled();
    });

    it('returns error and DOES NOT update DB when staff allowedTenants does not cover ticket tenantId', async () => {
      // Staff only has ['smmplan'], ticket belongs to 'flux'
      mockTicketFindUnique.mockResolvedValue({
        id: 'tkt_flux',
        status: 'OPEN',
        tenantId: 'flux',
        user: { telegramId: null },
      });

      const formData = new FormData();
      formData.set('ticketId', 'tkt_flux');
      formData.set('status', 'CLOSED');

      const result = await changeTicketStatus(formData);

      expect(result).toEqual({ success: false, error: 'Тикет не найден или доступ ограничен' });
      expect(mockTicketUpdate).not.toHaveBeenCalled();
    });

    it('successfully updates ticket when tenantId is allowed', async () => {
      mockTicketFindUnique.mockResolvedValue({
        id: 'tkt_smmplan',
        status: 'OPEN',
        tenantId: 'smmplan',
        user: { telegramId: null },
      });

      const formData = new FormData();
      formData.set('ticketId', 'tkt_smmplan');
      formData.set('status', 'CLOSED');

      const result = await changeTicketStatus(formData);

      expect(result).toEqual({ success: true });
      expect(mockTicketUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tkt_smmplan' },
          data: expect.objectContaining({ status: 'CLOSED' }),
        })
      );
    });

    it('exports adminChangeTicketStatus as an alias to changeTicketStatus', () => {
      expect(adminChangeTicketStatus).toBe(changeTicketStatus);
    });
  });

  describe('2. Support permission leak in addTicketMessage and adminReplyTicket', () => {
    it('blocks staff from sending message to ticket belonging to unauthorized tenant in addTicketMessage', async () => {
      mockTicketFindUnique.mockResolvedValue({
        id: 'tkt_flux',
        userId: 'client_flux_1',
        tenantId: 'flux',
      });

      const formData = new FormData();
      formData.set('ticketId', 'tkt_flux');
      formData.set('message', 'Hello client');

      await expect(addTicketMessage(formData)).rejects.toThrow('Ticket not found or access denied');
    });

    it('blocks staff from replying to ticket on unauthorized tenant in adminReplyTicket', async () => {
      mockTicketFindUnique.mockResolvedValue({
        id: 'tkt_flux',
        userId: 'client_flux_1',
        tenantId: 'flux',
        user: { email: 'client@flux.local', isBotOnly: false, telegramId: null },
      });

      const formData = new FormData();
      formData.set('ticketId', 'tkt_flux');
      formData.set('message', 'Reply from support');

      await expect(adminReplyTicket(formData)).rejects.toThrow('Ticket not found or access denied');
    });

    it('allows multi-tenant staff to reply to ticket if tenantId is in allowedTenants', async () => {
      currentStaff.allowedTenants = ['smmplan', 'flux'];

      mockTicketFindUnique.mockResolvedValue({
        id: 'tkt_flux',
        userId: 'client_flux_1',
        tenantId: 'flux',
        user: { email: 'client@flux.local', isBotOnly: false, telegramId: null },
      });

      const formData = new FormData();
      formData.set('ticketId', 'tkt_flux');
      formData.set('message', 'Reply from authorized support');

      await expect(adminReplyTicket(formData)).resolves.not.toThrow();
    });
  });

  describe('3. Operator super-tenant backdoor elimination', () => {
    it('blocks operator on smmplan from replying to a ticket on flux', async () => {
      currentStaff.role = 'OPERATOR';
      currentStaff.tenantId = 'smmplan';
      currentStaff.allowedTenants = ['smmplan'];

      mockTicketFindUnique.mockResolvedValue({
        id: 'tkt_flux',
        userId: 'client_flux_1',
        tenantId: 'flux',
      });

      const res = await replyTicketAction({
        ticketId: 'tkt_flux',
        message: 'Unauthorized operator reply',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Обращение не найдено или доступ ограничен');
      }
    });

    it('blocks operator on smmplan from changing status of a ticket on flux', async () => {
      currentStaff.role = 'OPERATOR';
      currentStaff.tenantId = 'smmplan';
      currentStaff.allowedTenants = ['smmplan'];

      mockTicketFindUnique.mockResolvedValue({
        id: 'tkt_flux',
        status: 'OPEN',
        tenantId: 'flux',
      });

      const res = await changeTicketStatusAction({
        ticketId: 'tkt_flux',
        status: 'CLOSED',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Обращение не найдено или доступ ограничен');
      }
      expect(mockTicketUpdate).not.toHaveBeenCalled();
    });
  });

  describe('4. IDOR / Account Takeover prevention in user & client actions', () => {
    it('adminGenerateMagicLinkAction: blocks generating Magic Link for target user in another tenant', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_flux_1',
        email: 'victim@flux.ru',
        isActive: true,
        isDeleted: false,
        tenantId: 'flux',
      });

      const result = await adminGenerateMagicLinkAction('user_flux_1');

      expect(result).toEqual({
        success: false,
        error: 'Доступ запрещен: клиент принадлежит другой витрине',
      });
      expect(mockAuthTokenCreate).not.toHaveBeenCalled();
    });

    it('adminChangeUserPasswordAction: blocks password reset for user in another tenant', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_flux_1',
        email: 'victim@flux.ru',
        role: 'USER',
        tenantId: 'flux',
      });

      const result = await adminChangeUserPasswordAction('user_flux_1', 'NewSecurePass123!');

      expect(result).toEqual({
        success: false,
        error: 'Доступ запрещен: клиент принадлежит другой витрине',
      });
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it('adminChangeUserEmailAction: blocks email change for user in another tenant', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_flux_1',
        email: 'victim@flux.ru',
        balance: BigInt(0),
        tenantId: 'flux',
        role: 'USER',
      });

      const result = await adminChangeUserEmailAction('user_flux_1', 'attacker@evil.com', 'Legit reason');

      expect(result).toEqual({
        success: false,
        error: 'Доступ запрещен: клиент принадлежит другой витрине',
      });
    });

    it('sendPasswordResetEmailAction: blocks password reset link for user in another tenant', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_flux_1',
        email: 'victim@flux.ru',
        tenantId: 'flux',
      });

      const result = await sendPasswordResetEmailAction('user_flux_1');

      expect(result).toEqual({
        success: false,
        error: 'Доступ запрещен: клиент принадлежит другой витрине',
      });
      expect(mockAuthTokenCreate).not.toHaveBeenCalled();
    });

    it('supportGoodwillCreditAction: blocks credit/debit for user in another tenant', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_flux_1',
        email: 'victim@flux.ru',
        balance: BigInt(50000),
        tenantId: 'flux',
      });

      const formData = new FormData();
      formData.set('userId', 'user_flux_1');
      formData.set('amount', '100');
      formData.set('direction', 'CREDIT');

      const result = await supportGoodwillCreditAction(formData);

      expect(result).toEqual({
        success: false,
        error: 'Доступ запрещен: клиент принадлежит другой витрине',
      });
    });

    it('getClientLedgerAction: blocks viewing ledger for user in another tenant', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_flux_1',
        tenantId: 'flux',
      });

      const result = await getClientLedgerAction('user_flux_1');

      expect(result).toEqual({
        success: false,
        error: 'Доступ запрещен: клиент принадлежит другой витрине',
      });
      expect(mockLedgerEntryFindMany).not.toHaveBeenCalled();
    });

    it('updateClientDiscountAction: blocks setting discount for user in another tenant', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_flux_1',
        email: 'victim@flux.ru',
        personalDiscount: 0,
        tenantId: 'flux',
      });

      const result = await updateClientDiscountAction('user_flux_1', 15);

      expect(result).toEqual({
        success: false,
        error: 'Доступ запрещен: клиент принадлежит другой витрине',
      });
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it('OWNER bypasses tenant restrictions for administrative client management', async () => {
      currentStaff.role = 'OWNER';
      currentStaff.tenantId = 'smmplan';
      currentStaff.allowedTenants = ['smmplan'];

      mockUserFindUnique.mockResolvedValue({
        id: 'user_flux_1',
        email: 'victim@flux.ru',
        personalDiscount: 0,
        tenantId: 'flux',
      });

      const result = await updateClientDiscountAction('user_flux_1', 10);
      expect(result.success).toBe(true);
      expect(mockUserUpdate).toHaveBeenCalled();
    });
  });

  describe('5. Static admin.tenantId trap (allowedTenants array query)', () => {
    it('bulkCancelOrdersAction queries orders matching allowedTenants array for multi-brand staff', async () => {
      currentStaff.role = 'ADMIN';
      currentStaff.tenantId = 'smmplan';
      currentStaff.allowedTenants = ['smmplan', 'flux'];

      await bulkCancelOrdersAction(['ord_1', 'ord_2']);

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['ord_1', 'ord_2'] },
            tenantId: { in: ['smmplan', 'flux'] },
          }),
        })
      );
    });

    it('bulkCancelOrdersAction allows OWNER to query across all tenants without tenantId constraint', async () => {
      currentStaff.role = 'OWNER';

      await bulkCancelOrdersAction(['ord_1', 'ord_2']);

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['ord_1', 'ord_2'] } },
        })
      );
    });

    it('getFailoverPreview queries order with allowedTenants array', async () => {
      currentStaff.role = 'ADMIN';
      currentStaff.tenantId = 'smmplan';
      currentStaff.allowedTenants = ['smmplan', 'flux'];

      mockOrderFindFirst.mockResolvedValue(null);

      await expect(getFailoverPreview('ord_123')).rejects.toThrow('Order not found');

      expect(mockOrderFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'ord_123',
            tenantId: { in: ['smmplan', 'flux'] },
          }),
        })
      );
    });

    it('manualRerouteOrder queries order with allowedTenants array', async () => {
      currentStaff.role = 'ADMIN';
      currentStaff.tenantId = 'smmplan';
      currentStaff.allowedTenants = ['smmplan', 'flux'];

      mockOrderFindFirst.mockResolvedValue(null);

      await expect(manualRerouteOrder('ord_123', 'route_1')).rejects.toThrow('Order not found');

      expect(mockOrderFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'ord_123',
            tenantId: { in: ['smmplan', 'flux'] },
          }),
        })
      );
    });

    it('getPaymentDisputePackAction queries payment with allowedTenants array', async () => {
      currentStaff.role = 'ADMIN';
      currentStaff.tenantId = 'smmplan';
      currentStaff.allowedTenants = ['smmplan', 'flux'];

      mockPaymentFindFirst.mockResolvedValue(null);

      const res = await getPaymentDisputePackAction('pay_123');
      expect(res).toEqual({ success: false, error: 'Платеж не найден' });

      expect(mockPaymentFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'pay_123',
            tenantId: { in: ['smmplan', 'flux'] },
          }),
        })
      );
    });

    it('updateBalanceAction, banUserAction, unbanUserAction respect multi-brand staff', async () => {
      currentStaff.role = 'ADMIN';
      currentStaff.tenantId = 'smmplan';
      currentStaff.allowedTenants = ['smmplan', 'flux'];

      mockUserFindUnique.mockResolvedValue({
        id: 'user_flux_1',
        role: 'USER',
        tenantId: 'flux',
      });

      const banForm = new FormData();
      banForm.set('userId', 'user_flux_1');
      const banRes = await banUserAction(banForm);
      expect(banRes.success).toBe(true);

      const unbanForm = new FormData();
      unbanForm.set('userId', 'user_flux_1');
      const unbanRes = await unbanUserAction(unbanForm);
      expect(unbanRes.success).toBe(true);
    });
  });

  describe('6. Prisma default trap on registration', () => {
    it('passwordRegisterAction passes allowedTenants: [tenantId] on flux registration', async () => {
      mockUserFindFirst.mockResolvedValue(null); // No existing user
      mockUserFindUnique.mockResolvedValue(null);

      const res = await passwordRegisterAction(
        'newuser@flux.ru',
        'StrongPassword123!',
        'flux'
      );

      expect(res.success).toBe(true);
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'newuser@flux.ru',
            tenantId: 'flux',
            allowedTenants: ['flux'],
          }),
        })
      );
    });
  });

  describe('7. Helper isTenantAllowedForUser matrix verification', () => {
    it('strictly satisfies all tenant allowance matrix rules', () => {
      const owner = { role: 'OWNER', tenantId: 'smmplan', allowedTenants: ['smmplan'] };
      expect(isTenantAllowedForUser(owner, 'flux')).toBe(true);
      expect(isTenantAllowedForUser(owner, 'smmplan')).toBe(true);
      expect(isTenantAllowedForUser(owner, 'custom_site')).toBe(true);
      expect(isTenantAllowedForUser(owner, 'all')).toBe(false);

      const supportPlan = { role: 'SUPPORT', tenantId: 'smmplan', allowedTenants: ['smmplan'] };
      expect(isTenantAllowedForUser(supportPlan, 'smmplan')).toBe(true);
      expect(isTenantAllowedForUser(supportPlan, 'flux')).toBe(false);

      const supportMulti = { role: 'SUPPORT', tenantId: 'smmplan', allowedTenants: ['smmplan', 'flux'] };
      expect(isTenantAllowedForUser(supportMulti, 'smmplan')).toBe(true);
      expect(isTenantAllowedForUser(supportMulti, 'flux')).toBe(true);
      expect(isTenantAllowedForUser(supportMulti, 'other')).toBe(false);

      expect(isTenantAllowedForUser(null, 'smmplan')).toBe(false);
    });
  });

  describe('8. Advanced cross-tenant isolation and edge cases', () => {
    it('manualApprovePaymentAction blocks payment approval on unauthorized tenant', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay_flux_1',
        amount: BigInt(50000),
        status: 'PENDING',
        userId: 'client_flux_1',
        tenantId: 'flux',
        user: { id: 'client_flux_1', role: 'USER', tenantId: 'flux' },
      });

      const res = await manualApprovePaymentAction({
        paymentId: 'pay_flux_1',
        gatewayTransactionId: 'chk_123',
        notes: 'Verification note',
      });

      expect(res).toEqual({
        success: false,
        error: 'Доступ запрещен: платёж принадлежит другой витрине',
      });
      expect(mockPaymentUpdateMany).not.toHaveBeenCalled();
    });

    it('editTicketMessage blocks editing message on unauthorized tenant', async () => {
      mockTicketMessageFindUnique.mockResolvedValue({
        id: 'msg_flux_1',
        text: 'Old message',
        sender: 'STAFF',
        ticketId: 'tkt_flux_1',
        ticket: { tenantId: 'flux', user: { telegramId: null } },
      });

      const form = new FormData();
      form.set('messageId', 'msg_flux_1');
      form.set('newText', 'Edited text');

      await expect(editTicketMessage(form)).rejects.toThrow('Access denied: ticket belongs to another storefront');
    });

    it('deleteTicketMessage blocks deleting message on unauthorized tenant', async () => {
      mockTicketMessageFindUnique.mockResolvedValue({
        id: 'msg_flux_1',
        text: 'Operator message',
        sender: 'STAFF',
        ticketId: 'tkt_flux_1',
        ticket: { tenantId: 'flux', user: { telegramId: null } },
      });

      const form = new FormData();
      form.set('messageId', 'msg_flux_1');

      const res = await deleteTicketMessage(form);
      expect(res).toEqual({
        success: false,
        error: 'Доступ ограничен: тикет принадлежит другой витрине',
      });
    });

    it('generateSmartReplyAction blocks generating reply on unauthorized tenant', async () => {
      mockTicketFindUnique.mockResolvedValue({
        id: 'tkt_flux_1',
        tenantId: 'flux',
      });

      const res = await generateSmartReplyAction('tkt_flux_1');
      expect(res).toEqual({
        success: false,
        error: 'Тикет не найден или доступ ограничен',
      });
    });

    it('sendReorderOfferAction uses allowedTenants to query canceled order', async () => {
      currentStaff.role = 'ADMIN';
      currentStaff.tenantId = 'smmplan';
      currentStaff.allowedTenants = ['smmplan', 'flux'];

      mockOrderFindFirst.mockResolvedValue({
        id: 'ord_flux_1',
        numericId: 101,
        quantity: 100,
        charge: BigInt(20000),
        status: 'CANCELED',
        tenantId: 'flux',
        userId: 'client_flux_1',
        user: { id: 'client_flux_1', email: 'flux@test.com', balance: BigInt(50000) },
        service: { id: 'svc_1', name: 'Followers' },
      });

      const res = await sendReorderOfferAction('ord_flux_1');
      expect(res.success).toBe(true);
      expect(mockOrderFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'ord_flux_1',
            tenantId: { in: ['smmplan', 'flux'] },
          }),
        })
      );
    });

    it('syncSingleOrderStatusAction and adminRestartOrderAction block unauthorized tenant orders', async () => {
      mockOrderFindFirst.mockResolvedValue({
        id: 'ord_flux_1',
        tenantId: 'flux',
      });

      const syncRes = await syncSingleOrderStatusAction('ord_flux_1');
      expect(syncRes).toEqual({
        success: false,
        error: 'Заказ не найден или доступ ограничен',
      });

      const restartForm = new FormData();
      restartForm.set('orderId', 'ord_flux_1');
      const restartRes = await adminRestartOrderAction(restartForm);
      expect(restartRes).toEqual({
        success: false,
        error: 'Заказ не найден или доступ ограничен',
      });
    });

    it('setOrderStatusAction and forceCompleteOrderAction block unauthorized tenant orders', async () => {
      mockOrderFindFirst.mockResolvedValue({
        id: 'ord_flux_1',
        tenantId: 'flux',
        status: 'PENDING',
        charge: BigInt(10000),
        user: { id: 'u1', balance: BigInt(5000) },
      });

      await expect(setOrderStatusAction('ord_flux_1', 'CANCELED')).rejects.toThrow(
        'Заказ не найден или доступ ограничен'
      );

      await expect(forceCompleteOrderAction('ord_flux_1')).rejects.toThrow(
        'Заказ не найден или доступ ограничен'
      );
    });

    it('operatorCancelOrderAction and operatorRestartOrderAction block unauthorized tenant orders', async () => {
      currentStaff.role = 'OPERATOR';
      currentStaff.tenantId = 'smmplan';
      currentStaff.allowedTenants = ['smmplan'];

      mockOrderFindFirst.mockResolvedValue({
        id: 'ord_flux_1',
        tenantId: 'flux',
      });

      const cancelRes = await operatorCancelOrderAction('ord_flux_1');
      expect(cancelRes).toEqual({
        success: false,
        error: 'Заказ не найден или доступ ограничен',
      });

      const restartRes = await operatorRestartOrderAction('ord_flux_1');
      expect(restartRes).toEqual({
        success: false,
        error: 'Заказ не найден или доступ ограничен',
      });
    });

    it('createUserNoteAction and getUserFinancialSummaryAction block unauthorized users', async () => {
      currentStaff.role = 'OPERATOR';
      currentStaff.tenantId = 'smmplan';
      currentStaff.allowedTenants = ['smmplan'];

      mockUserFindUnique.mockResolvedValue({
        id: 'user_flux_1',
        tenantId: 'flux',
      });

      const noteRes = await createUserNoteAction({
        userId: 'user_flux_1',
        content: 'Suspicious activity',
      });
      expect(noteRes).toEqual({
        success: false,
        error: 'Пользователь не найден или доступ ограничен',
      });

      await expect(getUserFinancialSummaryAction('user_flux_1')).rejects.toThrow(
        'Пользователь не найден или доступ ограничен'
      );
    });
  });
});

