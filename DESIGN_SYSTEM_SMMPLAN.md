# SMMplan Design System & Visual Architecture Specifications (v4.0)

## 1. Overview & Core Technology Stack

The SMMplan design system is a high-performance, enterprise-grade B2B UI framework built specifically for multi-tenant digital marketing platforms.

- **CSS Engine**: Tailwind CSS 4.0.0 (`@theme` directive in `src/app/globals.css`, CSS-first configuration)
- **UI Component Library**: HeroUI v3 (dot-notation API: `<Table.Header>`, `<Table.Column>`)
- **Typography**: Inter / Outfit (Google Fonts) with Cyrillic fallback chain
- **Color Model**: HSL-tailored semantic tokens for Seamless Light & Dark Modes
- **Animation Framework**: Motion (ex-Framer Motion v12) & CSS Keyframe micro-interactions

---

## 2. Semantic Color System & Design Tokens (`globals.css`)

All color applications in SMMplan **MUST** strictly utilize semantic color tokens. Raw hex colors or non-semantic Tailwind utility classes (`text-white`, `bg-black`, `bg-blue-500`) are strictly forbidden.

### `@theme` Definition Matrix

```css
@theme {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));

  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));

  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

---

## 3. Brand Identity & Logo Architecture

- **Primary Logo**: `<TenantLogo tenantId="smmplan" />`
  - **Icon**: `Zap` (⚡ Lightning bolt in `bg-primary/10` with `border-primary/20`)
  - **Typography**: Semi-bold / Extrabold `SMMplan`
- **Secondary Tenant (SMMflux)**: `<TenantLogo tenantId="flux" />`
  - **Icon**: `Heart` (💖 Heart in `bg-primary/10` with `border-primary/20`)
  - **Typography**: Extrabold `SMMflux`

---

## 4. Interaction & UX Directives

### Zero-Disabled Submit Button Policy
1. **Always Active**: Primary submission buttons ("Оплатить", "Сохранить", "Подтвердить") are **never** rendered with `disabled` states due to incomplete form fields.
2. **Interactive Guidance**: Unfilled or invalid required fields intercept `onSubmit` clicks, triggering JIT visual feedback (e.g. `animate-shake`, highlighted border) and smooth auto-scrolling (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) to the first invalid field.
3. **Error Notice Positioning**: Global server error messages are rendered immediately above the submit action button to maintain optical focal alignment.

---

## 5. Pricing Display Standards

1. **Unit Metric**: Prices presented to end-users in the UI are **ALWAYS** displayed per 1 item (`pricePerUnitRub`), formatted with the suffix `₽ / шт`.
2. **Forbidden UI Patterns**:
   - ❌ Displaying raw bulk provider rates per 1,000 units directly to users.
   - ❌ Writing `/ 1000 шт` in retail pricing labels.
3. **Beautiful Rounding Algorithm**:
   - For prices `< 1000 ₽ / 1000 шт`: Round up to nearest 10 ₽ (`Math.ceil(price / 10) * 10`).
   - For prices `≥ 1000 ₽ / 1000 шт`: Round up to nearest 100 ₽ (`Math.ceil(price / 100) * 100`).

---

## 6. Accessibility & Compliance (WCAG 2.2 AA)

- **Touch Target**: Minimum interactive area `44px x 44px`.
- **Contrast Ratio**: Minimum text-to-background contrast `4.5:1` for normal text and `3:1` for large text/icons.
- **Keyboard Navigation**: Native focus rings with `ring-offset-2 ring-primary` for interactive controls.
