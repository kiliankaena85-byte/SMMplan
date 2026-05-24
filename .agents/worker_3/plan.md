# Implementation Plan — Fintech Grid Backdrop & Trust Signals

## 1. Objectives & Task Category
- **Category**: REVENUE-CRITICAL / ONBOARDING-CRITICAL
  - Backdrops affect visual/UX first impressions, which directly influences registration/onboarding.
  - Payment trust badges directly mitigate checkout friction, improving conversion and revenue.
- **Cost of Delay**: HIGH
  - Trust signal gaps lead to lost sales and low conversion rates on landing pages.
- **Business Impact**: Decreased bounce rate, increased conversion rate on landing order form.

## 2. 5 Vекторов Надежности (5 Reliability Vectors)
1. **Архитектурный стык (Server/Client boundaries)**:
   - Modifications are strictly in client components (`SmartLinkLanding.tsx`, `StickyCheckoutBar.tsx`, `MobileWizard.tsx`) which are already properly annotated with `"use client"`. No boundary leaks.
2. **Хаос и пустота (Cold Start / Empty State)**:
   - Ensure the new grid background works correctly regardless of catalog availability (even if database is empty).
   - Trust badges are static text blocks and will not fail during database/API connection loss.
3. **Visual & UX Density (Tailwind 4 / Responsive)**:
   - The geometric grid uses a subtle `border/0.05` opacity grid with `40px` spacing, keeping high contrast.
   - Removing the heavy SVG heart blob reduces background visual noise.
   - The card boundary modification will use a distinct thin `border border-border/80` instead of a thicker ring, presenting a modern, high-contrast minimalist fintech design.
4. **Доступность WCAG 2.2 AA**:
   - Touch targets for buttons are preserved at >= 44px.
   - Text color and size of payment badges are carefully chosen (`text-muted-foreground/80` or `text-muted-foreground/60`) to maintain a clear contrast ratio >= 4.5:1 against the light/dark background.
5. **Security & Trust**:
   - The trust badges explicitly list Russian payment methods (СБП, МИР, Visa) and Cryptobot, establishing trust early in the checkout flow without storing/requesting sensitive customer details.

## 3. Pre-Mortem Failure Simulation
| Risk | Software Protection Mechanism |
|---|---|
| Tailwind 4 `@theme` border variable missing or corrupted | We use CSS-fallback in Tailwind 4.0.0 or `border-border/80` utility if `var(--color-border)` has any issues. The snippet uses `var(--color-border)/0.05` which resolves directly to the CSS variable in Tailwind 4.0.0. |
| Text overflow of trust badges on super-narrow (320px) screens | Wrap text block inside `MobileWizard.tsx` with centering and flexible height to prevent horizontal overflow. Use `text-[7.5px]` and `tracking-wider` to fit perfectly on small mobile viewports. |
| Component compilation or linting errors in React 19 / Next.js 16 | Strictly verify types via `npx tsc --noEmit` and run `npm run lint` before declaring success. |

## 4. Step-by-Step Implementation Steps

### Step 1: Backdrop & Card Border in `SmartLinkLanding.tsx`
- Replace lines 145-170 with the Fintech Grid Backdrop.
- Replace `ring-1 ring-border/50` on the outer card wrapper (line 208) with `border border-border/80`.
- Verify code syntax.

### Step 2: Checkout Trust Badge in `StickyCheckoutBar.tsx`
- Replace payment badges block at lines 201-204 with the new multi-line centered badges block.
- Verify styling consistency.

### Step 3: Checkout Trust Badge in `MobileWizard.tsx`
- Replace line 783 with the lock icon and new list of payment methods.
- Wrap PRO mode checkout button block (lines 360-366) in a vertical flex wrapper and append the new badge text.
- Verify styling consistency.

## 5. Verification & Testing Method
- Run `npx tsc --noEmit` to confirm no TypeScript issues.
- Run `npm run lint` to verify ESLint compliance.
- Run `npm run build` to confirm production compile passes.
- Run `npm run test` to execute unit/integration test suites.
