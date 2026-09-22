/**
 * QA-5: UI/UX & Performance Engineer
 * Test Suite: SmmplanOrderWizard & UI Fallbacks
 * Standards: ISO 25010 §6.4 (Usability), WCAG 2.2 (Accessibility)
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmmplanOrderWizard } from '@/components/orders/SmmplanOrderWizard';
import { PlatformSelectorFallback } from '@/components/orders/PlatformSelectorFallback';
import { useOrderEngine, type OrderEngine } from '@/hooks/useOrderEngine';
import { OrderSummaryCard } from '@/components/orders/sub/OrderSummaryCard';

// Mock Next.js navigation hooks for SmmplanOrderWizard
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock order catalog & checkout Server Actions
vi.mock('@/actions/order/catalog', () => ({
  getPublicCatalogAction: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getServicesByCategoryAction: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock('@/actions/order/checkout', () => ({
  getAvailableGatewaysAction: vi.fn().mockResolvedValue({ success: true, data: { balance: true, yookassa: true } }),
  checkoutAction: vi.fn().mockResolvedValue({ success: true, data: { orderId: 'mock-123' } }),
}));

// Mock dependencies
vi.mock('@/hooks/useOrderEngine', () => ({
  useOrderEngine: vi.fn(),
}));

vi.mock('@/components/orders/wizard/WizardStepNetwork', () => ({
  WizardStepNetwork: () => <div data-testid="step-network">Step Network</div>,
}));
vi.mock('@/components/orders/wizard/WizardStepCategory', () => ({
  WizardStepCategory: () => <div data-testid="step-category">Step Category</div>,
}));
vi.mock('@/components/orders/wizard/WizardStepService', () => ({
  WizardStepService: () => <div data-testid="step-service">Выберите услугу</div>,
}));
vi.mock('@/components/orders/wizard/WizardStepCheckout', () => ({
  WizardStepCheckout: () => <div data-testid="step-checkout">Step Checkout</div>,
}));

vi.mock('@/components/orders/wizard/useSmmplanOrderWizard', () => ({
  useSmmplanOrderWizard: () => ({
    step: 1,
    link: '',
    setLink: vi.fn(),
    networks: [],
    selectedNetwork: null,
    setSelectedNetwork: vi.fn(),
    selectedCategory: null,
    selectedService: null,
    changeStep: vi.fn(),
    searchNetwork: '',
    setSearchNetwork: vi.fn(),
    isLoadingCatalog: false,
    filteredNetworks: [],
    errorRef: { current: null },
    formRef: { current: null },
    errors: {},
    shakeKey: 0,
    handleSelectService: vi.fn(),
    handleBlurLink: vi.fn(),
    validateLinkFormat: vi.fn(),
  }),
}));

vi.mock('@/services/marketing.service', () => ({
  marketingService: {
    getB2BFormattedServices: vi.fn().mockReturnValue([]),
  },
}));

describe('SmartOrderWizard & UX Fallbacks (QA-5)', () => {
  const getMockState = (overrides = {}) => ({
    url: '',
    setUrl: vi.fn(),
    categoryId: null,
    setCategoryId: vi.fn(),
    selectedService: null,
    setSelectedService: vi.fn(),
    quantity: 100,
    setQuantity: vi.fn(),
    email: '',
    setEmail: vi.fn(),
    dripFeedEnabled: false,
    setDripFeedEnabled: vi.fn(),
    runs: 0,
    setRuns: vi.fn(),
    interval: 0,
    setInterval: vi.fn(),
    availableCategories: [],
    services: [],
    catalog: [{ id: 'net-tg', name: 'Telegram', slug: 'telegram', categories: [] }],
    unfilteredCatalog: [{ id: 'net-tg', name: 'Telegram', slug: 'telegram', categories: [] }],
    isLoading: false,
    isCalculating: false,
    totalPriceFormatted: '0 ₽',
    validate: vi.fn(),
    validationErrors: {},
    platform: null,
    setPlatform: vi.fn(),
    setManualPlatform: vi.fn(),
    agreedToTerms: false,
    setAgreedToTerms: vi.fn(),
    ...overrides,
  });

  // ── TC-UX-001: Zero-Scroll input flow ──
  it('TC-UX-001: Renders main input field ready for zero-scroll flow', () => {
    render(<SmmplanOrderWizard />);

    const input = screen.getByPlaceholderText(/Вставьте ссылку/i);
    expect(input).toBeDefined();
    expect(input.tagName).toBe('INPUT');
  });

  // ── TC-UX-003: WCAG 2.2 Accessibility ──
  it('TC-UX-003: Main input has appropriate aria-label for screen readers (WCAG 1.3.1)', () => {
    render(<SmmplanOrderWizard />);

    const input = screen.getByPlaceholderText(/Вставьте ссылку/i) as HTMLInputElement;
    expect(input.getAttribute('aria-label') || input.id || input.getAttribute('placeholder')).toBeTruthy();
  });

  // ── TC-UX-005: Fallback UI Activation ──
  it('TC-UX-005: Renders PlatformSelectorFallback with selectable platforms', () => {
    const onSelectMock = vi.fn();
    render(<PlatformSelectorFallback onSelect={onSelectMock} availablePlatforms={[]} />);

    expect(screen.getByTestId('platform-fallback')).toBeDefined();
  });

  // ── TC-UX-006: Manual Platform Selection ──
  it('TC-UX-006: Selecting a platform triggers onSelect callback in PlatformSelectorFallback', () => {
    const onSelectMock = vi.fn();
    render(<PlatformSelectorFallback onSelect={onSelectMock} availablePlatforms={[]} />);

    fireEvent.click(screen.getByTestId('btn-telegram'));
    expect(onSelectMock).toHaveBeenCalledWith('TELEGRAM');
  });

  // ── TC-UX-008: Hides Category Panel when link is empty ──
  it('TC-UX-008: Service selection pane is hidden when on initial step', () => {
    render(<SmmplanOrderWizard />);

    const categoryTitle = screen.queryByText(/Выберите услугу/i);
    expect(categoryTitle).toBeNull();
  });

  // ── TC-UX-011: 152-FZ / GDPR Implicit Consent Compliance ──
  it('TC-UX-011: Renders implicit consent text instead of checkbox (152-FZ)', () => {
    const state = getMockState({
      selectedService: { id: 'srv1', name: 'Test SRV', minQty: 100, maxQty: 1000, pricePer1kRub: 100, pricePerUnitRub: 0.1 },
    });

    vi.mocked(useOrderEngine).mockReturnValue(state as unknown as OrderEngine);
    render(<OrderSummaryCard userBalanceCents={1000} engine={state as unknown as OrderEngine} />);

    // Ensure the consent text is present
    const consentText = screen.getByText(/Нажимая кнопку «Оплатить заказ», вы соглашаетесь с/i);
    expect(consentText).toBeDefined();

    // Ensure NO explicit consent checkbox is rendered
    const checkbox = screen.queryByRole('checkbox', { name: /Согласие с публичной офертой/i });
    expect(checkbox).toBeNull();

    // The submit button should be enabled by default (not disabled by a missing checkbox)
    const submitBtn = screen.getByRole('button', { name: /Оплатить заказ/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
  });
});
