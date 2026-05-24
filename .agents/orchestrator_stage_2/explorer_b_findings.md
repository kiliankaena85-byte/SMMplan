# Explorer B Audit Report: Input Validation & Tailwind/WCAG Compliance

This report details the read-only deep-dive audit of the Smmplan admin panel (`/admin/*`) focusing on (1) Input Validation Bounds & Zod schemas, and (2) Tailwind 4 token compliance & WCAG 2.2 AA Dark Mode contrast ratio.

---

## 1. Input Validation Bounds & Zod Schemas

Across the server actions (`src/actions/admin/**/*.ts`) and validation files (`src/validators/admin.validators.ts`), several parameters lack rigorous bound checking, and certain endpoints omit Zod validation altogether at the API entry boundary.

### A. Missing Limits and Negative Bounds in Financial / Budget Actions

#### 1. Support Member Trust Budget Update
* **File:** `src/actions/admin/team.ts` (Lines 9-12, 14-51)
* **Code Range:**
  ```typescript
  const limitSchema = z.object({
    userId: z.string().min(1),
    limit: z.coerce.number().int(),
  });
  ```
* **Explanation:** `limit` (the trust budget in cents allocated to support staff) is validated only as an integer via `z.coerce.number().int()`. There is no check that the limit is positive or zero (e.g. `.min(0)`), nor is there an upper safety limit. An admin could accidentally set a negative budget (preventing support staff from doing any work) or an extremely high budget, bypassing security designs.

#### 2. Manual Client Balance Adjustments
* **File:** `src/validators/admin.validators.ts` (Lines 4-8) and `src/actions/admin/users.ts` (Lines 18-57)
* **Code Range:**
  ```typescript
  export const updateBalanceSchema = z.object({
    userId: z.string().min(1),
    amount: z.coerce.number().int(),
    reason: z.string().min(1)
  });
  ```
* **Explanation:** While the `EscrowService` handles negative amounts differently (allowing them as they represent refunds/deductions rather than additions), there is no lower bound validation at the parser boundary. Moreover, `reason` has only a `.min(1)` check, allowing arbitrary length strings without truncation or trimming before parsing.

#### 3. Personal Client Discount Settings
* **File:** `src/actions/admin/clients.ts` (Lines 24-28, 36-75)
* **Code Range:**
  ```typescript
  const discountSchema = z.object({
    userId: z.string().min(1),
    discount: z.number().min(0).max(MAX_DISCOUNT),
    endsAt: z.string().datetime().optional(), // ISO 8601
  });
  ```
* **Explanation:** While the discount percentage itself is correctly bounded to `MAX_DISCOUNT` (50%), `endsAt` is validated as an optional datetime string. However, there is no check verifying if `endsAt` is in the future. Past datetime strings will succeed parsing but render the discount expired immediately, which should be caught at the form boundary.

#### 4. Promo Code Creation Bounds
* **File:** `src/actions/admin/marketing.ts` (Lines 10-17, 19-54)
* **Code Range:**
  ```typescript
  const promoCodeSchema = z.object({
    code: z.string().min(1).max(12),
    type: z.enum(['DISCOUNT', 'VOUCHER']),
    discountPercent: z.coerce.number().optional().default(0),
    amount: z.coerce.number().int().optional().default(0),
    maxUses: z.coerce.number().int().optional().default(1),
    expiresAt: z.string().optional().transform(v => v ? new Date(v) : null)
  });
  ```
* **Explanation:** 
  * `discountPercent` has no min or max limit checks (e.g. `.min(0).max(100)`). A negative value could increase the order price, while a value >100% would result in clients getting paid for ordering.
  * `amount` has no min or max checks. A negative voucher amount could deduct funds or cause issues in the wallet operation.
  * `maxUses` has no min limit check. A negative or zero value would make the code unusable or behave unpredictably.

#### 5. Accounting System Settings (Tax & OPEX)
* **File:** `src/actions/finance/settings.ts` (Lines 10-13, 15-34)
* **Code Range:**
  ```typescript
  const financeSettingsSchema = z.object({
    taxRate: z.coerce.number().optional().default(0),
    opexMonthly: z.coerce.number().optional().default(0)
  });
  ```
* **Explanation:** `taxRate` and `opexMonthly` have no bounds checks whatsoever. An admin could input a negative tax rate or opex, reversing the accounting formulas and causing financial reporting anomalies.

---

## 2. Missing Zod Validation on Server Action Entry Points

### A. Order Status Overrides and Partial Refund Execution
* **File:** `src/actions/admin/orders.ts` (Lines 93-157)
* **Code Range:**
  ```typescript
  export async function setOrderStatusAction(
    orderId: string,
    status: OrderStatus,
    remains?: number
  ) { ... }
  ```
* **Explanation:** This critical server action manually alters order states and triggers partial balance refunds to client wallets. However, the incoming parameters are never parsed using a Zod schema at the function entry point. At runtime, arbitrary string parameters can bypass TypeScript checks. If `remains` is negative, the partial refund math in `calculatePartialRefund` can behave incorrectly or trigger a larger refund than allowed.
* *Note:* Similar lack of validation exists in `forceCompleteOrderAction` (lines 163-207), `getFailoverPreview` (lines 283-350), and `manualRerouteOrder` (lines 352-465) which receive parameters as raw, unvalidated arguments.

### B. Provider Catalog Sync & Import
* **File:** `src/actions/admin/providers/import-cherry-pick.ts` (Lines 32-155, 251-265)
* **Code Range:**
  ```typescript
  export async function fetchPaginatedExternalServices(
      providerId: string,
      filters: any,
      page: number,
      pageSize: number
  ) { ... }
  
  export async function importSelectedServices(
      externalIds: string[], 
      categoryId: string, 
      defaultMarkup: number, 
      providerId: string
  ) { ... }
  ```
* **Explanation:** These server actions process pagination filters and select provider services for catalog import. None of the entry arguments are parsed via Zod. `defaultMarkup` has no minimum safety limits (e.g. Safety Floor checks), and array sizes are unbounded at the API layer.

### C. Promo Code Toggles and Payouts
* **File:** `src/actions/admin/marketing.ts` (Lines 56-74, 76-94, 96-112)
* **Code Range:**
  ```typescript
  export async function processReferralPayout(userId: string, amount: number) { ... }
  ```
* **Explanation:** `processReferralPayout` triggers financial transactions (transferring referral earnings to the client's main balance). However, `amount` is not validated via a Zod schema at the action entry boundary. (Although `adminMarketingService.processPayout` restricts the payout to exactly equal the user's current referral balance, validation at the entry layer is a critical defense-in-depth).

---

## 3. Over-reliance on Loose Type Casting in Global Settings

### A. System Settings Loose Schema
* **File:** `src/validators/admin.validators.ts` (Lines 41-70)
* **Code Range:**
  ```typescript
  export const globalSettingsSchema = z.object({
    maintenanceMode: z.any().transform((val) => val === 'true' || val === 'on'),
    siteName: z.any().transform((v) => (typeof v === 'string' && v.trim() ? v : 'Smmplan')),
    siteDescription: z.any().transform((v) => (typeof v === 'string' ? v : '')),
    ...
  });
  ```
* **Explanation:** String inputs like `siteName`, `siteDescription`, `legalCompanyName`, and contact details rely on `z.any().transform(...)` to check types dynamically. None of these fields enforce maximum length constraints or sanitize the input strings at the parser level. An admin could submit extremely long values, triggering buffer overhead, database column overflow, or rendering layout breaks in the client UI.

### B. Missing Role Enum Constraints
* **File:** `src/validators/admin.validators.ts` (Lines 36-39)
* **Code Range:**
  ```typescript
  export const roleSchema = z.object({
    userId: z.string().min(1),
    role: z.string().min(1),
  });
  ```
* **Explanation:** The `role` field has no strict enum check (e.g. `z.enum(['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT', 'CLIENT'])`). While downstream logic checks roles for administrative changes, the parser allows arbitrary strings to pass through, creating data inconsistency risks in the database.

---

## 4. Tailwind 4 globals.css Compliance & WCAG 2.2 AA Contrast

The design system of the Smmplan admin panel generally conforms to global CSS theme tokens. However, the role badge colors used in the layout sidebar present compliance gaps under Tailwind 4 and contrast issues.

### A. Typo Violating Tailwind Class Parsing
* **File:** `src/app/admin/layout.tsx` (Line 57)
* **Code Line:**
  ```typescript
  SUPPORT: { label: 'Саппорт', color: 'bg-muted/500/40 text-slate-300 border-slate-500/30' },
  ```
* **Explanation:** The utility `bg-muted/500/40` is syntactically invalid. Under Tailwind CSS, the opacity modifier format is `color/opacity`. The double slash (`/500/40`) makes the class unparsable, causing the background color to fail to render entirely, which breaks the visual consistency of the Support badge.

### B. Missing Theme Color in Tailwind 4 Configuration
* **File:** `src/app/admin/layout.tsx` (Line 56)
* **Code Line:**
  ```typescript
  MANAGER: { label: 'Менеджер', color: 'bg-success/20 text-emerald-400 border-emerald-500/30' },
  ```
* **Explanation:** The manager badge relies on `bg-success/20`. However, a check of `src/app/globals.css` reveals that the `success` color is **not defined** anywhere inside the `@theme` block. In Tailwind CSS v4, any color utility referencing an undefined theme token (like `bg-success`) will be ignored by the compiler, leaving the Manager badge with no background color.

### C. Low Color Contrast Ratio in Sidebar Badges (WCAG 2.2 AA)
* **File:** `src/app/admin/layout.tsx` (Lines 53-58)
* **Code Range:**
  ```typescript
  OWNER:   { label: 'Владелец',  color: 'bg-primary/20 text-indigo-300 border-primary/30' },
  ADMIN:   { label: 'Админ',     color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  MANAGER: { label: 'Менеджер',  color: 'bg-success/20 text-emerald-400 border-emerald-500/30' },
  SUPPORT: { label: 'Саппорт',   color: 'bg-muted/500/40 text-slate-300 border-slate-500/30' },
  ```
* **Background Context:** The admin sidebar has a dark slate-950 background (`bg-slate-950/98` in `src/components/admin/sidebar.tsx` line 47), which renders near-black (`#020617`).
* **Contrast Audits:**
  1. **Owner Badge (`text-indigo-300` on `#020617`):** The color `text-indigo-300` (`#c7d2fe`) on a slate-950 backdrop has a contrast ratio of ~10.5:1, which satisfies the WCAG AA requirement (>= 4.5:1).
  2. **Admin Badge (`text-sky-400` on `#020617`):** The color `text-sky-400` (`#38bdf8`) on a slate-950 backdrop has a contrast ratio of ~9.0:1, which is fully compliant.
  3. **Manager Badge (`text-emerald-400` on `#020617`):** The color `text-emerald-400` (`#34d399`) on slate-950 has a contrast ratio of ~9.3:1, which is compliant.
  4. **Support Badge (`text-slate-300` on `#020617`):** The color `text-slate-300` (`#cbd5e1`) on slate-950 has a contrast ratio of ~11.8:1, which is compliant.
* **Light Mode Sidebar Warning:** If a light theme is enabled (`[data-theme*="light"]`), the sidebar inherits custom styling or transparent themes where the backdrop is a very light slate-50 (`#f8fafc`).
  * In this scenario, text colors like `text-indigo-300` (`#c7d2fe`) and `text-sky-400` (`#38bdf8`) on a light background fail WCAG AA contrast guidelines completely (ratios drop below 2.0:1). Contrast must be checked dynamically using theme variables instead of hardcoding specific light colors on dark/light elements.
