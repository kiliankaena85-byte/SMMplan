# Changes Report — Financial Dashboard Analytics (Milestone 3)

## 1. Database Schema Extension (`prisma/schema.prisma`)
- Added `UsnScheme` enum:
  ```prisma
  enum UsnScheme {
    INCOME
    INCOME_EXPENSES
  }
  ```
- Extended `SystemSettings` with `usnScheme` field defaulting to `INCOME_EXPENSES`:
  ```prisma
  model SystemSettings {
    ...
    usnScheme UsnScheme @default(INCOME_EXPENSES)
  }
  ```

## 2. Settings Validation & Actions (`src/validators/admin.validators.ts`, `src/actions/admin/settings.ts`)
- Added `usnScheme` support in `globalSettingsSchema` using Zod enum validation.
- Wired the selector in the server action `updateGlobalSettings` to securely persist the selected scheme inside the database and trigger real-time cache invalidation using `revalidateTag('settings')`.

## 3. General Settings View Component (`src/app/admin/settings/general-settings.tsx`)
- Integrated a premium, fully accessible drop-down selector `<select>` with localized labels:
  - **УСН «Доходы»** (Tax on gross revenue)
  - **УСН «Доходы минус Расходы»** (Tax on gross margin)
- Positioned perfectly inside the core settings block under the USD/RUB rate config.

## 4. Accounting Service Refactoring (`src/services/financial/accounting.service.ts`)
- Added `usnScheme`, `annualRevenue`, `effectiveTaxRate`, and `isVatThresholdExceeded` to the financial metrics response interface.
- Refactored `getMetrics` to calculate the annual calendar-year revenue and automatically apply a 5% VAT rate surcharge if the 20 million rubles threshold is exceeded.
- Added dynamic USN scheme tax calculation:
  - `INCOME`: Tax applied to `revenueGross`
  - `INCOME_EXPENSES`: Tax applied to `marginGross` (with boundary checks for sub-zero margin states).
- Rounded the output results cleanly using `Math.round` to prevent fractional floating cent errors.

## 5. Premium Dashboard Analytics Block (`src/app/admin/dashboard/page.tsx`)
- Built and styled a premium, high-density 5-card financial analytics block displaying:
  1. **«Поступило (Выручка)»**: Successful revenue gross sum (divided by 100 to show in rubles).
  2. **«Комиссии кассы»**: Real database aggregation of YooKassa 3% payment gateway commission fees.
  3. **«Закупки (Расход)»**: Cumulative себестоимость (`providerCost`) of successful provider orders.
  4. **«Расчетный налог (УСН)»**: Dynamic tax value conforming to the active USN scheme selection and a clean Russian tooltip explanation of tax quarters.
  5. **«Чистая прибыль»**: Color-coded traffic-light indicator with net margin thresholding:
     - **Green** (>= 15% net profit margin): "Стабильная и высокая доходность"
     - **Yellow** (> 0% and < 15%): "Низкая маржинальность (высокие расходы)"
     - **Red** (<= 0%): "Критический убыток! Расходы превышают доходы"

## 6. Comprehensive Vitest Coverage (`src/services/financial/accounting.service.test.ts`)
- Added 5 exhaustive test suites covering:
  - Base tax rate calculation under 20M limit.
  - Surcharged tax rate calculation >= 20M limit.
  - Correct tax calculation under `INCOME` scheme (on gross revenue).
  - Correct tax calculation under `INCOME_EXPENSES` scheme (on gross margin).
  - Decimal rounding invariance checks preventing float cent leaks.
