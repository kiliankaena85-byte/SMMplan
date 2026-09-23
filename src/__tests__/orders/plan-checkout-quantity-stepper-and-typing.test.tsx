/**
 * @vitest-environment jsdom
 */
import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanCheckoutQuantity } from '@/components/landing/order-engine/variants/PlanCheckoutQuantity';
import { PublicService } from '@/actions/order/catalog';

describe('PlanCheckoutQuantity Stepper and Typing Integrity Tests', () => {
  const mockLowMinService: PublicService = {
    id: 'srv-low-min',
    numericId: 10,
    name: 'Telegram Реакции (от 10 шт)',
    pricePer1kRub: 50,
    pricePerUnitRub: 0.05,
    minQty: 10,
    maxQty: 100000,
    badge: 'Быстро',
    speed: '1 мин',
    warrantyDays: 0,
    isDripFeedEnabled: true,
    categoryId: 'cat-reactions',
    description: 'Быстрые реакции на пост'
  };

  function TestHarness({
    initialQty = 10,
    dripFeedEnabled = false,
    runs = 5,
    service = mockLowMinService,
  }: {
    initialQty?: number;
    dripFeedEnabled?: boolean;
    runs?: number;
    service?: PublicService;
  }) {
    const [quantity, setQuantity] = useState(initialQty);
    const [isDrip, setIsDrip] = useState(dripFeedEnabled);
    const [currentRuns, setCurrentRuns] = useState(runs);
    const [dripInterval, setDripInterval] = useState(60);
    const [error, setError] = useState<string | null>(null);

    const minQty = service.minQty;
    const maxQty = service.maxQty;
    const effectiveMinQty = isDrip && currentRuns > 0 ? minQty * currentRuns : minQty;

    const handleStepQuantity = (delta: number) => {
      const current = Number(quantity) || effectiveMinQty;
      const target = current === effectiveMinQty && delta > 0 && Number(quantity) === 0
        ? effectiveMinQty
        : current + delta;
      setQuantity(Math.max(effectiveMinQty, Math.min(maxQty, target)));
      setError(null);
    };

    return (
      <div>
        <PlanCheckoutQuantity
          quantity={quantity}
          setQuantity={setQuantity}
          quantityInputRef={{ current: null }}
          minQty={minQty}
          maxQty={maxQty}
          effectiveMinQty={effectiveMinQty}
          handleStepQuantity={handleStepQuantity}
          selectedService={service}
          dripFeedEnabled={isDrip}
          setDripFeedEnabled={setIsDrip}
          runs={currentRuns}
          setRuns={setCurrentRuns}
          dripInterval={dripInterval}
          setDripInterval={setDripInterval}
          setLocalError={setError}
        />
        {error && <div data-testid="error-message">{error}</div>}
      </div>
    );
  }

  it('allows free typing and backspace to clear the field without immediate lock/reversion', () => {
    render(<TestHarness initialQty={10} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    expect(input.value).toBe('10');

    // Simulate deleting character by character
    fireEvent.change(input, { target: { value: '1' } });
    expect(input.value).toBe('1');

    // Simulate clearing field completely
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
  });

  it('renders inline warning when intermediate quantity is below minimum, without resetting input', () => {
    render(<TestHarness initialQty={10} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    // User types "2" while intending to type "250"
    fireEvent.change(input, { target: { value: '2' } });
    expect(input.value).toBe('2');

    // Warning is visible and input marked aria-invalid
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(/Минимум: 10 шт\. При потере фокуса исправим автоматически\./i)).toBeDefined();
  });

  it('normalizes value to effectiveMinQty upon onBlur if left below minimum or empty', () => {
    render(<TestHarness initialQty={10} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    // User cleared the field and blurred away
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    fireEvent.blur(input);
    expect(input.value).toBe('10');

    // User left "3" (< 10) and blurred away
    fireEvent.change(input, { target: { value: '3' } });
    expect(input.value).toBe('3');
    fireEvent.blur(input);
    expect(input.value).toBe('10');
  });

  it('uses adaptive step: step is 10 for minQty=10, buttons have correct disabled states', () => {
    render(<TestHarness initialQty={10} />);
    const minusBtn = screen.getByRole('button', { name: '–' }) as HTMLButtonElement;
    const plusBtn = screen.getByRole('button', { name: '+' }) as HTMLButtonElement;
    const input = screen.getByRole('textbox') as HTMLInputElement;

    // At minimum 10, minus button must be disabled
    expect(minusBtn.disabled).toBe(true);

    // Clicking plus increments by 10 (from 10 to 20)
    fireEvent.click(plusBtn);
    expect(input.value).toBe('20');
    expect(minusBtn.disabled).toBe(false);

    // Clicking plus again increments to 30
    fireEvent.click(plusBtn);
    expect(input.value).toBe('30');

    // Clicking minus decrements back to 20
    fireEvent.click(minusBtn);
    expect(input.value).toBe('20');
  });

  it('strictly enforces Drip-Feed Floor Invariant: effectiveMinQty scales with runs and clamps on blur', () => {
    // 5 runs of minQty=10 -> effectiveMinQty = 50
    render(<TestHarness initialQty={50} dripFeedEnabled={true} runs={5} />);
    const minusBtn = screen.getByRole('button', { name: '–' }) as HTMLButtonElement;
    const input = screen.getByRole('textbox') as HTMLInputElement;

    expect(input.value).toBe('50');
    expect(minusBtn.disabled).toBe(true);

    // User tries to enter 30 (< 50)
    fireEvent.change(input, { target: { value: '30' } });
    expect(input.value).toBe('30');
    expect(screen.getByText(/Минимум для 5 запусков: 50 шт/i)).toBeDefined();

    // On blur, clamps back to 50
    fireEvent.blur(input);
    expect(input.value).toBe('50');
  });

  it('caps pasted or typed numbers exceeding maxQty immediately in onChange', () => {
    render(<TestHarness initialQty={10} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    // Paste astronomical number
    fireEvent.change(input, { target: { value: '999999999' } });
    // Should be capped at maxQty (100000)
    expect(input.value).toBe('100000');
  });
});
