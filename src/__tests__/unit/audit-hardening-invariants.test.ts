import { describe, it, expect, vi } from 'vitest';
import { WalletOps, WalletInsufficientFundsError } from '@/services/financial/wallet-ops';
import { OrderRouteEvaluator } from '@/workers/processors/order/order-route-evaluator';
import { RefundPolicyService } from '@/services/financial/refund-policy.service';
import type { OrderWithRelations } from '@/workers/processors/order/types';
import type { PrioritizedRoute } from '@/services/providers/smart-routing.service';

describe('Audit Hardening Invariants: TOCTOU, Ledger-First & MockProvider Guards', () => {
  describe('1. WalletOps.adminAdjust Atomic TOCTOU Guard', () => {
    it('MUST throw WalletInsufficientFundsError when balance < abs(rawCents) on negative adjustment', async () => {
      const mockTx: any = {
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 'user-toctou-1', tenantId: 'smmplan', balance: BigInt(500) }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // 0 rows updated because balance < abs(rawCents)
          update: vi.fn(),
        },
        ledgerEntry: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'ledger-entry-1' }),
        },
      };

      await expect(
        WalletOps.adminAdjust(mockTx, 'user-toctou-1', BigInt(-1000), 'Deduction with insufficient funds')
      ).rejects.toThrow(WalletInsufficientFundsError);

      expect(mockTx.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-toctou-1', balance: { gte: BigInt(1000) } },
        data: { balance: { increment: BigInt(-1000) } },
      });
      // Ensure unconditional update was NEVER called
      expect(mockTx.user.update).not.toHaveBeenCalled();
    });

    it('MUST successfully update balance when balance >= abs(rawCents) on negative adjustment', async () => {
      const mockTx: any = {
        user: {
          findUnique: vi.fn()
            .mockResolvedValueOnce({ id: 'user-toctou-2', tenantId: 'smmplan' }) // initial check
            .mockResolvedValueOnce({ balance: BigInt(1500) }), // after update check
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: vi.fn(),
        },
        ledgerEntry: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'ledger-entry-2' }),
        },
      };

      const res = await WalletOps.adminAdjust(mockTx, 'user-toctou-2', BigInt(-500), 'Valid deduction');

      expect(res.success).toBe(true);
      expect(res.balance).toBe(BigInt(1500));
      expect(mockTx.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-toctou-2', balance: { gte: BigInt(500) } },
        data: { balance: { increment: BigInt(-500) } },
      });
    });
  });

  describe('2. WalletOps.quarantine Ledger-First Invariant', () => {
    it('MUST create ledgerEntry BEFORE updating quarantineBalance', async () => {
      const callOrder: string[] = [];
      const mockTx: any = {
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 'user-quar-1', tenantId: 'smmplan' }),
          update: vi.fn().mockImplementation(async () => {
            callOrder.push('user.update');
            return { quarantineBalance: BigInt(1000) };
          }),
        },
        ledgerEntry: {
          create: vi.fn().mockImplementation(async () => {
            callOrder.push('ledgerEntry.create');
            return { id: 'ledger-quarantine-1' };
          }),
        },
      };

      await WalletOps.quarantineAdd(mockTx, 'user-quar-1', BigInt(1000), 'Quarantine test');

      expect(callOrder).toEqual(['ledgerEntry.create', 'user.update']);
    });
  });

  describe('3. OrderRouteEvaluator Live MockProvider Protection', () => {
    it('MUST reject MockProvider route for real live production orders (!order.isTest)', async () => {
      const liveOrder: Partial<OrderWithRelations> = {
        id: 'live-order-1',
        numericId: 2203,
        isTest: false,
        environmentMode: 'PRODUCTION',
        quantity: 1000,
        link: 'https://t.me/boost/channel',
        serviceId: 'svc-boost-1',
        charge: BigInt(10000),
      };

      const mockRoute: Partial<PrioritizedRoute> = {
        providerId: 'prov-mock-1',
        providerServiceId: 'mock_boost_7d',
        provider: {
          id: 'prov-mock-1',
          name: 'Mock Provider (Песочница API)',
          apiUrl: 'http://localhost:3000/api/dev/mock-provider',
          apiKey: 'mock-key',
          balanceCurrency: 'RUB',
        } as any,
      };

      const check = await OrderRouteEvaluator.verifyRouteCapabilitiesAndMargin(
        liveOrder as OrderWithRelations,
        mockRoute as PrioritizedRoute,
        'prov-mock-1'
      );

      expect(check.isCompatible).toBe(false);
      expect(check.reason).toContain('Защитный барьер: боевой заказ #2203 не может быть отправлен в тестовую песочницу');
    });

    it('MUST allow MockProvider route when order is explicitly a test order (order.isTest === true)', async () => {
      const testOrder: Partial<OrderWithRelations> = {
        id: 'test-order-1',
        numericId: 9999,
        isTest: true,
        environmentMode: 'SANDBOX',
        quantity: 100,
        link: 'https://t.me/boost/channel',
        serviceId: 'svc-boost-test',
        charge: BigInt(100),
      };

      const mockRoute: Partial<PrioritizedRoute> = {
        providerId: 'prov-mock-1',
        providerServiceId: 'mock_boost_7d',
        provider: {
          id: 'prov-mock-1',
          name: 'Mock Provider (Песочница API)',
          apiUrl: 'http://localhost:3000/api/dev/mock-provider',
          apiKey: 'mock-key',
          balanceCurrency: 'RUB',
        } as any,
      };

      const check = await OrderRouteEvaluator.verifyRouteCapabilitiesAndMargin(
        testOrder as OrderWithRelations,
        mockRoute as PrioritizedRoute,
        'prov-mock-1'
      );

      expect(check.isCompatible).toBe(true);
    });
  });

  describe('4. RefundPolicyService BigInt Precision & Guard against Over-Refund', () => {
    it('MUST process refund with BigInt charge and enforce previousRefunds limit', async () => {
      const mockTx: any = {
        ledgerEntry: {
          findMany: vi.fn().mockResolvedValue([
            { amount: BigInt(3000), idempotencyKey: 'refund_ord_1_part_1' },
          ]),
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'ledger-refund-1' }),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 'usr-1', balance: BigInt(10000), totalSpent: BigInt(5000), tenantId: 'smmplan' }),
          update: vi.fn().mockResolvedValue({ balance: BigInt(12000) }),
        },
      };

      // Order total charge was 5000 cents (50.00 RUB), previously refunded 3000 cents (30.00 RUB).
      // On CANCELED, remaining available refund is 2000 cents (20.00 RUB).
      const res = await RefundPolicyService.processRefund(
        {
          id: 'ord_1',
          userId: 'usr-1',
          charge: BigInt(5000),
          quantity: 100,
          remains: 100,
          status: 'CANCELED',
        },
        'Customer cancel',
        mockTx
      );

      expect(res).not.toBeNull();
      expect(res?.success).toBe(true);
    });

    it('MUST return null when order is already fully refunded', async () => {
      const mockTx: any = {
        ledgerEntry: {
          findMany: vi.fn().mockResolvedValue([
            { amount: BigInt(5000), idempotencyKey: 'refund_ord_2' },
          ]),
        },
      };

      const res = await RefundPolicyService.processRefund(
        {
          id: 'ord_2',
          userId: 'usr-2',
          charge: BigInt(5000),
          quantity: 100,
          remains: 100,
          status: 'CANCELED',
        },
        'Duplicate cancel attempt',
        mockTx
      );

      expect(res).toBeNull();
    });
  });
});
