# E2E Payment & Order Lifecycle Audit Report

## 1. Executive Summary
This report presents a thorough audit of the End-to-End (E2E) Payment and Order Lifecycle in the **Smmplan** system (as of February 2026). The lifecycle encompasses front-end form validation (`SmartOrderForm`), order and payment initialization (`checkoutAction` server action), payment gateway creation (`PaymentGatewayFactory`), webhook confirmation (`/api/webhooks/yookassa` and `paymentService.confirmPayment`), and background queue dispatching.

We identified **two critical blocking gaps** that cause E2E Playwright test failures (specifically in `e2e/checkout-yookassa.spec.ts`) and proposed bulletproof, architecture-compliant solutions.

---

## 2. Comprehensive Codebase Mapping & Findings

### A. Order & Payment Initialization (`checkoutAction`)
- **File**: `src/actions/order/checkout.ts` (lines 78–466)
- **Role**: Coordinates the entire order placement and transaction creation flow.
- **Workflow Steps**:
  1. **Rate Limiting**: Throttles checkout submissions to 15 requests per 60 seconds (line 84).
  2. **Idempotency Check**: Uses the unique `idempotencyKey` to prevent duplicate submissions, returning the existing order if matched (lines 89-103).
  3. **IDOR & Auth Check**: Restricts the `balance` gateway to logged-in users whose session email matches the order email (lines 105-115).
  4. **Fuzzy URL Validation & Mutation**: Normalizes raw inputs according to platform rules (`mutateLink`) and enforces rigid regex validation matching the service's `targetType` (lines 152-214).
  5. **Frictionless Auto-Registration**: Searches for users by email. If not found, creates a new user inside the database (lines 218–224).
  6. **Loyalty & Pricing Calculation**: Calculates retail prices, applying discount rules and promo codes (lines 226–234).
  7. **Acquiring Limits**: Sets a minimum payment floor of 10 RUB (1000 cents) for card providers (lines 235-240), converting smaller values to balance deposits automatically.
  8. **Prisma Atomic Transaction (`$transaction`)**:
     - Creates `Order` in status `AWAITING_PAYMENT` (lines 260-282).
     - Creates optional second `Order` if a double-linked Media Group is specified (lines 284–308).
     - Creates `Payment` in status `PENDING` (lines 315–326).
     - Links the `Payment` back to the orders (lines 328–340).
  9. **Gateway Dispatching**: Resolves the selected provider via `PaymentGatewayFactory` (line 359).
  10. **Error Rollback**: If the payment gateway API fails to generate a checkout link, the system executes an atomic rollback: sets the payment to `CANCELED`, updates the order status to `ERROR`, and increments the promo code limit back (lines 384–422).
  11. **Auto-Login**: Issues session cookies for newly registered users (lines 424–429).

### B. Payment Gateway Routing (`PaymentGatewayFactory`)
- **File**: `src/services/financial/payment-gateway.service.ts`
- **Role**: Dispatches payment creation requests to YooKassa, CryptoBot, and Balance gateways.
- **Sandbox/Test Redirection (Critical Observation)**:
  - In `YooKassaGateway` (lines 32-38) and `CryptoBotGateway` (lines 124-130), the gateway detects sandbox test contexts:
    ```typescript
    if (params.isTestMode || process.env.NODE_ENV === 'test' || params.email === 'e2e-tester@test.com') {
      return {
        paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/mock-payment?paymentId=${params.paymentId}${params.orderId ? `&orderId=${params.orderId}` : ''}`,
        remoteGatewayId: `mock_${Date.now()}`
      };
    }
    ```
  - This design returns a local URL pointing to the developer bypass endpoint instead of contacting external HTTP acquiring APIs.

### C. Mock Payment Bypass (`/api/dev/mock-payment`)
- **File**: `src/app/api/dev/mock-payment/route.ts` (lines 1–73)
- **Role**: Webhook-bypass helper that simulates successful checkout processing.
- **Workflow**:
  - Hard-blocked in production environments (`process.env.NODE_ENV === 'production'`).
  - Fetches the payment record by `paymentId`.
  - Atomically updates `Payment` to `SUCCEEDED` and linked single/basket `Order` records to `PENDING` (lines 27–52).
  - Inserts a ledger entry into `LedgerEntry` (lines 54–63).
  - Enqueues jobs to `ordersQueue` for downstream worker execution (lines 40–46).
  - Redirects the browser page to `/success`.

### D. YooKassa Webhook Endpoint (`/api/webhooks/yookassa`)
- **File**: `src/app/api/webhooks/yookassa/route.ts` (lines 1–123)
- **Role**: Secure webhook entry point for real-time order processing.
- **Critical Security Constraints Enforced**:
  1. **IP Range Check**: Restricts incoming requests to official YooKassa subnets (`185.75.120.*`, etc.). Bypassed in dev/test modes (lines 15–24).
  2. **Webhook Secret Requirement**: Rejects requests with `500` if `YOOKASSA_WEBHOOK_SECRET` environment variable is not defined (lines 26–30).
  3. **HMAC Signature Check**: Validates that incoming payload matches the SHA256 HMAC digest submitted in the `x-sha256-signature` or `digest` headers using `crypto.timingSafeEqual` (lines 32–66).
  4. **Replay Attack Check**: Validates that the payload is fresh (created within the last 30 minutes) (lines 68–78).
  5. **Integer Currency Parsing**: Converts string decimals (e.g. `'10.00'`) to IEEE 754-safe cents strictly (lines 86-90).
  6. **Call confirmation**: Hands off verified params to `paymentService.confirmPayment` (lines 104-113).

### E. Atomic Payment Confirmation Service (`confirmPayment`)
- **File**: `src/services/financial/payment.service.ts` (lines 6-218)
- **Role**: Coordinates status transitions, ledger operations, and queue dispatching.
- **Sequence Steps**:
  1. **Double-Check Verification**: In production, fetches the status of the remote payment using basic auth directly from YooKassa to block webhook spoofing exploits (lines 27–60).
  2. **Atomic `$transaction` execution**:
     - Performs a lock check to ensure payment has not yet been processed (lines 74–81).
     - Validates that the paid amount matches or exceeds the expected value (lines 83–86).
     - Marks `Payment` as `SUCCEEDED` (lines 92–98).
     - Rejects orphaned webhooks that did not originate from a pending checkout sequence (lines 102–105).
     - Transitions primary and basket `Order` records to `PENDING` (lines 111–178).
     - Interacts with `WalletOps` to credit/charge virtual balances (creating atomic ledger transactions) (lines 131–138, 165–176).
  3. **Downstream Actions**:
     - Invalidates `/dashboard` layouts (line 190).
     - Enqueues activated orders to `ordersQueue` with a 3-minute cooling-off period (lines 193–206).
     - Sends out payment confirmation emails (lines 199–204).
     - Assesses loyalty progression (lines 208–211).

---

## 3. Discovered Gaps & Blockers in E2E Testing

### 🔴 GAP 1: Category Filtering Mismatch in E2E Setup
- **Location**: `e2e/checkout-yookassa.spec.ts` (lines 12–15)
- **Problem**:
  The E2E test seeds a temporary category named `'E2E Telegram Category'`.
  However, `useOrderEngine` enforces category filtering based on matches returned by the link analyzer:
  `const filteredCats = availableCategories.filter(c => matchesSuggestedCategory(c.name, suggestedCategories));`
  When the link `https://t.me/durov` is parsed, the analyzer suggests standard categories like `['Подписчики / Участники', 'Premium Подписчики', ...]`.
  Since the seeded category `'E2E Telegram Category'` does not contain any of these keywords, **it is filtered out of the DOM completely**. The UI falls back to the first matching category (which is `'Автопросмотры'`), and the Playwright selector fails to locate `getByRole('option', { name: /E2E Telegram Service/i })`, throwing a timeout error.

### 🔴 GAP 2: Enforced Webhook Signatures Fail in Test Suites
- **Location**: `src/app/api/webhooks/yookassa/route.ts` (lines 26–36) & `e2e/checkout-yookassa.spec.ts` (lines 156–158)
- **Problem**:
  The webhook endpoint strictly rejects requests if `YOOKASSA_WEBHOOK_SECRET` is not set, or if the `x-sha256-signature` or `digest` headers are missing.
  In `.env.test`, `YOOKASSA_WEBHOOK_SECRET` is not configured. Furthermore, the E2E simulation triggers `request.post('/api/webhooks/yookassa')` without passing any headers, which immediately yields a `401 Missing signature` (or `500 Webhook not configured`) once the test moves past the UI selection.

---

## 4. Suggested Technical Fixes (Handoff to Worker)

### Fix 1: Align E2E Category Name with Suggested Keywords
- **Target**: `e2e/checkout-yookassa.spec.ts` (lines 12-15)
- **Before**:
  ```typescript
  let category = await prisma.category.findFirst({ where: { networkId: network.id, name: 'E2E Telegram Category' } });
  if (!category) {
    category = await prisma.category.create({ data: { name: 'E2E Telegram Category', sort: 1, networkId: network.id } });
  }
  ```
- **After**:
  ```typescript
  let category = await prisma.category.findFirst({ where: { networkId: network.id, name: 'E2E Telegram Subscribers' } });
  if (!category) {
    category = await prisma.category.create({ data: { name: 'E2E Telegram Subscribers', sort: 1, networkId: network.id } });
  }
  ```
- **Rationale**: Since `"E2E Telegram Subscribers"` contains the keyword `"Subscribers"` (which maps to synonyms for `"Подписчики"`), it is correctly matched by `matchesSuggestedCategory` and displayed in the UI.

### Fix 2: Implement Test-Mode Webhook Secret Fallback
- **Target**: `src/app/api/webhooks/yookassa/route.ts` (lines 26–36)
- **Suggested Code Addition**:
  ```typescript
  let webhookSecret = process.env.YOOKASSA_WEBHOOK_SECRET;
  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  
  if (!webhookSecret && isTestEnv) {
    webhookSecret = 'test_webhook_secret_key_123456'; // Robust fallback for E2E suites
  }

  if (!webhookSecret) {
    console.error('[CRITICAL][ACTION REQUIRED] YOOKASSA_WEBHOOK_SECRET is not set. Webhook disabled.');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  ```

### Fix 3: Cryptographically Sign E2E Webhook POST Requests
- **Target**: `e2e/checkout-yookassa.spec.ts` (lines 156-158)
- **Suggested Code Addition**:
  ```typescript
  const crypto = require('crypto');
  const webhookSecret = 'test_webhook_secret_key_123456'; // Align with route fallback
  const rawText = JSON.stringify(webhookPayload);
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawText, 'utf8')
    .digest('hex');

  const webhookResp = await request.post('/api/webhooks/yookassa', {
    data: webhookPayload,
    headers: {
      'x-sha256-signature': signature
    }
  });
  ```
- **Rationale**: Enables full HMAC verification test coverage without skipping security gates during E2E validation.
