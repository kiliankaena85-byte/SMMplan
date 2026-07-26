# Project: Client Dashboard Advanced Backend Features Integration

## Architecture
- Framework: Next.js 16.x (App Router, Turbopack), React 19.x, Tailwind CSS 4.0.0, HeroUI v3, Prisma 5 (PostgreSQL), TypeScript 5.7+
- Target Clients: SMMplan & SMMflux client dashboards (`new-order`, `orders`, `settings`, `deposit`)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Tech Spec | Codebase audit for new-order, orders, settings, deposit across SMMplan & SMMflux | none | DONE |
| 2 | R1: Advanced Order Parameters | Drip-Feed, Custom Data, ETA, JIT Warnings in `new-order` | M1 | DONE |
| 3 | R2: Order Management Integration | Refill button, Drip-Feed progress display, CBR rate/discount details in `orders` | M1 | DONE |
| 4 | R3: Profile & Security Settings | 152-ФЗ consent card, B2B Webhooks, INN/KPP requisites, API KeyHash in `settings` | M1 | IN_PROGRESS |
| 5 | R4: Deposit Promo Codes & Vouchers | Promo code / voucher input with bonus/discount calculation in `deposit` | M1 | PLANNED |
| 6 | E2E Integration & Verification | Project-wide lint, typecheck, build, and forensic audit | M2, M3, M4, M5 | PLANNED |

## Interface Contracts
### Order Creation API / Action
- Drip-Feed input params: `isDripFeed: boolean`, `runs: number`, `intervalMinutes: number`
- Custom Data input: `customData: string` (text or variant index)
- JIT Warning: `clientConfirmation: boolean`
- ETA data structure: `p50Minutes: number`, `p90Minutes: number`, `speedBadge: string`

### Refill Request API / Action
- Request endpoint/action: `createRefillRequest({ orderId: string })` -> returns Refill status `PENDING`

### Settings & Profile API / Action
- Consent fields: `tosAcceptedAt`, `tosAcceptedIp`
- Webhook fields: `webhookUrl`, `webhookSecret`, `isWebhookActive`
- Legal entity requisites: `companyName`, `inn`, `kpp`, `legalAddress`
- API Key management: `generateApiKey()`, `resetApiKey()`

### Deposit Promo Code API / Action
- Promo code validation action: `applyPromoCode({ code: string, amountCents: number })` -> returns bonus/discount details in cents

## Code Layout
- `src/actions/` — Server Actions for order creation, refill requests, profile settings, promo codes
- `src/app/` — Client dashboard pages (`new-order`, `orders`, `settings`, `deposit`) for SMMplan & SMMflux
- `src/components/` — UI components (forms, tables, cards, inputs)
- `prisma/schema.prisma` — Database models (`User`, `Order`, `Service`, `PromoCode`, `Refill`, etc.)
