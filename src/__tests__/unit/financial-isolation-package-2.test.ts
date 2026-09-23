/**
 * @file financial-isolation-package-2.test.ts
 * @description Unit and Integration tests for Financial Isolation Package 2 (SDD-TDD 2026):
 * 1. [VULN-03] Telegram Smart Bind cross-tenant merge protection & money movement prevention
 * 2. [VULN-05] Escrow Quarantine tenant filtering in EscrowService
 * 3. [VULN-04] ManualBalanceAdjustment tenant isolation, operator access, and WalletOps propagation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb, sessionState, usersStore, adjustmentsStore } = vi.hoisted(() => {
  const sessionState = {
    current: null as {
      userId: string;
      email: string;
      role: string;
      tenantId?: string;
      allowedTenants?: string[];
    } | null,
  };

  const usersStore = new Map<string, any>();
  const adjustmentsStore = new Map<string, any>();

  const mockDb: any = {
    authToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (sessionState.current && where.id === sessionState.current.userId) {
          return {
            id: sessionState.current.userId,
            email: sessionState.current.email,
            role: sessionState.current.role,
            tenantId: sessionState.current.tenantId || 'smmplan',
            allowedTenants: sessionState.current.allowedTenants || [sessionState.current.tenantId || 'smmplan'],
            isActive: true,
            isDeleted: false,
            balance: BigInt(100000),
            staffRole: {
              permissions: [
                { section: 'BALANCE_REQUESTS', canView: true, canEdit: true },
                { section: 'BALANCE_APPROVALS', canView: true, canEdit: true },
                { section: 'BALANCE_STATS', canView: true, canEdit: true },
              ],
            },
          };
        }
        return usersStore.get(where.id) || null;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: any) => {
        if (sessionState.current && where.id === sessionState.current.userId) {
          return {
            id: sessionState.current.userId,
            email: sessionState.current.email,
            role: sessionState.current.role,
            tenantId: sessionState.current.tenantId || 'smmplan',
            allowedTenants: sessionState.current.allowedTenants || [sessionState.current.tenantId || 'smmplan'],
            isActive: true,
            isDeleted: false,
            balance: BigInt(100000),
            staffRole: {
              permissions: [
                { section: 'BALANCE_REQUESTS', canView: true, canEdit: true },
                { section: 'BALANCE_APPROVALS', canView: true, canEdit: true },
                { section: 'BALANCE_STATS', canView: true, canEdit: true },
              ],
            },
          };
        }
        const found = usersStore.get(where.id);
        if (!found) throw new Error(`User not found: ${where.id}`);
        return found;
      }),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    ticket: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    order: {
      updateMany: vi.fn(),
    },
    payment: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    ledgerEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    manualBalanceAdjustment: {
      create: vi.fn(async ({ data }: any) => {
        const item = { id: `adj_${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        adjustmentsStore.set(item.id, item);
        return item;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return adjustmentsStore.get(where.id) || null;
      }),
      findFirst: vi.fn(),
      findMany: vi.fn(async () => Array.from(adjustmentsStore.values())),
      count: vi.fn(async () => adjustmentsStore.size),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    adminAuditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockDb)),
  };

  return { mockDb, sessionState, usersStore, adjustmentsStore };
});

// ── Mock next/headers and session ──
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn((name: string) => {
      if (name === 'x_admin_tenant') return { value: 'smmplan' };
      return undefined;
    }),
    set: vi.fn(),
  }),
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn().mockImplementation(async () => {
    if (!sessionState.current) return null;
    return {
      userId: sessionState.current.userId,
      email: sessionState.current.email,
      role: sessionState.current.role,
      tenantId: sessionState.current.tenantId || 'smmplan',
      allowedTenants: sessionState.current.allowedTenants || [sessionState.current.tenantId || 'smmplan'],
    };
  }),
}));

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

vi.mock('@/services/financial/wallet-ops', () => ({
  WalletOps: {
    credit: vi.fn().mockResolvedValue({ success: true, balance: BigInt(5000), entry: { id: 'ledger-credit-1' } }),
    charge: vi.fn().mockResolvedValue({ success: true, balance: BigInt(0), entry: { id: 'ledger-charge-1' } }),
    adminAdjust: vi.fn().mockResolvedValue({ success: true, balance: BigInt(2000), entry: { id: 'ledger-adjust-1' } }),
  },
}));

vi.mock('@/lib/admin-audit', () => ({
  auditAdminAwaitable: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/notifications', () => ({
  sendAdminAlert: vi.fn(),
}));

vi.mock('@/services/admin/balance-policy.service', () => ({
  getEffectiveBalancePolicy: vi.fn().mockResolvedValue({
    id: 'policy_1',
    enabled: true,
    isActive: true,
    canRequestCredit: true,
    canRequestDebit: true,
    canApprove: true,
    canViewAll: true,
    canViewStats: true,
    maxCreditPerRequest: BigInt(1000000),
    maxDebitPerRequest: BigInt(1000000),
    maxApprovalPerRequest: BigInt(1000000),
    maxCreditPerDay: BigInt(5000000),
    maxDebitPerDay: BigInt(5000000),
    maxTotalPerDay: BigInt(10000000),
    requireTicket: false,
    requireOrderForDebit: false,
    blockDeletedTargets: true,
    blockBannedTargets: true,
    scopeType: 'ROLE',
  }),
  parsePolicyReasonCodes: vi.fn().mockReturnValue({
    allowedCreditReasonCodes: ['BONUS', 'COMPENSATION', 'PROMO'],
    allowedDebitReasonCodes: ['CHARGEBACK', 'MISTAKE_CORRECTION'],
    allowedTargetRoles: ['USER'],
  }),
}));

// Imports of units under test
import { getTelegramBindDetailsAction } from '@/actions/user/settings/telegram.action';
import { attachRoleHandlers } from '@/bot/constructors/role-handlers';
import { EscrowService } from '@/services/admin/escrow.service';
import {
  createBalanceAdjustmentRequestAction,
  approveBalanceAdjustmentAction,
  getBalanceAdjustmentsAction,
  requestManualBalanceAdjustmentAction,
  getManualBalanceAdjustmentsAction,
} from '@/actions/admin/balance-adjustments';
import {
  approveQuarantineAction,
  rejectQuarantineAction,
  requestCardRefundAction,
} from '@/actions/admin/users';
import { SettingsProvider } from '@/lib/settings';
import { WalletOps } from '@/services/financial/wallet-ops';
import { auditAdminAwaitable } from '@/lib/admin-audit';

describe('Financial Isolation Package 2 (SDD-TDD 2026 Suite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersStore.clear();
    adjustmentsStore.clear();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. [VULN-03] Telegram Smart Bind
  // ─────────────────────────────────────────────────────────────
  describe('1. [VULN-03] Telegram Smart Bind Tenant Isolation', () => {
    it('should explicitly save tenantId when generating bind token in getTelegramBindDetailsAction', async () => {
      sessionState.current = {
        userId: 'user-flux-1',
        email: 'flux@test.local',
        role: 'USER',
        tenantId: 'flux',
      };

      vi.spyOn(SettingsProvider, 'getTenantId').mockResolvedValue('flux');
      vi.spyOn(SettingsProvider, 'getContactAndLegalSettings').mockResolvedValue({
        TELEGRAM_SUPPORT_BOT: 'smmflux_support_bot',
      } as any);

      mockDb.authToken.create.mockResolvedValueOnce({ id: 'tok_123' });

      const result = await getTelegramBindDetailsAction();

      expect(result.success).toBe(true);
      expect(mockDb.authToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-flux-1',
            tenantId: 'flux',
          }),
        })
      );
    });

    it('should block cross-tenant account merge and prevent money movement in role-handlers.ts', async () => {
      let startHandler: ((ctx: any) => Promise<any>) | null = null;
      const fakeBot: any = {
        use: vi.fn(),
        start: vi.fn((handler) => {
          startHandler = handler;
        }),
        action: vi.fn(),
        command: vi.fn(),
        on: vi.fn(),
      };

      attachRoleHandlers(fakeBot, 'STORE_FULL', {
        botId: 'bot-smmplan-1',
        tenantId: 'smmplan',
        botName: 'SMMplan Test Bot',
      });

      expect(startHandler).toBeDefined();

      const fakeCtx: any = {
        from: { id: 998877 },
        payload: 'tg_bind_cross_tenant_token',
        reply: vi.fn().mockResolvedValue({}),
      };

      // Mock authToken exists and belongs to a FLUX user
      mockDb.authToken.findFirst.mockResolvedValueOnce({
        id: 'tok_valid',
        token: 'tg_bind_cross_tenant_token',
        userId: 'web_user_flux',
        tenantId: 'flux',
        used: false,
        expiresAt: new Date(Date.now() + 600000),
      });

      // Mock webUser is in FLUX
      usersStore.set('web_user_flux', {
        id: 'web_user_flux',
        tenantId: 'flux',
        email: 'client@flux.local',
        balance: BigInt(1000),
      });

      // Mock tempUser in Telegram is in SMMPLAN with positive balance
      mockDb.user.findFirst.mockResolvedValueOnce({
        id: 'temp_user_smmplan',
        tenantId: 'smmplan',
        email: 'tg_998877@smmplan.bot',
        telegramId: '998877',
        balance: BigInt(50000), // 500 RUB
      });

      await startHandler!(fakeCtx);

      // Verify cross-tenant merge was blocked:
      // 1. WalletOps.charge and credit were NOT called
      expect(WalletOps.charge).not.toHaveBeenCalled();
      expect(WalletOps.credit).not.toHaveBeenCalled();

      // 2. Reply reported failure or blocked attempt
      expect(fakeCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО'),
        expect.anything()
      );
    });

    it('should allow account merge when tenants match (smmplan == smmplan)', async () => {
      let startHandler: ((ctx: any) => Promise<any>) | null = null;
      const fakeBot: any = {
        use: vi.fn(),
        start: vi.fn((handler) => {
          startHandler = handler;
        }),
        action: vi.fn(),
        command: vi.fn(),
        on: vi.fn(),
      };

      attachRoleHandlers(fakeBot, 'STORE_FULL', {
        botId: 'bot-smmplan-1',
        tenantId: 'smmplan',
        botName: 'SMMplan Test Bot',
      });

      const fakeCtx: any = {
        from: { id: 112233 },
        payload: 'tg_bind_same_tenant_token',
        reply: vi.fn().mockResolvedValue({}),
      };

      mockDb.authToken.findFirst.mockResolvedValueOnce({
        id: 'tok_valid_same',
        token: 'tg_bind_same_tenant_token',
        userId: 'web_user_plan',
        tenantId: 'smmplan',
        used: false,
        expiresAt: new Date(Date.now() + 600000),
      });

      // Both users are in smmplan
      usersStore.set('web_user_plan', {
        id: 'web_user_plan',
        tenantId: 'smmplan',
        email: 'client@smmplan.pro',
        balance: BigInt(1000),
      });

      mockDb.user.findFirst.mockResolvedValueOnce({
        id: 'temp_user_plan',
        tenantId: 'smmplan',
        email: 'tg_112233@smmplan.bot',
        telegramId: '112233',
        balance: BigInt(2500),
      });

      mockDb.authToken.updateMany.mockResolvedValueOnce({ count: 1 });
      mockDb.ticket.updateMany.mockResolvedValueOnce({ count: 0 });
      mockDb.order.updateMany.mockResolvedValueOnce({ count: 0 });
      mockDb.payment.updateMany.mockResolvedValueOnce({ count: 0 });
      mockDb.user.update.mockResolvedValue({});

      await startHandler!(fakeCtx);

      // Money was safely transferred within the same tenant preserving BigInt precision
      expect(WalletOps.charge).toHaveBeenCalledWith(
        expect.anything(),
        'temp_user_plan',
        BigInt(2500),
        expect.anything(),
        expect.objectContaining({
          idempotencyKey: 'merge-debit-bot-temp_user_plan-web_user_plan-tok_valid_same',
          tenantId: 'smmplan',
        })
      );
      expect(WalletOps.credit).toHaveBeenCalledWith(
        expect.anything(),
        'web_user_plan',
        BigInt(2500),
        expect.anything(),
        expect.objectContaining({
          idempotencyKey: 'merge-credit-bot-temp_user_plan-web_user_plan-tok_valid_same',
          tenantId: 'smmplan',
        })
      );
      expect(fakeCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Аккаунт успешно привязан'),
        expect.anything()
      );
    });

    it('should block concurrent double-spend race condition when token is already claimed (updateMany count === 0)', async () => {
      let startHandler: ((ctx: any) => Promise<any>) | null = null;
      const fakeBot: any = {
        use: vi.fn(),
        start: vi.fn((handler) => {
          startHandler = handler;
        }),
        action: vi.fn(),
        command: vi.fn(),
        on: vi.fn(),
      };

      attachRoleHandlers(fakeBot, 'STORE_FULL', {
        botId: 'bot-smmplan-1',
        tenantId: 'smmplan',
        botName: 'SMMplan Test Bot',
      });

      const fakeCtx: any = {
        from: { id: 112233 },
        payload: 'tg_bind_race_token',
        reply: vi.fn().mockResolvedValue({}),
      };

      mockDb.authToken.findFirst.mockResolvedValueOnce({
        id: 'tok_race',
        token: 'tg_bind_race_token',
        userId: 'web_user_race',
        tenantId: 'smmplan',
        used: false,
        expiresAt: new Date(Date.now() + 600000),
      });

      usersStore.set('web_user_race', {
        id: 'web_user_race',
        tenantId: 'smmplan',
        email: 'race@smmplan.pro',
        balance: BigInt(0),
      });

      mockDb.user.findFirst.mockResolvedValueOnce({
        id: 'temp_user_race',
        tenantId: 'smmplan',
        email: 'tg_race@smmplan.bot',
        telegramId: '112233',
        balance: BigInt(5000),
      });

      // Simulate race condition: another concurrent process claimed the token first
      mockDb.authToken.updateMany.mockResolvedValueOnce({ count: 0 });

      await startHandler!(fakeCtx);

      // Money must NOT be moved because token update failed
      expect(WalletOps.charge).not.toHaveBeenCalled();
      expect(WalletOps.credit).not.toHaveBeenCalled();
      expect(fakeCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Токен привязки уже был использован'),
        expect.anything()
      );
    });

    it('should block merging staff account (role === SUPPORT) into web client', async () => {
      let startHandler: ((ctx: any) => Promise<any>) | null = null;
      const fakeBot: any = {
        use: vi.fn(),
        start: vi.fn((handler) => {
          startHandler = handler;
        }),
        action: vi.fn(),
        command: vi.fn(),
        on: vi.fn(),
      };

      attachRoleHandlers(fakeBot, 'STORE_FULL', {
        botId: 'bot-smmplan-1',
        tenantId: 'smmplan',
        botName: 'SMMplan Test Bot',
      });

      const fakeCtx: any = {
        from: { id: 777888 },
        payload: 'tg_bind_staff_token',
        reply: vi.fn().mockResolvedValue({}),
      };

      mockDb.authToken.findFirst.mockResolvedValueOnce({
        id: 'tok_staff',
        token: 'tg_bind_staff_token',
        userId: 'web_user_hacker',
        tenantId: 'smmplan',
        used: false,
        expiresAt: new Date(Date.now() + 600000),
      });

      usersStore.set('web_user_hacker', {
        id: 'web_user_hacker',
        tenantId: 'smmplan',
        email: 'hacker@smmplan.pro',
        role: 'USER',
        balance: BigInt(0),
      });

      // Target in Telegram is a staff member (SUPPORT)
      mockDb.user.findFirst.mockResolvedValueOnce({
        id: 'staff_user_tg',
        tenantId: 'smmplan',
        email: 'support_operator@smmplan.pro',
        telegramId: '777888',
        role: 'SUPPORT',
        balance: BigInt(100000),
      });

      await startHandler!(fakeCtx);

      expect(WalletOps.charge).not.toHaveBeenCalled();
      expect(WalletOps.credit).not.toHaveBeenCalled();
      expect(fakeCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Запрещено объединять служебные аккаунты персонала'),
        expect.anything()
      );
    });

    it('should respond with user-friendly error message when token is expired or invalid', async () => {
      let startHandler: ((ctx: any) => Promise<any>) | null = null;
      const fakeBot: any = {
        use: vi.fn(),
        start: vi.fn((handler) => {
          startHandler = handler;
        }),
        action: vi.fn(),
        command: vi.fn(),
        on: vi.fn(),
      };

      attachRoleHandlers(fakeBot, 'STORE_FULL', {
        botId: 'bot-smmplan-1',
        tenantId: 'smmplan',
        botName: 'SMMplan Test Bot',
      });

      const fakeCtx: any = {
        from: { id: 445566 },
        payload: 'tg_bind_expired_token',
        reply: vi.fn().mockResolvedValue({}),
      };

      // Token not found or expired
      mockDb.authToken.findFirst.mockResolvedValueOnce(null);

      await startHandler!(fakeCtx);

      expect(fakeCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Ссылка для привязки недействительна или срок её действия истёк'),
        expect.anything()
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. [VULN-05] Escrow Quarantine Filtering
  // ─────────────────────────────────────────────────────────────
  describe('2. [VULN-05] Escrow Quarantine Multi-Tenant Filtering', () => {
    const escrowService = new EscrowService();

    it('should filter quarantine entries by activeTenantId when specified', async () => {
      mockDb.ledgerEntry.findMany.mockResolvedValueOnce([
        { id: 'entry-plan-1', tenantId: 'smmplan', amount: BigInt(10000), userId: 'u1', status: 'QUARANTINE' },
      ]);
      mockDb.user.findMany.mockResolvedValueOnce([{ id: 'u1', email: 'u1@smmplan.pro' }]);

      const planEntries = await escrowService.getQuarantineEntries('smmplan');

      expect(mockDb.ledgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'QUARANTINE',
            tenantId: 'smmplan',
          },
        })
      );
      expect(planEntries.length).toBe(1);
      expect(planEntries[0].userEmail).toBe('u1@smmplan.pro');
    });

    it('should filter quarantine entries for flux tenant', async () => {
      mockDb.ledgerEntry.findMany.mockResolvedValueOnce([]);
      mockDb.user.findMany.mockResolvedValueOnce([]);

      await escrowService.getQuarantineEntries('flux');

      expect(mockDb.ledgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'QUARANTINE',
            tenantId: 'flux',
          },
        })
      );
    });

    it('should not filter tenantId when tenantId is "all"', async () => {
      mockDb.ledgerEntry.findMany.mockResolvedValueOnce([]);
      mockDb.user.findMany.mockResolvedValueOnce([]);

      await escrowService.getQuarantineEntries('all');

      expect(mockDb.ledgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'QUARANTINE',
          },
        })
      );
    });

    it('should reject approveQuarantineAction if staff has no access to the entry tenant', async () => {
      sessionState.current = {
        userId: 'admin-plan-1',
        email: 'admin@smmplan.pro',
        role: 'ADMIN',
        tenantId: 'smmplan',
        allowedTenants: ['smmplan'],
      };

      mockDb.ledgerEntry.findUnique.mockResolvedValueOnce({
        id: 'entry-flux-quarantine',
        tenantId: 'flux',
      });

      const fd = new FormData();
      fd.append('entryId', 'entry-flux-quarantine');

      const res = await approveQuarantineAction(fd);

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/нет прав на подтверждение карантина данного бренда/i);
    });

    it('should reject rejectQuarantineAction if staff has no access to the entry tenant', async () => {
      sessionState.current = {
        userId: 'admin-plan-1',
        email: 'admin@smmplan.pro',
        role: 'ADMIN',
        tenantId: 'smmplan',
        allowedTenants: ['smmplan'],
      };

      mockDb.ledgerEntry.findUnique.mockResolvedValueOnce({
        id: 'entry-flux-quarantine-2',
        tenantId: 'flux',
      });

      const fd = new FormData();
      fd.append('entryId', 'entry-flux-quarantine-2');

      const res = await rejectQuarantineAction(fd);

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/нет прав на отклонение карантина данного бренда/i);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. [VULN-04] ManualBalanceAdjustment Tenant Isolation
  // ─────────────────────────────────────────────────────────────
  describe('3. [VULN-04] ManualBalanceAdjustment Tenant Boundary & RBAC', () => {
    it('should reject adjustment request if operator does not have access to target user tenant', async () => {
      // Operator only has access to smmplan
      sessionState.current = {
        userId: 'staff-plan-1',
        email: 'staff@smmplan.pro',
        role: 'SUPPORT',
        tenantId: 'smmplan',
        allowedTenants: ['smmplan'],
      };

      // Target user is on flux
      usersStore.set('target-flux-user', {
        id: 'target-flux-user',
        email: 'client@flux.local',
        role: 'USER',
        balance: BigInt(5000),
        tenantId: 'flux',
        isDeleted: false,
        isActive: true,
      });

      const fd = new FormData();
      fd.append('userId', 'target-flux-user');
      fd.append('direction', 'CREDIT');
      fd.append('amount', '100.00');
      fd.append('reasonCode', 'BONUS');
      fd.append('reasonNote', 'Тестовый бонус клиенту');
      fd.append('idempotencyKey', 'a0000000-0000-0000-0000-000000000001');

      const res = await createBalanceAdjustmentRequestAction(fd);

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/нет доступа к управлению балансом/i);
    });

    it('should save tenantId from targetUser when request is created by authorized staff', async () => {
      // Operator has access to flux
      sessionState.current = {
        userId: 'staff-flux-1',
        email: 'staff@smmflux.ru',
        role: 'SUPPORT',
        tenantId: 'flux',
        allowedTenants: ['flux'],
      };

      usersStore.set('target-flux-user', {
        id: 'target-flux-user',
        email: 'client@flux.local',
        role: 'USER',
        balance: BigInt(5000),
        tenantId: 'flux',
        isDeleted: false,
        isActive: true,
      });

      mockDb.manualBalanceAdjustment.findMany.mockResolvedValueOnce([]); // today's usage
      mockDb.manualBalanceAdjustment.findFirst.mockResolvedValueOnce(null); // idempotency

      const fd = new FormData();
      fd.append('userId', 'target-flux-user');
      fd.append('direction', 'CREDIT');
      fd.append('amount', '100.00');
      fd.append('reasonCode', 'BONUS');
      fd.append('reasonNote', 'Тестовый бонус клиенту SMMflux');
      fd.append('idempotencyKey', 'a0000000-0000-0000-0000-000000000002');

      const res = await createBalanceAdjustmentRequestAction(fd);

      expect(res.success).toBe(true);
      expect(mockDb.manualBalanceAdjustment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'target-flux-user',
            tenantId: 'flux',
          }),
        })
      );
    });

    it('should block approval if approver does not have access to adjustment tenant', async () => {
      // Approver only has smmplan
      sessionState.current = {
        userId: 'approver-plan-1',
        email: 'approver@smmplan.pro',
        role: 'MANAGER',
        tenantId: 'smmplan',
        allowedTenants: ['smmplan'],
      };

      adjustmentsStore.set('adj_flux_999', {
        id: 'adj_flux_999',
        tenantId: 'flux',
        userId: 'target-flux-user',
        requestedBy: 'staff-other',
        amount: BigInt(10000),
        direction: 'CREDIT',
        reasonCode: 'BONUS',
        status: 'PENDING_APPROVAL',
        user: { id: 'target-flux-user', email: 'flux@test.local', tenantId: 'flux' },
        requester: { id: 'staff-other', email: 'other@test.local' },
      });

      const fd = new FormData();
      fd.append('id', 'adj_flux_999');

      const res = await approveBalanceAdjustmentAction(fd);

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/нет прав на утверждение заявок пользователей данного бренда/i);
      expect(WalletOps.credit).not.toHaveBeenCalled();
    });

    it('should propagate adjustment tenantId into WalletOps upon execution', async () => {
      // Approver has flux access
      sessionState.current = {
        userId: 'approver-flux-1',
        email: 'approver@smmflux.ru',
        role: 'OWNER',
        tenantId: 'flux',
        allowedTenants: ['flux'],
      };

      adjustmentsStore.set('adj_flux_100', {
        id: 'adj_flux_100',
        tenantId: 'flux',
        userId: 'target-flux-user',
        requestedBy: 'staff-flux-1',
        amount: BigInt(25000),
        direction: 'CREDIT',
        reasonCode: 'BONUS',
        status: 'PENDING_APPROVAL',
        user: { id: 'target-flux-user', email: 'flux@test.local', tenantId: 'flux' },
        requester: { id: 'staff-flux-1', email: 'staff@flux.local' },
      });

      usersStore.set('target-flux-user', {
        id: 'target-flux-user',
        email: 'flux@test.local',
        balance: BigInt(10000),
        isDeleted: false,
        isActive: true,
        role: 'USER',
        tenantId: 'flux',
      });

      const fd = new FormData();
      fd.append('id', 'adj_flux_100');

      const res = await approveBalanceAdjustmentAction(fd);

      expect(res.success).toBe(true);
      expect(WalletOps.credit).toHaveBeenCalledWith(
        expect.anything(),
        'target-flux-user',
        BigInt(25000),
        expect.anything(),
        expect.objectContaining({
          tenantId: 'flux',
          adminId: 'approver-flux-1',
        })
      );
    });

    it('should filter getBalanceAdjustmentsAction by resolvedTenant', async () => {
      sessionState.current = {
        userId: 'staff-plan-1',
        email: 'staff@smmplan.pro',
        role: 'SUPPORT',
        tenantId: 'smmplan',
        allowedTenants: ['smmplan'],
      };

      const fd = new FormData();
      // Staff tries to request flux, but their allowedTenants is smmplan
      fd.append('tenantId', 'flux');

      await getBalanceAdjustmentsAction(fd);

      expect(mockDb.manualBalanceAdjustment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'smmplan',
          }),
        })
      );
    });

    it('should pass tenantId to auditAdminAwaitable on adjustment request and approval', async () => {
      // Approver has flux access
      sessionState.current = {
        userId: 'approver-flux-1',
        email: 'approver@smmflux.ru',
        role: 'OWNER',
        tenantId: 'flux',
        allowedTenants: ['flux'],
      };

      adjustmentsStore.set('adj_flux_audit', {
        id: 'adj_flux_audit',
        tenantId: 'flux',
        userId: 'target-flux-user',
        requestedBy: 'approver-flux-1',
        amount: BigInt(30000),
        direction: 'CREDIT',
        reasonCode: 'BONUS',
        status: 'PENDING_APPROVAL',
        user: { id: 'target-flux-user', email: 'flux@test.local', tenantId: 'flux' },
        requester: { id: 'approver-flux-1', email: 'approver@smmflux.ru' },
      });

      usersStore.set('target-flux-user', {
        id: 'target-flux-user',
        email: 'flux@test.local',
        balance: BigInt(10000),
        isDeleted: false,
        isActive: true,
        role: 'USER',
        tenantId: 'flux',
      });

      const fd = new FormData();
      fd.append('id', 'adj_flux_audit');

      await approveBalanceAdjustmentAction(fd);

      expect(auditAdminAwaitable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BALANCE_ADJUSTMENT_EXECUTED',
          tenantId: 'flux',
        })
      );
    });

    it('should reject requestCardRefundAction if operator has no access to refund tenant and pass tenantId to audit log on success', async () => {
      // Staff with smmplan only
      sessionState.current = {
        userId: 'staff-plan-only',
        email: 'staff@smmplan.pro',
        role: 'SUPPORT',
        tenantId: 'smmplan',
        allowedTenants: ['smmplan'],
      };

      // Target user and payment on flux
      usersStore.set('target-flux-refund', {
        id: 'target-flux-refund',
        email: 'client@flux.local',
        role: 'USER',
        balance: BigInt(50000),
        tenantId: 'flux',
      });

      mockDb.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-flux-1',
        userId: 'target-flux-refund',
        amount: BigInt(50000),
        status: 'SUCCEEDED',
        gateway: 'yookassa',
        gatewayId: 'yoo-pay-1',
        tenantId: 'flux',
      });

      const fdFail = new FormData();
      fdFail.append('userId', 'target-flux-refund');
      fdFail.append('paymentId', 'pay-flux-1');
      fdFail.append('amountKopecks', '50000');
      fdFail.append('reason', 'Возврат клиенту');

      const failRes = await requestCardRefundAction(fdFail);
      expect(failRes.success).toBe(false);
      expect(failRes.error).toMatch(/нет доступа к возвратам платежей данного сайта\/бренда/i);

      // Now staff with flux access
      sessionState.current = {
        userId: 'staff-flux-only',
        email: 'staff@smmflux.ru',
        role: 'SUPPORT',
        tenantId: 'flux',
        allowedTenants: ['flux'],
      };

      mockDb.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-flux-1',
        userId: 'target-flux-refund',
        amount: BigInt(50000),
        status: 'SUCCEEDED',
        gateway: 'yookassa',
        gatewayId: 'yoo-pay-1',
        tenantId: 'flux',
      });

      mockDb.manualBalanceAdjustment.findFirst.mockResolvedValueOnce(null);

      const fdSuccess = new FormData();
      fdSuccess.append('userId', 'target-flux-refund');
      fdSuccess.append('paymentId', 'pay-flux-1');
      fdSuccess.append('amountKopecks', '50000');
      fdSuccess.append('reason', 'Возврат клиенту');

      const successRes = await requestCardRefundAction(fdSuccess);
      expect(successRes.success).toBe(true);
      expect(auditAdminAwaitable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CARD_REFUND_REQUESTED',
          tenantId: 'flux',
        })
      );
    });

    it('should provide compatible aliases requestManualBalanceAdjustmentAction and getManualBalanceAdjustmentsAction', () => {
      expect(typeof requestManualBalanceAdjustmentAction).toBe('function');
      expect(typeof getManualBalanceAdjustmentsAction).toBe('function');
      expect(requestManualBalanceAdjustmentAction).toBe(createBalanceAdjustmentRequestAction);
      expect(getManualBalanceAdjustmentsAction).toBe(getBalanceAdjustmentsAction);
    });
  });
});
