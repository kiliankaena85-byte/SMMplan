import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobileWizard } from '@/components/landing/order-engine/wizard-steps/useMobileWizard';
import { OrderEngine } from '@/hooks/useOrderEngine';

describe('MobileWizard Stepper & State Machine (Smoke & E2E Tests)', () => {
  const mockCatalog = [
    {
      id: 'tg-net',
      slug: 'telegram',
      name: 'Telegram',
      categories: [
        {
          id: 'tg-subs',
          name: 'Подписчики',
          services: [
            {
              id: 'srv-1',
              name: 'Telegram Подписчики Стандарт',
              minQty: 10,
              maxQty: 50000,
              pricePerUnitRub: 0.15
            }
          ]
        }
      ]
    }
  ];

  const createMockEngine = (overrides?: Partial<OrderEngine>): OrderEngine => {
    return {
      url: '',
      setUrl: vi.fn(),
      networkId: 'tg-net',
      setNetworkId: vi.fn(),
      categoryId: null,
      setCategoryId: vi.fn(),
      selectedService: null,
      setSelectedService: vi.fn(),
      quantity: 100,
      setQuantity: vi.fn(),
      email: '',
      setEmail: vi.fn(),
      promoCode: '',
      setPromoCode: vi.fn(),
      agreedToTerms: true,
      setAgreedToTerms: vi.fn(),
      catalog: mockCatalog as any,
      isLoading: false,
      validationErrors: null,
      availableCategories: mockCatalog[0].categories as any,
      availableServices: mockCatalog[0].categories[0].services as any,
      isCalculating: false,
      totalPriceFormatted: '15.00 ₽',
      ...overrides
    } as unknown as OrderEngine;
  };

  it('1. Initializes on Step 1 when no URL or service is preselected', () => {
    const engine = createMockEngine();
    const { result } = renderHook(() => useMobileWizard(engine));

    expect(result.current.currentStep).toBe(1);
    expect(result.current.shouldShowCategories).toBe(true);
    expect(result.current.shouldShowTariffs).toBe(true);
    expect(result.current.shouldShowParameters).toBe(true);
  });

  it('2. Advances to Step 2 when user pastes a valid link in Step 1', () => {
    let engine = createMockEngine({ url: 'https://t.me/my_awesome_channel' });
    const { result } = renderHook(() => useMobileWizard(engine));

    expect(result.current.currentStep).toBe(2);
    expect(result.current.isLinkFilled).toBe(true);
  });

  it('3. Advances directly to Step 4 when a service is chosen from Catalog without prior URL', () => {
    const selectedService = mockCatalog[0].categories[0].services[0];
    const engine = createMockEngine({
      url: '', // Empty link
      categoryId: 'tg-subs',
      selectedService: selectedService as any
    });

    const { result } = renderHook(() => useMobileWizard(engine));

    // Must NOT reset to Step 1; must advance directly to Step 4 for seamless checkout
    expect(result.current.currentStep).toBe(4);
    expect(result.current.shouldShowParameters).toBe(true);
  });

  it('4. Allows manual bidirectional step navigation without state corruption', () => {
    const engine = createMockEngine();
    const { result } = renderHook(() => useMobileWizard(engine));

    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.setActiveStep(2);
    });
    expect(result.current.currentStep).toBe(2);

    act(() => {
      result.current.setActiveStep(3);
    });
    expect(result.current.currentStep).toBe(3);

    act(() => {
      result.current.setActiveStep(4);
    });
    expect(result.current.currentStep).toBe(4);

    // Back to Step 3
    act(() => {
      result.current.setActiveStep(3);
    });
    expect(result.current.currentStep).toBe(3);
  });

  it('5. Correctly resolves selected category name and brand styling', () => {
    const engine = createMockEngine({
      networkId: 'tg-net',
      categoryId: 'tg-subs'
    });
    const { result } = renderHook(() => useMobileWizard(engine));

    expect(result.current.selectedCategoryName).toBe('Подписчики');
    expect(result.current.brandStyle).toBeDefined();
  });
});
