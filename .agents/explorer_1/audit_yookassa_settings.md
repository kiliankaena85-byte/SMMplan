# Audit Report: YooKassa Credentials and Encryption Verification
**Date**: 2026-05-23T12:16:03+03:00  
**Auditor**: Explorer 1 (YooKassa Settings & Encryption Auditor)  
**Status**: COMPLETE (Read-Only Deep Dive Audit)

---

## 1. Executive Summary

This read-only audit thoroughly investigates the YooKassa credential management, database storage, encryption logic, and runtime toggle behavior across the **Smmplan** codebase. The objective was to confirm whether the system securely supports test/live YooKassa keys, encrypts/decrypts them cleanly using a hardened `VaultService`, allows seamless sandbox toggling without server restarts, and maintains consistent behavior across the main web server and separate BullMQ worker processes.

While the foundation is highly secure and standard-compliant (utilizing AES-256-GCM, Zod validation, and active Next.js tag-based cache revalidation), **four critical gaps** were identified that could lead to TypeScript compilation errors, cross-process test mode synchronization delays, or API failures during E2E payment sandbox tests. 

We have provided specific, drop-in code fix designs to address these findings.

---

## 2. Codebase Map: Key Locations and Responsibilities

The YooKassa settings, encryption, and checkout architectures are localized across the following critical files:

| File Path | Component / Service | Responsibility |
| :--- | :--- | :--- |
| `prisma/schema.prisma` | PostgreSQL Schema | Database definition for global settings and credentials. |
| `src/lib/vault.ts` | `VaultService` | AES-256-GCM authenticated encryption and decryption. |
| `src/lib/settings.ts` | `SettingsProvider` | Memory-cached dynamic settings access and toggle operations. |
| `src/actions/admin/settings.ts` | Admin Settings Action | Handle form updates from the admin settings panel. |
| `src/validators/admin.validators.ts` | Settings Schema | Zod schema validating incoming configuration payloads. |
| `src/app/admin/settings/integrations-settings.tsx` | Integrations tab UI | Separate forms for Live and Test YooKassa configurations. |
| `src/app/admin/settings/page.tsx` | Admin Settings Page | Root view for tab navigation, including system & integrations. |
| `src/components/admin/test-mode-panel.tsx` | Test Mode Toggle UI | Interactive banner to toggle sandbox/test mode. |
| `src/services/admin/settings.service.ts` | `SettingsService` | Database actions (upsert/update) for settings. |
| `src/services/financial/payment-gateway.service.ts` | `PaymentGatewayFactory` | Unified gateway API mapping and mock sandbox redirects. |
| `src/actions/user/top-up.action.ts` | User Balance top-up | Top-up actions for adding funds via card/crypto. |
| `src/services/financial/unified-payment.service.ts` | `UnifiedPaymentService` | Direct deposit payment generation for Bot top-ups. |

---

## 3. Direct Observations & Evidence Chain

### Finding A: Prisma Schema & Global Settings
* **Observation**: In `prisma/schema.prisma` (lines 361–369), the `SystemSettings` model explicitly supports both test and production keys:
  ```prisma
  // Payment Gateways (Secrets are AES-256-GCM encrypted in DB)
  // Production keys
  yookassaShopId        String?
  yookassaSecretKey     String?
  // Test keys (used when isTestMode = true)
  yookassaTestShopId    String?
  yookassaTestSecretKey String?
  cryptoBotToken        String?
  ```
* **Observation**: In `src/validators/admin.validators.ts` (lines 46–49), `globalSettingsSchema` validates these exact keys:
  ```typescript
  yookassaShopId: z.string().trim().max(150).nullable().optional(),
  yookassaSecretKey: z.string().trim().max(300).nullable().optional(),
  yookassaTestShopId: z.string().trim().max(150).nullable().optional(),
  yookassaTestSecretKey: z.string().trim().max(300).nullable().optional(),
  ```
* **Observation**: In `src/app/admin/settings/integrations-settings.tsx` (lines 83–137), both test and production settings blocks are supported, rendered separately, and styled interactively based on whether `settings.isTestMode` is active.
* **Conclusion**: The schema, validation schemas, and UI forms successfully support co-existing test and production keys.

---

### Finding B: Vault Encryption (`VaultService`)
* **Observation**: In `src/lib/vault.ts` (lines 30–84), `VaultService` is implemented as a static helper utilizing standard Node.js `crypto` library.
  - Encryption is performed using `'aes-256-gcm'` (authenticated symmetric encryption).
  - A random IV of `16` bytes is generated for every call: `crypto.randomBytes(IV_LENGTH)`.
  - The encrypted payload is returned as `ivHex:authTagHex:encryptedText`.
  - Decryption strictly checks for `parts.length === 3` to support legacy data gracefully.
  - Decryption failures throw explicit errors to protect against silent failure chains due to rotated keys.
* **Observation**: In `src/actions/admin/settings.ts` (lines 127–130), keys are encrypted on save:
  ```typescript
  if (yookassaShopId) dataToUpdate.yookassaShopId = yookassaShopId;
  if (rawYookassaSecret) dataToUpdate.yookassaSecretKey = VaultService.encrypt(rawYookassaSecret);
  if (yookassaTestShopId) dataToUpdate.yookassaTestShopId = yookassaTestShopId;
  if (rawYookassaTestSecret) dataToUpdate.yookassaTestSecretKey = VaultService.encrypt(rawYookassaTestSecret);
  ```
* **Observation**: In `src/lib/settings.ts` (lines 81–99), keys are decrypted on retrieve:
  ```typescript
  yookassaSecretKey: secretKeyRaw ? VaultService.decrypt(secretKeyRaw) : null,
  ```
* **Conclusion**: AES-256-GCM encryption is correctly implemented, and credentials are encrypted on write (in the Server Action) and decrypted on read.

---

### Finding C: Settings Cache & Sandbox Key Resolving
* **Observation**: In `src/lib/settings.ts` (lines 31–66), `SettingsProvider` caches settings using Next.js `unstable_cache` with tag `['settings']` and a `300` second (5 min) TTL.
* **Observation**: In `src/lib/settings.ts` (lines 81–99), `getPaymentSecrets` resolves the active credential based on `isTestMode`:
  ```typescript
  const useTestKeys = settings.isTestMode;
  const shopId = useTestKeys ? (settings.yookassaTestShopId ?? null) : (settings.yookassaShopId ?? null);
  const secretKeyRaw = useTestKeys ? (settings.yookassaTestSecretKey ?? null) : (settings.yookassaSecretKey ?? null);
  ```
* **Observation**: Toggling the test mode in `src/components/admin/test-mode-panel.tsx` via `adminToggleTestMode` invokes `SettingsManager.setTestMode(enable)` which:
  1. Writes the new state to Postgres (`db.systemSettings.upsert`).
  2. Writes the state to Redis (`redis.set('settings:isTestMode', ...)`).
  3. Calls `revalidateTag('settings')` to purge Next.js server-side cached values.
  4. Forces `window.location.reload()` on the client to refresh the interface.
* **Conclusion**: Toggling test mode updates payment keys instantly in the Next.js server context without needing a server restart.

---

## 4. Critical Architectural Gaps

We have identified **four technical gaps** that must be resolved before proceeding:

### Gap 1: TypeScript Method Signature Mismatch in Settings Service
* **File**: `src/services/admin/settings.service.ts` (lines 79–105)
* **Problem**: The TypeScript input typing signature for `updateSystemSettings` is missing both `yookassaTestShopId?: string` and `yookassaTestSecretKey?: string`. Although the internal prisma call `db.systemSettings.upsert` accepts these fields, and the caller cast `dataToUpdate` as `any`, this signature omission is a severe TypeScript gap that violates standard strict-type checks and leaves the codebase fragile.

### Gap 2: Cross-Process Cache Sync Delay (BullMQ Workers)
* **Files**: `src/lib/settings.ts` (lines 168–172), `src/workers/processors/order.processor.ts` (line 28)
* **Problem**: The BullMQ background worker runs in an independent Node.js process (`tsx src/workers/index.ts`). Next.js's `revalidateTag('settings')` call does **not** invalidate memory caches outside Next.js itself. As a result, the worker might continue reading stale settings values for up to 5 minutes. If an administrator toggles test mode to "Live" and a client places an order, the worker might safely fail it thinking it's a test order because of cache delay.
* **Fix Strategy**: Modify `SettingsProvider.isTestMode` to check the Redis key `'settings:isTestMode'` (written by `setTestMode`) directly first. If the key exists, return its value; if not, fall back to Next.js cache. Also, update `getPaymentSecrets()` to resolve `useTestKeys` via `await this.isTestMode()` rather than `settings.isTestMode`.

### Gap 3: User Deposit Top-ups Bypass Sandbox Redirection
* **File**: `src/actions/user/top-up.action.ts` (lines 91–142)
* **Problem**: `createTopUpPaymentAction` does **not** use the `PaymentGatewayFactory`. Instead, it retrieves payment secrets and manually triggers a direct `fetch` to the production API `https://api.yookassa.ru/v3/payments`. If test mode is enabled, it attempts a real API request with test keys, causing external network errors or failing the E2E checkout sandbox emulation completely.
* **Fix Strategy**: In `top-up.action.ts`, check if `isTestMode` is active. If so, return a redirect to `/api/dev/mock-payment` rather than calling the real YooKassa APIs.

### Gap 4: Unified Bot Deposit Payments Bypass Sandbox Redirection
* **File**: `src/services/financial/unified-payment.service.ts` (lines 49–86)
* **Problem**: Similar to Gap 3, `UnifiedPaymentService.createPayment` manually implements standard YooKassa API requests rather than routing through `PaymentGatewayFactory` or supporting the `isTestMode` sandbox redirect. This prevents Telegram bot test deposits from functioning correctly during tests.
* **Fix Strategy**: Add a test mode toggle check to `UnifiedPaymentService.createPayment` to bypass YooKassa API fetch in test/sandbox mode, returning the `/api/dev/mock-payment` URL.

---

## 5. Concrete Code Implementation Proposal

The following diff patches outline precisely how the Worker should execute these fixes:

### Fix 1: Add missing parameters to `updateSystemSettings`
**Target File**: `src/services/admin/settings.service.ts`
```typescript
<<<<
  async updateSystemSettings(data: {
    taxRate?: number;
    opexMonthly?: number;
    maintenanceMode?: boolean;
    siteName?: string;
    siteDescription?: string;
    welcomeMessage?: string;
    yookassaShopId?: string;
    yookassaSecretKey?: string;
    cryptoBotToken?: string;
    exchangeRateUSD?: number;
====
  async updateSystemSettings(data: {
    taxRate?: number;
    opexMonthly?: number;
    maintenanceMode?: boolean;
    siteName?: string;
    siteDescription?: string;
    welcomeMessage?: string;
    yookassaShopId?: string;
    yookassaSecretKey?: string;
    yookassaTestShopId?: string;
    yookassaTestSecretKey?: string;
    cryptoBotToken?: string;
    exchangeRateUSD?: number;
>>>>
```

---

### Fix 2: Optimize Cross-Process Cache Synchronization via Redis
**Target File**: `src/lib/settings.ts`
```typescript
<<<<
  static async getPaymentSecrets(): Promise<DecryptedPaymentSecrets> {
    const settings = await this.getCached();
    const useTestKeys = settings.isTestMode;

    // SECURITY: No fallback to prod keys in test mode.
    // If test keys are not configured, return null — downstream will throw a clear error.
    const shopId = useTestKeys
      ? (settings.yookassaTestShopId ?? null)
      : (settings.yookassaShopId ?? null);
    const secretKeyRaw = useTestKeys
      ? (settings.yookassaTestSecretKey ?? null)
      : (settings.yookassaSecretKey ?? null);
====
  static async getPaymentSecrets(): Promise<DecryptedPaymentSecrets> {
    const settings = await this.getCached();
    const useTestKeys = await this.isTestMode();

    // SECURITY: No fallback to prod keys in test mode.
    // If test keys are not configured, return null — downstream will throw a clear error.
    const shopId = useTestKeys
      ? (settings.yookassaTestShopId ?? null)
      : (settings.yookassaShopId ?? null);
    const secretKeyRaw = useTestKeys
      ? (settings.yookassaTestSecretKey ?? null)
      : (settings.yookassaSecretKey ?? null);
>>>>
```
```typescript
<<<<
  static async isTestMode(): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') return true;
    const settings = await this.getCached();
    return settings.isTestMode;
  }
====
  static async isTestMode(): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') return true;
    try {
      const { redis } = await import('./redis');
      const val = await redis.get('settings:isTestMode');
      if (val !== null) {
        return val === 'true';
      }
    } catch (err) {
      console.warn('[SettingsProvider] Redis fetch failed for isTestMode, falling back to cache:', err);
    }
    const settings = await this.getCached();
    return settings.isTestMode;
  }
>>>>
```

---

### Fix 3: Add Sandbox Redirection to User Deposit Action
**Target File**: `src/actions/user/top-up.action.ts`
```typescript
<<<<
  // --- YooKassa logic ---
  const shopId = secrets.yookassaShopId;
  const secretKey = secrets.yookassaSecretKey;
  if (!shopId || !secretKey) throw new Error("Шлюз ЮKassa не настроен администратором.");

  const payment = await db.payment.create({
    data: {
      userId: session.userId,
      amount: amountCents,
      currency: "RUB",
      status: "PENDING",
      gateway: "yookassa",
      consentIp,
      consentUserAgent
    }
  });

  const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/add-funds?success=1`;

  const payload = {
    amount: { value: amountRub.toFixed(2), currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: successUrl },
    description: `Оплата услуг IT-агентства (Digital Consulting, Счёт: ${payment.id})`,
    metadata: { paymentId: payment.id, userId: session.userId, type: "deposit" }
  };

  const resp = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
      "Idempotence-Key": payment.id
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    console.error("[YooKassa Error]", await resp.text());
    throw new Error("Ошибка создания платежа в шлюзе YooKassa");
  }

  const data = await resp.json();
  
  await db.payment.update({
    where: { id: payment.id },
    data: { gatewayId: data.id }
  });

  return { success: true, paymentUrl: data.confirmation.confirmation_url };
====
  // --- YooKassa logic ---
  const shopId = secrets.yookassaShopId;
  const secretKey = secrets.yookassaSecretKey;
  if (!shopId || !secretKey) throw new Error("Шлюз ЮKassa не настроен администратором.");

  const payment = await db.payment.create({
    data: {
      userId: session.userId,
      amount: amountCents,
      currency: "RUB",
      status: "PENDING",
      gateway: "yookassa",
      consentIp,
      consentUserAgent
    }
  });

  const isTest = await SettingsManager.isTestMode();
  if (isTest || process.env.NODE_ENV === 'test') {
    const mockId = `mock_${Date.now()}`;
    const mockUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/mock-payment?paymentId=${payment.id}`;
    
    await db.payment.update({
      where: { id: payment.id },
      data: { gatewayId: mockId }
    });

    return { success: true, paymentUrl: mockUrl };
  }

  const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/add-funds?success=1`;

  const payload = {
    amount: { value: amountRub.toFixed(2), currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: successUrl },
    description: `Оплата услуг IT-агентства (Digital Consulting, Счёт: ${payment.id})`,
    metadata: { paymentId: payment.id, userId: session.userId, type: "deposit" }
  };

  const resp = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
      "Idempotence-Key": payment.id
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    console.error("[YooKassa Error]", await resp.text());
    throw new Error("Ошибка создания платежа в шлюзе YooKassa");
  }

  const data = await resp.json();
  
  await db.payment.update({
    where: { id: payment.id },
    data: { gatewayId: data.id }
  });

  return { success: true, paymentUrl: data.confirmation.confirmation_url };
>>>>
```

---

### Fix 4: Add Sandbox Redirection to Bot Unified Payment Service
**Target File**: `src/services/financial/unified-payment.service.ts`
```typescript
<<<<
      // 2. Generate Payment Link
      if (gateway === 'yookassa') {
        const secrets = await SettingsManager.getPaymentSecrets();
        const shopId = secrets.yookassaShopId;
        const secretKey = secrets.yookassaSecretKey;

        if (!shopId || !secretKey) {
            console.error('[UnifiedPayment] YooKassa not configured');
            return { success: false, error: 'Payment gateway unconfigured' };
        }

        const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        const payload = {
          amount: { value: amountRub.toFixed(2), currency: 'RUB' },
          capture: true,
          confirmation: { type: 'redirect', return_url: successUrl },
          description,
          metadata: { paymentId: payment.id, userId, ...metadata }
        };

        const resp = await fetch('https://api.yookassa.ru/v3/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'Idempotence-Key': payment.id
          },
          body: JSON.stringify(payload)
        });

        if (!resp.ok) {
          console.error('[UnifiedPayment] YooKassa error:', await resp.text());
          return { success: false, error: 'YooKassa gateway error' };
        }

        const data = await resp.json();
        paymentUrl = data.confirmation.confirmation_url;
        remoteGatewayId = data.id;
====
      // 2. Generate Payment Link
      if (gateway === 'yookassa') {
        const isTest = await SettingsManager.isTestMode();
        if (isTest || process.env.NODE_ENV === 'test') {
          paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || `https://${supportDomain}`}/api/dev/mock-payment?paymentId=${payment.id}`;
          remoteGatewayId = `mock_${Date.now()}`;
        } else {
          const secrets = await SettingsManager.getPaymentSecrets();
          const shopId = secrets.yookassaShopId;
          const secretKey = secrets.yookassaSecretKey;

          if (!shopId || !secretKey) {
              console.error('[UnifiedPayment] YooKassa not configured');
              return { success: false, error: 'Payment gateway unconfigured' };
          }

          const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
          const payload = {
            amount: { value: amountRub.toFixed(2), currency: 'RUB' },
            capture: true,
            confirmation: { type: 'redirect', return_url: successUrl },
            description,
            metadata: { paymentId: payment.id, userId, ...metadata }
          };

          const resp = await fetch('https://api.yookassa.ru/v3/payments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
              'Idempotence-Key': payment.id
            },
            body: JSON.stringify(payload)
          });

          if (!resp.ok) {
            console.error('[UnifiedPayment] YooKassa error:', await resp.text());
            return { success: false, error: 'YooKassa gateway error' };
          }

          const data = await resp.json();
          paymentUrl = data.confirmation.confirmation_url;
          remoteGatewayId = data.id;
        }
>>>>
```

---

## 6. Verification and Test Design

To ensure zero-defect integration, the Worker must run these validation steps:

1. **Type Verification**:
   - Command: `npx tsc --noEmit`
   - Verification: Must resolve without any syntax or signature-mismatch errors in settings service and schemas.

2. **Unit Test Executions**:
   - Command: `npx vitest run test/unit/checkout-bypass.test.ts`
   - Verification: Tests checking unified checkout and credentials resolving must pass cleanly.

3. **E2E Playwright Sandbox Checkout**:
   - Command: `npx playwright test e2e/checkout-yookassa.spec.ts`
   - Verification: Confirms full payment flow redirection to `/api/dev/mock-payment` and successful webhook routing.

This concludes the audit report. The codebase is thoroughly audited and prepared for structural modification.
