# Stage 4 Hardening Requirements Analysis Report

**Prepared by:** Explorer Agent
**Date:** May 24, 2026
**Target Workspace:** `d:\SMM_plan_2`

---

## 1. Support Panel Enhancement (R1)

### 1.1 Support Panel & Ticket Chat File Locations
The ticket system implementation is mapped to the following files:
*   **Ticket Admin Main Dashboard:** `src/app/admin/tickets/page.tsx`
    *   *Line 1-32:* Server component retrieving list of tickets and staff role verification.
*   **Ticket Unified Workspace component:** `src/app/admin/tickets/components/unified-workspace.tsx`
    *   Contains the split-pane ticket UI, managing the active ticket view, message flow, template selector, and order actions drawer.
*   **Client Profile Sidebar:** `src/components/support/ClientProfileSidebar.tsx`
    *   *Lines 10-128:* Displays client's lifetime spend, discounts, B2B details, and operator notes (internal notes).
*   **Omnichannel Support Routing:** `src/bot/` (Telegram Bot scenes and listener setup for omnichannel support mapping client's Telegram ID to support tickets).

### 1.2 Global Styles & Theme Configuration
The application styling uses Tailwind CSS v4.0.0 and is configured in `src/app/globals.css`.
*   The warm/amber theme colors are defined in the CSS `@theme` block:
    *   `--color-amber-50`: `#fffbeb`
    *   `--color-amber-100`: `#fef3c7`
    *   `--color-amber-200`: `#fde68a`
    *   `--color-amber-400`: `#fbbf24`
    *   `--color-amber-500`: `#f59e0b`
    *   `--color-amber-600`: `#d97706`
*   Current theme mapping: `text-foreground`, `bg-background`, `bg-card`, etc., map directly to semantic tokens to avoid hardcoded inline colors in React components (compliant with `AGENTS.md` Design System constraints).

### 1.3 Recommended UI Enhancements Design
For a polished support workspace, the `ClientProfileSidebar` and `UnifiedWorkspace` should include:
1.  **Lifetime Metrics & Support Limits:** Render `supportLimitCents` and `supportSpentTodayCents` prominently to prevent support operators from exceeding their daily budget allocations.
2.  **Order Details Inline Drawer:** Ensure deep context is retained without page hopping by displaying orders inside a sliding overlay component.
3.  **Preset Quick Responses Integration:** Load templates from `SupportTemplate` model via direct action.

---

## 2. Auto-pricing & Loss Prevention (R2)

### 2.1 Code Mapping
*   **USD/RUB Rate Fetching:** `src/services/system/cbr-rate.service.ts`
    *   *Lines 1-89:* Fetches rate from CBR XML API, parses it, applies the banking spread buffer (`CURRENCY_SPREAD_BUFFER = 0.03` or 3%), and saves it in `SystemSettings` under `exchangeRateUSD`.
*   **Provider Synchronization Action:** `src/actions/admin/providers/sync-action.ts`
    *   *Lines 20-132:* `adminSyncProviderCatalog` imports curated services, fetches from primary provider via `providerService.getProviderInstance(pDbRecord)`, compares rate values, recalculates retail pricing in RUB, and updates values in chunks via `$transaction` loops.
*   **Business Post-Sync rules:** `src/services/providers/post-sync-rules.ts`
    *   *Lines 1-150:* Applies custom category cleaning rules post-sync.
*   **Elastic Quarantine Service:** `src/services/providers/quarantine.service.ts`
    *   *Trigger A (Immediate Failures):* Tracks API errors (timeouts/500s). >= 5 errors in 1h triggers a 2h quarantine cooldown.
    *   *Trigger B (Silent Failures):* If in the last 12 hours >= 5 orders are CANCELED from >= 3 distinct users and Cancel Rate > 30%, activates progressive cooldown backoff quarantine (30 mins -> 2 hours -> 12 hours).
    *   *Trigger C (Stuck Orders):* >= 5 orders pending/in progress for > 24 hours triggers a Telegram alert without auto-disabling.

### 2.2 Pricing Safety Engine Evaluation
1.  **Margin Protection Formula:**
    Calculated via `calculateSafetyFloorCents` in `src/lib/financial-constants.ts`:
    $$\text{SafetyPrice} = \frac{\text{Cost} \times (1 + \text{SAFETY\_FLOOR\_MARKUP})}{1 - \text{TOTAL\_MANDATORY\_DEDUCTIONS}}$$
    *   $\text{SAFETY\_FLOOR\_MARKUP} = 1.0$ (Minimum x2 multiplier).
    *   $\text{TOTAL\_MANDATORY\_DEDUCTIONS} = 0.145$ (6% USN + 5% VAT + 3.5% YooKassa transaction maximum fees).
    *   This forces the system to lock retail price at $\ge 2.34 \times \text{ себестоимость}$ in cents, guaranteeing safety.
2.  **Rate Spike Isolation:**
    In `adminSyncProviderCatalog` (`src/actions/admin/providers/sync-action.ts`), if `newRate` exceeds current rate by more than `SYNC_ANOMALY_THRESHOLD` (20%), the service must be quarantined by setting `isQuarantined: true`, storing the proposed rate in `pendingRate`, and requesting admin manual approval in `/admin/catalog/quarantine`.

---

## 3. Financial Dashboard Block (R3)

### 3.1 Code Mapping
*   **Admin Dashboard View:** `src/app/admin/dashboard/page.tsx`
    *   *Lines 18-253:* Renders metrics (`revenueGross`, `profitNet`, `marginPercentage`, `totalLiability`) by reading from `accountingService.getMetrics()`.
*   **Accounting Service:** `src/services/financial/accounting.service.ts`
    *   *Lines 20-137:* `getMetrics` computes:
        *   `revenueGross` (sum of successful payments)
        *   `gatewayFees` (3.5% for yookassa, 1% for cryptobot)
        *   `refunds` (sum of partial/canceled order refunds)
        *   `cogs` (sum of delivered order cost)
        *   `taxes` (based on `taxRate` and `marginGross`)
        *   `profitNet` = `marginGross - taxes - opex`
        *   `effectiveTaxRate` = `isVatThresholdExceeded ? baseTaxRate + 5% : baseTaxRate` (recalculated if annual revenue exceeds 20 million RUB).

### 3.2 USN Tax Scheme Integration Proposal
Currently, taxes are hardcoded to the "Income minus Expenses" model (calculated on `marginGross`):
```typescript
const taxes = Math.round((marginGross > 0 ? marginGross : 0) * (effectiveTaxRate / 100));
```
In Russia, USN has two distinct models:
1.  **USN "Income" (УСН "Доходы" - 6.0%):** Tax is paid on full gross revenue.
    $$\text{Taxes} = \text{revenueGross} \times \frac{\text{taxRate}}{100}$$
2.  **USN "Income minus Expenses" (УСН "Доходы минус Расходы" - 15.0%):** Tax is paid on net profit margin.
    $$\text{Taxes} = (\text{revenueGross} - \text{cogs} - \text{gatewayFees} - \text{opex}) \times \frac{\text{taxRate}}{100}$$

#### Recommended Database Updates (`prisma/schema.prisma`):
```prisma
enum UsnScheme {
  INCOME
  INCOME_EXPENSES
}

model SystemSettings {
  // ...
  usnScheme UsnScheme @default(INCOME_EXPENSES)
}
```

#### Proposed Code Replacement in `AccountingService.getMetrics` (`src/services/financial/accounting.service.ts`):
```typescript
const usnScheme = settings?.usnScheme ?? 'INCOME_EXPENSES';
let taxes = 0;

if (usnScheme === 'INCOME') {
  // УСН "Доходы" - tax applied on gross revenue directly (without deducting COGS/fees)
  taxes = Math.round(revenueGross * (effectiveTaxRate / 100));
} else {
  // УСН "Доходы минус Расходы" - tax applied on gross margin
  taxes = Math.round((marginGross > 0 ? marginGross : 0) * (effectiveTaxRate / 100));
}
```

---

## 4. Balance Verification (R4)

### 4.1 Schema Analysis
In `prisma/schema.prisma`, double-entry balance verification is fully supported by:
*   `User.balance` (BigInt): Stores user's current spending power in cents.
*   `User.quarantineBalance` (BigInt): Stores Escrow quarantined funds.
*   `LedgerEntry` (Model):
    *   `userId` (String): Owner of the balance.
    *   `amount` (BigInt): Cents amount (positive credit, negative debit).
    *   `status` (String): `APPROVED`, `QUARANTINE`, or `REJECTED`.
    *   `idempotencyKey` & `transactionType`: Prevent duplicate entries.

Currently, **no automated cron/verifier script** reconciles the balance values.

### 4.2 Proposing Balance Verifier Script (`src/utils/balance-verifier.ts`)
To secure users' assets and detect anomalies, a balance verifier utility must be written:
1.  Sum all `LedgerEntry` records where `status = 'APPROVED'` for each active user.
2.  Compare the sum to `User.balance`.
3.  If they diverge, record a critical alert and suspend the user's account automatically to prevent fractional reserves or exploitation of balance race conditions.

#### Proposed Implementation Code:
```typescript
import { db } from '@/lib/db';
import { sendAdminAlert } from '@/lib/notifications';

export interface BalanceReconciliationResult {
  userId: string;
  email: string;
  userBalance: bigint;
  ledgerSum: bigint;
  discrepancy: bigint;
}

export class BalanceVerifier {
  /**
   * Reconciles balances for all active users.
   * If a discrepancy is found, triggers an alert and suspends the user.
   */
  static async verifyAllBalances(): Promise<BalanceReconciliationResult[]> {
    const discrepancies: BalanceReconciliationResult[] = [];
    const users = await db.user.findMany({
      where: { isActive: true, isDeleted: false },
      select: { id: true, email: true, balance: true }
    });

    for (const user of users) {
      // Sum all approved ledger transactions for this user
      const agg = await db.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: {
          userId: user.id,
          status: 'APPROVED'
        }
      });

      const ledgerSum = agg._sum.amount ?? 0n;
      const discrepancy = user.balance - ledgerSum;

      if (discrepancy !== 0n) {
        discrepancies.push({
          userId: user.id,
          email: user.email,
          userBalance: user.balance,
          ledgerSum,
          discrepancy
        });

        // 🚨 CRITICAL SANCTION: Auto-quarantine user account
        await db.user.update({
          where: { id: user.id },
          data: {
            isActive: false,
            adminNote: `[CRITICAL DISCREPANCY] Автоматическая блокировка: баланс (${user.balance}) не сходится с реестром (${ledgerSum}). Разница: ${discrepancy} центов.`
          }
        });

        await sendAdminAlert(
          `🚨 [Balance Audit] Обнаружено расхождение баланса!\nЮзер: ${user.email} (${user.id})\nБаланс в User: ${(Number(user.balance) / 100).toFixed(2)} ₽\nСумма в Ledger: ${(Number(ledgerSum) / 100).toFixed(2)} ₽\nРазница: ${(Number(discrepancy) / 100).toFixed(2)} ₽\nДействие: Аккаунт заблокирован.`
        );
      }
    }

    return discrepancies;
  }
}
```

---

## 5. Visual QA Playwright (R5)

### 5.1 Playwright Configuration
Playwright is fully set up in the root workspace:
*   **Config file:** `playwright.config.ts`
    *   *Line 7:* Test directory matches `./e2e` folder.
    *   *Lines 10-13:* Expect config uses native `toHaveScreenshot` visual verification with `maxDiffPixelRatio: 0.01` (allowing at most 1% pixel mismatch).
    *   *Lines 32-39:* Automatically starts the Next.js production server for E2E validation: `npx dotenv -e .env.test -- npm run start`.

### 5.2 Synthetic Visual UX Audit Lab
A powerful visual audit framework exists under `scripts/synthetic-ux-lab/`:
1.  **`scripts/synthetic-ux-lab/capture-all-pages.ts`**:
    *   Uses Playwright to log in via JWT and capture full-page Retina screenshots (2x scale) of:
        *   `/dashboard/new-order`
        *   `/dashboard/add-funds`
        *   `/dashboard/tickets`
    *   Saves desktop (1280px) and mobile (375px) screenshots to the designated brain artifact directory.
2.  **`scripts/synthetic-ux-lab/visual-audit-cli.ts`**:
    *   Loads screenshots, converts to base64, and sends them to the Gemini API (`gemini-2.5-flash`).
    *   Emulates a **6-expert synthetic focus group** (DEV-QA, UX Inspector, Arbitrageur, Blogger, Product Manager, Junior Frontend) auditing the UI for layout consistency, accessibility (WCAG 2.2 AA touch targets $\ge 44$px), color halation, and dark theme Slate compliance.
    *   Validates results against a **UX Quality Gate** (must score $\ge 7.0/10$ and be fully WCAG compliant or the build fails with Exit Code 1).

### 5.3 Proposing a Native E2E Visual Regression Test
To complement the synthetic focus group, we can add native E2E visual regression tests inside `./e2e` using Playwright's `toHaveScreenshot`.

#### Proposed E2E Test Suite (`e2e/visual-regression.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression QA Suite', () => {
  test('New Order page visual comparison', async ({ page }) => {
    await page.goto('/dashboard/new-order');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('new-order-page.png', {
      fullPage: true,
      mask: [page.locator('.tabular-nums')] // mask dynamic numerical values like balances/rates
    });
  });

  test('Support Center page visual comparison', async ({ page }) => {
    await page.goto('/dashboard/tickets');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('support-center-page.png', {
      fullPage: true
    });
  });
});
```

---

## 6. Summary and Action Plan

All components of the Stage 4 Hardening are fully scoped, structured, and ready to be integrated by the Implementer agent. The project architecture strictly isolates B2B models, maintains safety boundaries under `AGENTS.md` guidelines, and provides robust verification suites.
