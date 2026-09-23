/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WidgetCardSkeleton, WidgetPairSkeleton } from '@/app/admin/dashboard/dashboard-skeletons';
import { RecentOrdersFeedWidget } from '@/app/admin/dashboard/RecentOrdersFeedWidget';
import { TopSpendersWidget } from '@/app/admin/dashboard/TopSpendersWidget';
import { TopServicesWidget } from '@/app/admin/dashboard/TopServicesWidget';
import { PaymentGatewaysWidget } from '@/app/admin/dashboard/PaymentGatewaysWidget';
import { RefundMonitorWidget } from '@/app/admin/dashboard/RefundMonitorWidget';
import { adminOrderService } from '@/services/admin/order.service';
import { adminUserService } from '@/services/admin/user.service';
import { accountingService } from '@/services/financial/accounting.service';

vi.mock('@/services/admin/order.service', () => ({
  adminOrderService: {
    getRecentOrders: vi.fn(),
    getTopServices: vi.fn(),
    getRefundAndFailureStats: vi.fn(),
  },
}));

vi.mock('@/services/admin/user.service', () => ({
  adminUserService: {
    getTopSpenders: vi.fn(),
  },
}));

vi.mock('@/services/financial/accounting.service', () => ({
  accountingService: {
    getGatewayBreakdown: vi.fn(),
  },
}));

describe('Admin Dashboard Widgets Colocation & Suspense Skeletons Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Skeletons rendering', () => {
    it('renders WidgetCardSkeleton with title and animated placeholder rows', () => {
      render(<WidgetCardSkeleton title="Тестовый виджет" rows={3} />);
      expect(screen.getByText('Тестовый виджет')).toBeDefined();
      const skeleton = screen.getByTestId('widget-skeleton');
      expect(skeleton.className).toContain('animate-pulse');
    });

    it('renders WidgetPairSkeleton with two columns', () => {
      const { container } = render(<WidgetPairSkeleton />);
      const skeletons = container.querySelectorAll('[data-testid="widget-skeleton"]');
      expect(skeletons.length).toBe(2);
    });
  });

  describe('RecentOrdersFeedWidget', () => {
    it('renders recent orders returned from service', async () => {
      const mockOrders = [
        {
          id: 'ord-1',
          numericId: 101,
          charge: BigInt(5000),
          status: 'COMPLETED',
          createdAt: new Date(),
          tenantId: 'smmplan',
          user: { email: 'client@example.com' },
          service: {
            name: 'Telegram Followers',
            category: {
              name: 'Followers',
              network: { name: 'Telegram', slug: 'telegram' },
            },
          },
        },
      ];

      vi.mocked(adminOrderService.getRecentOrders).mockResolvedValueOnce(
        mockOrders as unknown as Awaited<ReturnType<typeof adminOrderService.getRecentOrders>>
      );

      const jsx = await RecentOrdersFeedWidget({ limit: 6 });
      render(jsx);

      expect(screen.getByText('#101')).toBeDefined();
      expect(screen.getByText('client@example.com')).toBeDefined();
      expect(adminOrderService.getRecentOrders).toHaveBeenCalledWith(6, undefined);
    });

    it('passes tenantFilter to adminOrderService', async () => {
      vi.mocked(adminOrderService.getRecentOrders).mockResolvedValueOnce([
        {
          id: 'ord-2',
          numericId: 102,
          charge: BigInt(3000),
          status: 'IN_PROGRESS',
          createdAt: new Date(),
          tenantId: 'flux',
          user: { email: 'flux@example.com' },
          service: {
            name: 'VK Likes',
            category: {
              name: 'Likes',
              network: { name: 'VK', slug: 'vk' },
            },
          },
        },
      ] as unknown as Awaited<ReturnType<typeof adminOrderService.getRecentOrders>>);

      const jsx = await RecentOrdersFeedWidget({ tenantFilter: 'flux' });
      render(jsx);

      expect(adminOrderService.getRecentOrders).toHaveBeenCalledWith(6, 'flux');
      expect(screen.getByText('#102')).toBeDefined();
      expect(screen.getByText('flux@example.com')).toBeDefined();
    });
  });

  describe('TopSpendersWidget', () => {
    it('renders top spenders returned from service', async () => {
      const mockClients = [
        {
          id: 'usr-1',
          email: 'vip@example.com',
          role: 'USER',
          balance: 250000,
          totalSpent: 1000000,
          tenantId: 'smmplan',
          createdAt: new Date(),
          _count: { orders: 42 },
        },
      ];

      vi.mocked(adminUserService.getTopSpenders).mockResolvedValueOnce(
        mockClients as unknown as Awaited<ReturnType<typeof adminUserService.getTopSpenders>>
      );

      const jsx = await TopSpendersWidget({ limit: 6 });
      render(jsx);

      expect(screen.getByText('vip@example.com')).toBeDefined();
      expect(adminUserService.getTopSpenders).toHaveBeenCalledWith(6, undefined);
    });

    it('passes tenantFilter to adminUserService', async () => {
      vi.mocked(adminUserService.getTopSpenders).mockResolvedValueOnce([
        {
          id: 'usr-2',
          email: 'whale@example.com',
          role: 'USER',
          balance: 50000,
          totalSpent: 800000,
          tenantId: 'flux',
          createdAt: new Date(),
          _count: { orders: 15 },
        },
      ] as unknown as Awaited<ReturnType<typeof adminUserService.getTopSpenders>>);

      const jsx = await TopSpendersWidget({ tenantFilter: 'flux' });
      render(jsx);

      expect(adminUserService.getTopSpenders).toHaveBeenCalledWith(6, 'flux');
      expect(screen.getByText('whale@example.com')).toBeDefined();
    });
  });

  describe('TopServicesWidget', () => {
    it('renders top services returned from service', async () => {
      const mockServices = [
        {
          id: 'srv-1',
          name: 'Super Telegram Views',
          networkName: 'Telegram',
          categoryName: 'Views',
          ordersCount: 250,
          revenueKopecks: BigInt(500000),
          profitKopecks: BigInt(200000),
          marginPct: 40,
        },
      ];

      vi.mocked(adminOrderService.getTopServices).mockResolvedValueOnce(
        mockServices as unknown as Awaited<ReturnType<typeof adminOrderService.getTopServices>>
      );

      const jsx = await TopServicesWidget({ limit: 6 });
      render(jsx);

      expect(screen.getByText('Super Telegram Views')).toBeDefined();
      expect(adminOrderService.getTopServices).toHaveBeenCalledWith(6, undefined, undefined, undefined);
    });

    it('passes date filters and tenantFilter to adminOrderService', async () => {
      vi.mocked(adminOrderService.getTopServices).mockResolvedValueOnce([]);

      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');
      const jsx = await TopServicesWidget({ filterStart: start, filterEnd: end, tenantFilter: 'smmplan' });
      render(jsx);

      expect(adminOrderService.getTopServices).toHaveBeenCalledWith(6, start, end, 'smmplan');
      expect(screen.getByText('Услуги за выбранный период не найдены')).toBeDefined();
    });
  });

  describe('PaymentGatewaysWidget', () => {
    it('renders payment gateways returned from accounting service', async () => {
      const mockGateways = [
        {
          gateway: 'yookassa',
          label: 'ЮKassa',
          icon: '💳',
          amountKopecks: BigInt(1500000),
          feeKopecks: BigInt(52500),
          feePct: 3.5,
          successCount: 15,
          totalCount: 16,
          successRate: 94,
          sharePct: 65,
        },
      ];

      vi.mocked(accountingService.getGatewayBreakdown).mockResolvedValueOnce(
        mockGateways as unknown as Awaited<ReturnType<typeof accountingService.getGatewayBreakdown>>
      );

      const jsx = await PaymentGatewaysWidget({});
      render(jsx);

      expect(screen.getByText('ЮKassa')).toBeDefined();
      expect(accountingService.getGatewayBreakdown).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('passes date filters and tenantFilter to accountingService', async () => {
      vi.mocked(accountingService.getGatewayBreakdown).mockResolvedValueOnce([]);

      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');
      const jsx = await PaymentGatewaysWidget({ filterStart: start, filterEnd: end, tenantFilter: 'flux' });
      render(jsx);

      expect(accountingService.getGatewayBreakdown).toHaveBeenCalledWith(start, end, 'flux');
      expect(screen.getByText('Транзакции за выбранный период не найдены')).toBeDefined();
    });
  });

  describe('RefundMonitorWidget', () => {
    it('renders refund and failure statistics returned from service', async () => {
      const mockStats = {
        totalOrders: 100,
        canceledOrders: 2,
        partialOrders: 1,
        errorOrders: 0,
        problematicCount: 3,
        failureRate: '3.0',
        totalRefundsKopecks: BigInt(15000),
        topFailingServices: [],
      };

      vi.mocked(adminOrderService.getRefundAndFailureStats).mockResolvedValueOnce(
        mockStats as unknown as Awaited<ReturnType<typeof adminOrderService.getRefundAndFailureStats>>
      );

      const jsx = await RefundMonitorWidget({});
      render(jsx);

      expect(screen.getByText('3.0% сбоев / отмен')).toBeDefined();
      expect(adminOrderService.getRefundAndFailureStats).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('passes date filters and tenantFilter to adminOrderService', async () => {
      vi.mocked(adminOrderService.getRefundAndFailureStats).mockResolvedValueOnce({
        totalOrders: 50,
        canceledOrders: 5,
        partialOrders: 2,
        errorOrders: 1,
        problematicCount: 8,
        failureRate: '16.0',
        totalRefundsKopecks: BigInt(24000),
        topFailingServices: [{ name: 'Failing Svc', network: 'Telegram', count: 5 }],
      } as unknown as Awaited<ReturnType<typeof adminOrderService.getRefundAndFailureStats>>);

      const start = new Date('2026-02-01');
      const end = new Date('2026-02-28');
      const jsx = await RefundMonitorWidget({ filterStart: start, filterEnd: end, tenantFilter: 'smmplan' });
      render(jsx);

      expect(adminOrderService.getRefundAndFailureStats).toHaveBeenCalledWith(start, end, 'smmplan');
      expect(screen.getByText('16.0% сбоев / отмен')).toBeDefined();
      expect(screen.getByText('Failing Svc')).toBeDefined();
    });
  });
});
