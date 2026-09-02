/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { useMobileWizard } from '@/components/landing/order-engine/wizard-steps/useMobileWizard';
import { MobileWizardStepper } from '@/components/landing/order-engine/wizard-steps/MobileWizardStepper';
import { MobileStep1Link } from '@/components/landing/order-engine/wizard-steps/MobileStep1Link';
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

  if (typeof window !== 'undefined') {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  }

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
    const engine = createMockEngine({ url: 'https://t.me/channel' });
    const { result } = renderHook(() => useMobileWizard(engine));

    expect(result.current.currentStep).toBe(2);

    act(() => {
      result.current.setActiveStep(1);
    });
    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.setActiveStep(3);
    });
    expect(result.current.currentStep).toBe(3);
  });

  it('5. Correctly resolves selected category name and brand styling', () => {
    const engine = createMockEngine({
      url: 'https://t.me/channel',
      networkId: 'tg-net',
      categoryId: 'tg-subs'
    });
    const { result } = renderHook(() => useMobileWizard(engine));

    expect(result.current.selectedCategoryName).toBe('Подписчики');
    expect(result.current.brandStyle).toBeDefined();
  });

  it('6. MobileWizardStepper renders 4 interactive steps and handles navigation', () => {
    const setActiveStep = vi.fn();
    const { getByText } = render(
      <MobileWizardStepper
        currentStep={2}
        setActiveStep={setActiveStep}
        isLinkFilled={true}
        hasCategory={false}
        hasService={false}
      />
    );

    expect(getByText('Ссылка')).toBeDefined();
    expect(getByText('Категория')).toBeDefined();
    expect(getByText('Тариф')).toBeDefined();
    expect(getByText('Оплата')).toBeDefined();

    fireEvent.click(getByText('Ссылка'));
    expect(setActiveStep).toHaveBeenCalledWith(1);
  });

  it('7. MobileStep1Link renders actionable prompt button when currentStep > 1 and url is empty', () => {
    const setActiveStep = vi.fn();
    const engine = createMockEngine({ url: '' });

    const { container } = render(
      <MobileStep1Link
        engine={engine}
        currentStep={3}
        setActiveStep={setActiveStep}
        proceedFromStep1={vi.fn()}
        isFocused={false}
        setIsFocused={vi.fn()}
        localUrlError={null}
        setLocalUrlError={vi.fn()}
        catalogHint={false}
      />
    );

    expect(container.firstChild).not.toBeNull();
    const promptBtn = screen.getByText(/Укажите ссылку для заказа/i);
    expect(promptBtn).toBeDefined();

    fireEvent.click(promptBtn);
    expect(setActiveStep).toHaveBeenCalledWith(1);
  });

  it('8. Allows user to navigate back to Step 3 or Step 1 from Step 4 without getting trapped', () => {
    const selectedService = mockCatalog[0].categories[0].services[0];
    const engine = createMockEngine({
      url: 'https://t.me/channel',
      categoryId: 'tg-subs',
      selectedService: selectedService as any
    });

    const { result } = renderHook(() => useMobileWizard(engine));

    // Initially on Step 4 because service is selected
    expect(result.current.currentStep).toBe(4);

    // User clicks "Назад к тарифам" (Step 3)
    act(() => {
      result.current.setActiveStep(3);
    });
    // MUST remain on Step 3, not forced back to Step 4!
    expect(result.current.currentStep).toBe(3);

    // User clicks "Сменить ссылку" (Step 1)
    act(() => {
      result.current.setActiveStep(1);
    });
    // MUST remain on Step 1!
    expect(result.current.currentStep).toBe(1);
  });

  it('9. MobileStep1Link input has type="text" and inputMode="url" to prevent iOS Safari validation lock', () => {
    const engine = createMockEngine({ url: '' });

    render(
      <MobileStep1Link
        engine={engine}
        currentStep={1}
        setActiveStep={vi.fn()}
        proceedFromStep1={vi.fn()}
        isFocused={false}
        setIsFocused={vi.fn()}
        localUrlError={null}
        setLocalUrlError={vi.fn()}
        catalogHint={false}
      />
    );

    const input = document.getElementById('standard-url-input') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.type).toBe('text');
    expect(input.getAttribute('inputmode')).toBe('url');
  });

  it('10. resetOrder method clears all draft state and returns user to Step 1 cleanly', () => {
    let currentUrl = 'https://t.me/test_channel';
    let currentService: any = mockCatalog[0].categories[0].services[0];
    let currentPromo = 'DISCOUNT10';

    const resetOrder = vi.fn(() => {
      currentUrl = '';
      currentService = null;
      currentPromo = '';
    });

    const engine = createMockEngine({
      url: currentUrl,
      selectedService: currentService,
      promoCode: currentPromo,
      resetOrder
    });

    const { result } = renderHook(() => useMobileWizard(engine));
    expect(result.current.currentStep).toBe(4);

    act(() => {
      engine.resetOrder();
      result.current.setActiveStep(1);
    });

    expect(resetOrder).toHaveBeenCalled();
    expect(currentUrl).toBe('');
    expect(currentService).toBeNull();
    expect(currentPromo).toBe('');
    expect(result.current.currentStep).toBe(1);
  });
});
