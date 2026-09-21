// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

vi.mock('@/actions/order/catalog', () => ({
  getServicesByCategoryAction: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/actions/order/checkout', () => ({
  getAvailableGatewaysAction: vi.fn().mockResolvedValue({ yookassa: true, robokassa: false, cryptobot: false }),
  checkoutAction: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Wave 19: SMMflux A/B Test Order Client Decomposition (CDD-TDD)', () => {
  it('should ensure all created submodules obey the <= 200 lines rule', () => {
    const filesToCheck = [
      'src/components/ab-test/animations.ts',
      'src/components/ab-test/sub/FluxNavHeader.tsx',
      'src/components/ab-test/FluxOrderClient.tsx',
      'src/components/ab-test/flux-steps/sub/types.ts',
      'src/components/ab-test/flux-steps/sub/FluxStepCheckoutHeader.tsx',
      'src/components/ab-test/flux-steps/sub/FluxStepCheckoutInputs.tsx',
      'src/components/ab-test/flux-steps/sub/FluxStepCheckoutPaymentMethods.tsx',
      'src/components/ab-test/flux-steps/sub/FluxStepCheckoutDripAndCustom.tsx',
      'src/components/ab-test/flux-steps/sub/FluxStepCheckoutPromoCard.tsx',
      'src/components/ab-test/flux-steps/FluxStepCheckout.tsx',
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath), `File ${relPath} should exist`).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      expect(lines, `Component ${relPath} has ${lines} lines, expected <= 200`).toBeLessThanOrEqual(200);
    }
  });

  it('should render FluxOrderClient without crashing', async () => {
    const { FluxOrderClient } = await import('@/components/ab-test/FluxOrderClient');
    const { container } = render(<FluxOrderClient initialCatalog={[]} initialEmail="test@test.com" />);
    expect(container).toBeDefined();
  });

  it('should render FluxStepCheckoutPromoCard with toggle and input', async () => {
    const { FluxStepCheckoutPromoCard } = await import('@/components/ab-test/flux-steps/sub/FluxStepCheckoutPromoCard');
    const { container, rerender } = render(
      <FluxStepCheckoutPromoCard
        showPromo={false}
        setShowPromo={vi.fn()}
        promoCode=""
        setPromoCode={vi.fn()}
        appliedPromo=""
        isApplyingPromo={false}
        promoMessage={null}
        handleApplyPromo={vi.fn()}
        handleRemovePromo={vi.fn()}
      />
    );
    expect(container.textContent).toContain('У меня есть промокод');

    rerender(
      <FluxStepCheckoutPromoCard
        showPromo={true}
        setShowPromo={vi.fn()}
        promoCode="PROMO2026"
        setPromoCode={vi.fn()}
        appliedPromo=""
        isApplyingPromo={false}
        promoMessage={null}
        handleApplyPromo={vi.fn()}
        handleRemovePromo={vi.fn()}
      />
    );
    expect(container.textContent).toContain('Промокод на скидку');
    expect(container.querySelector('input')).toBeDefined();
  });

  it('should render FluxStepCheckoutHeader with service selector when multiple services provided', async () => {
    const { FluxStepCheckoutHeader } = await import('@/components/ab-test/flux-steps/sub/FluxStepCheckoutHeader');
    const mockServices = [
      { id: 'srv-1', name: 'Бусты 7 дней', pricePer1kRub: 1000, pricePerUnitRub: 1, minQty: 1, maxQty: 100 } as any,
      { id: 'srv-2', name: 'Бусты 14 дней', pricePer1kRub: 1800, pricePerUnitRub: 1.8, minQty: 1, maxQty: 100 } as any,
    ];
    const { container } = render(
      <FluxStepCheckoutHeader
        selectedService={mockServices[0]}
        services={mockServices}
        onSelectService={vi.fn()}
        activeNetwork={{ id: 'net-1', name: 'Telegram', slug: 'telegram' } as any}
        activeCategory={{ id: 'cat-1', name: 'Бусты для каналов', slug: 'busty' } as any}
      />
    );
    expect(container.textContent).toContain('Telegram • Бусты для каналов');
    expect(container.textContent).toContain('Выбор услуги / тарифа');
    const select = container.querySelector('select');
    expect(select).toBeDefined();
    expect(select?.options.length).toBe(2);
  });

  it('should render Rocket icon for Telegram Boost categories', async () => {
    const { CategoryIcon } = await import('@/components/ui/CategoryIcon');
    const { container } = render(<CategoryIcon name="Бусты для каналов" />);
    expect(container.querySelector('svg')).toBeDefined();
    // Verify lucide-rocket class exists
    expect(container.querySelector('svg')?.classList.contains('lucide-rocket')).toBe(true);

    const { container: containerEn } = render(<CategoryIcon name="Telegram Boosts Level" />);
    expect(containerEn.querySelector('svg')?.classList.contains('lucide-rocket')).toBe(true);
  });

  it('should resolve targetType to channel/profile for Telegram Boosts in FluxStepCheckoutInputs', async () => {
    const { FluxStepCheckoutInputs } = await import('@/components/ab-test/flux-steps/sub/FluxStepCheckoutInputs');
    const boostService = {
      id: 'srv-boost-1',
      name: 'Бусты Telegram для каналов',
      targetType: 'POST', // Default DB value that should be resolved to CHANNEL
      minQty: 1,
      maxQty: 100,
      pricePerUnitRub: 2.5,
    } as any;

    const { container } = render(
      <FluxStepCheckoutInputs
        selectedService={boostService}
        activeNetwork={{ id: 'net-tg', name: 'Telegram', slug: 'telegram' } as any}
        activeCategory={{ id: 'cat-boost', name: 'Бусты', slug: 'busty' } as any}
        quantity={5}
        setQuantity={vi.fn()}
        link=""
        setLink={vi.fn()}
        email=""
        setEmail={vi.fn()}
        isRequirementsConfirmed={false}
        setIsRequirementsConfirmed={vi.fn()}
        isTgGuideOpen={false}
        setIsTgGuideOpen={vi.fn()}
        formState={{}}
        showShakeError={false}
        shakeKey={0}
        quantityRef={{ current: null }}
        emailRef={{ current: null }}
        linkRef={{ current: null }}
      />
    );

    // According to Rule 4.1, it must resolve to channel/profile, NOT post
    expect(container.textContent).toContain('Ссылка на канал/профиль');
    expect(container.textContent).not.toContain('Ссылка на пост');
  });
});
