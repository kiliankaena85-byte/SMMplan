/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderEngine } from '@/hooks/useOrderEngine';

vi.mock('@/actions/order/catalog', () => ({
  getPublicCatalogAction: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getServicesByCategoryAction: vi.fn().mockResolvedValue([]),
  getFreshServiceAction: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/actions/order/checkout', () => ({
  getAvailableGatewaysAction: vi.fn().mockResolvedValue({
    success: true,
    data: { yookassa: true, robokassa: false, cryptobot: false },
  }),
}));

vi.mock('@/actions/order/analyze-url', () => ({
  analyzeUrl: vi.fn().mockResolvedValue({
    success: true,
    data: {
      platform: 'TELEGRAM',
      type: 'channel',
      id: '1234567890',
      suggestedCategories: ['Бусты (Telegram Levels)', 'Подписчики / Участники', 'Premium Подписчики'],
    },
  }),
}));

describe('Order Engine Boost Category Retention Suite', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockCatalog = [
    {
      id: 'net-tg',
      name: 'Telegram',
      slug: 'telegram',
      icon: 'tg-icon',
      sortOrder: 1,
      categories: [
        {
          id: 'cat-subscribers',
          name: 'Подписчики',
          slug: 'podpischiki',
          sortOrder: 1,
          services: [],
        },
        {
          id: 'cat-boosts',
          name: 'Бусты для каналов',
          slug: 'telegram-busty-dlya-kanalov',
          sortOrder: 2,
          services: [],
        },
      ],
    },
  ];

  it('prevents resetting category to empty when typing character-by-character on a boost page', () => {
    const { result } = renderHook(() =>
      useOrderEngine(mockCatalog as any, '', '', 'cat-boosts', 'net-tg')
    );

    expect(result.current.categoryId).toBe('cat-boosts');

    // User types: 'h' -> 'ht' -> 'htt' -> 'http' -> 'https' (length 5 transition)
    act(() => {
      result.current.setUrl('h');
    });
    expect(result.current.categoryId).toBe('cat-boosts');

    act(() => {
      result.current.setUrl('ht');
    });
    expect(result.current.categoryId).toBe('cat-boosts');

    act(() => {
      result.current.setUrl('https');
    });
    // Critical verification: at length 5, category must NOT be cleared when isCurrentBoost is true
    expect(result.current.categoryId).toBe('cat-boosts');

    // Complete boost URL
    act(() => {
      result.current.setUrl('https://t.me/boost?c=1234567890');
    });
    expect(result.current.categoryId).toBe('cat-boosts');
  });

  it('resets category to empty when typing from a non-boost category on main landing', () => {
    const { result } = renderHook(() =>
      useOrderEngine(mockCatalog as any, '', '', 'cat-subscribers', 'net-tg')
    );

    expect(result.current.categoryId).toBe('cat-subscribers');

    // User enters a 5-char URL prefix
    act(() => {
      result.current.setUrl('https');
    });

    // In non-boost mode, category is reset to empty to allow auto-detection from URL analysis
    expect(result.current.categoryId).toBe('');
  });
});
