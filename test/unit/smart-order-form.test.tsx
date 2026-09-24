/**
 * QA-5: UI/UX & Performance Engineer
 * Test Suite: OrderSummaryCard & UI Fallbacks
 * Standards: ISO 25010 §6.4 (Usability), WCAG 2.2 (Accessibility)
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { useOrderEngine } from '@/hooks/useOrderEngine';
import { OrderSummaryCard } from '@/components/orders/sub/OrderSummaryCard';
import { PlatformSelectorFallback } from '@/components/orders/PlatformSelectorFallback';

// Mock dependencies
vi.mock('@/hooks/useOrderEngine', () => ({
  useOrderEngine: vi.fn(),
}));

describe('OrderSummaryCard & PlatformSelectorFallback (QA-5)', () => {
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

  it('TC-UX-005: PlatformSelectorFallback renders platforms', () => {
    const onSelect = vi.fn();
    render(<PlatformSelectorFallback onSelect={onSelect} />);

    expect(screen.getByText(/Telegram/i)).toBeDefined();
  });

  // ── TC-UX-011: 152-FZ / GDPR Implicit Consent Compliance ──
  it('TC-UX-011: Renders implicit consent text instead of checkbox (152-FZ)', () => {
    const state = getMockState({
      selectedService: { id: 'srv1', name: 'Test SRV', minQty: 100, maxQty: 1000, pricePer1kRub: 100, pricePerUnitRub: 0.1 },
    });

    vi.mocked(useOrderEngine).mockReturnValue(state as any);
    render(<OrderSummaryCard userBalanceCents={1000} engine={state} />);

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
