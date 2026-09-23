import { describe, it, expect } from 'vitest';
import { analyticsService, type ServiceProfitability } from '@/services/admin/analytics.service';

describe('AnalyticsService.aggregateCategoryProfitability Unit Tests', () => {

  it('aggregates multiple services within same category into single category record', () => {
    const services: ServiceProfitability[] = [
      {
        serviceId: 's1',
        serviceName: 'Telegram Subscribers Fast',
        categoryName: 'Подписчики',
        revenue: 10000,
        cogs: 4000,
        profit: 6000,
        marginPct: 60,
        ordersCount: 15,
      },
      {
        serviceId: 's2',
        serviceName: 'Telegram Subscribers Slow',
        categoryName: 'Подписчики',
        revenue: 5000,
        cogs: 2000,
        profit: 3000,
        marginPct: 60,
        ordersCount: 5,
      },
      {
        serviceId: 's3',
        serviceName: 'Telegram Views Post',
        categoryName: 'Просмотры',
        revenue: 20000,
        cogs: 5000,
        profit: 15000,
        marginPct: 75,
        ordersCount: 50,
      },
    ];

    const result = analyticsService.aggregateCategoryProfitability(services);

    expect(result).toHaveLength(2);
    // Sorts by profit descending: Просмотры (15000) > Подписчики (9000)
    expect(result[0].categoryName).toBe('Просмотры');
    expect(result[0].revenue).toBe(20000);
    expect(result[0].cogs).toBe(5000);
    expect(result[0].profit).toBe(15000);
    expect(result[0].marginPct).toBe(75);
    expect(result[0].ordersCount).toBe(50);

    expect(result[1].categoryName).toBe('Подписчики');
    expect(result[1].revenue).toBe(15000);
    expect(result[1].cogs).toBe(6000);
    expect(result[1].profit).toBe(9000);
    expect(result[1].marginPct).toBe(60); // 9000 / 15000 * 100
    expect(result[1].ordersCount).toBe(20);
  });

  it('handles empty input gracefully', () => {
    const result = analyticsService.aggregateCategoryProfitability([]);
    expect(result).toEqual([]);
  });

  it('safely handles zero revenue without division by zero / NaN', () => {
    const services: ServiceProfitability[] = [
      {
        serviceId: 'free-1',
        serviceName: 'Trial Test Service',
        categoryName: 'Тест',
        revenue: 0,
        cogs: 0,
        profit: 0,
        marginPct: 0,
        ordersCount: 1,
      },
    ];

    const result = analyticsService.aggregateCategoryProfitability(services);

    expect(result).toHaveLength(1);
    expect(result[0].marginPct).toBe(0);
    expect(Number.isNaN(result[0].marginPct)).toBe(false);
  });

  it('correctly handles negative profit (unprofitable service)', () => {
    const services: ServiceProfitability[] = [
      {
        serviceId: 'loss-1',
        serviceName: 'Underpriced Service',
        categoryName: 'Убыточные',
        revenue: 1000,
        cogs: 1500,
        profit: -500,
        marginPct: -50,
        ordersCount: 2,
      },
    ];

    const result = analyticsService.aggregateCategoryProfitability(services);

    expect(result).toHaveLength(1);
    expect(result[0].profit).toBe(-500);
    expect(result[0].marginPct).toBe(-50);
  });
});
