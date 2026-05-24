# AUDIT REPORT — PROVIDER SANDBOX INTERCEPTION SYSTEM

This audit report evaluates the Provider Sandbox Interception architecture for Smmplan. It confirms that the system intercepts background worker/webhook calls in test mode to protect real balances, while administrative operations bypass interception to communicate with live API endpoints.

---

## 1. Mission and Context
The objective is to audit the "Provider Sandbox Interception" implementation, identifying how `isTestMode` works, how background queue processors resolve provider configurations, how dev mock-provider API endpoints are constructed and secured, and verifying that admin catalog management remains functional.

---

## 2. Detailed Findings

### A. Provider Service and Factory (`ProviderService`)
- **File Path**: `src/services/providers/provider.service.ts`
- **Logic Details**:
  - Contains `getProviderInstance(config)` (lines 20-25) which directly returns an instance of `UniversalProvider` configured to use the provider's actual API URL (`config.apiUrl`) and decrypted API key (`VaultService.decrypt(config.apiKey)`).
  - Contains `getWorkerProviderInstance(config)` (lines 35-48) which performs sandbox interception:
    ```typescript
    const isTest = await SettingsManager.isTestMode();
    if (isTest) {
      const mockKey = process.env.MOCK_PROVIDER_KEY;
      if (!mockKey) {
        throw new Error('MOCK_PROVIDER_KEY is not set. Configure it in .env to use test mode.');
      }
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return new UniversalProvider(`${baseUrl}/api/dev/mock-provider`, mockKey, config.metadata as any);
    }
    const decryptedKey = VaultService.decrypt(config.apiKey);
    return new UniversalProvider(config.apiUrl, decryptedKey || config.apiKey, config.metadata as any);
    ```
- **Conclusion**: Background-aware execution resolves provider routes dynamically. Test mode intercepts calls and redirects them to the local dev endpoint `/api/dev/mock-provider` using the key from `MOCK_PROVIDER_KEY`.

### B. Test Mode Detection (`isTestMode`)
- **File Path**: `src/lib/settings.ts` (Class `SettingsProvider` and wrapper `SettingsManager`)
- **Logic Details**:
  - `isTestMode` (lines 168-172) first checks the environment:
    ```typescript
    static async isTestMode(): Promise<boolean> {
      if (process.env.NODE_ENV === 'test') return true;
      const settings = await this.getCached();
      return settings.isTestMode;
    }
    ```
  - `SettingsProvider.getCached` queries the global `SystemSettings` with a cached TTL of 300 seconds (5 minutes) for low database load.
  - If no settings record is found, it initializes it with `isTestMode: false`.

### C. Local Mock Provider Endpoint (`/api/dev/mock-provider`)
- **File Path**: `src/app/api/dev/mock-provider/route.ts`
- **Logic Details**:
  - Acts as a local mock SMM API V2 Sandbox.
  - **Security Guard**:
    - If in production, it requires `isTestMode` from database settings to be enabled (otherwise returns `403 Forbidden` with `"Not available in production"`).
    - Requires verification of the query parameter `key` against `process.env.MOCK_PROVIDER_KEY`. If key is invalid, returns `403 Incorrect API key`.
    - If `MOCK_PROVIDER_KEY` is not defined in env, returns `503 Service Unavailable` with `"Mock provider not configured"`.
  - **Supported Actions**:
    - `balance`: returns `{ balance: "10000.00", currency: "RUB" }`.
    - `services`: returns a mock services catalog containing one item (`Mock Telegram Followers`, rate `10.00`, min `10`, max `10000`).
    - `add`: returns a mock order ID payload: `{ order: "mock_<timestamp>" }`.
    - `status`: accepts single `order` ID or comma-separated `orders` lists, returning `{ status: "Completed", charge: "0.00", remains: "0" }`.

### D. Routing of Background Order Operations
- **File Paths**:
  - **Order Processor**: `src/workers/processors/order.processor.ts` (line 51)
  - **Sync Processor**: `src/workers/processors/sync.processor.ts` (line 38)
  - **Webhook handler**: `src/app/api/webhooks/provider/route.ts` (line 79)
- **Logic Details**:
  - These background systems call `providerService.getWorkerProviderInstance(providerDef)`.
  - Thus, when `isTestMode` is enabled, all order creation requests, order sync pings, and push webhooks resolve to the sandbox `/api/dev/mock-provider`, preventing actual balance expenditure.

### E. Administrative Operations Direct Routing
- **File Paths**:
  - Catalog Import Action: `src/actions/admin/providers/import-cherry-pick.ts` (line 186)
  - Provider Sync Action: `src/actions/admin/providers/sync-action.ts` (line 27)
  - CRUD Admin: `src/actions/admin/providers/crud.ts` (lines 176, 214, 323)
  - Catalog Sync Service: `src/services/admin/catalog.service.ts` (lines 177, 370)
- **Logic Details**:
  - These administrative methods intentionally use `providerService.getProviderInstance(config)`.
  - As a result, they **always** use the live external URL and the real decrypted API key. This lets administrators perform balance checks, catalog audits, and manual curations/imports on real vendor catalogs even in test staging environments.

---

## 3. Concrete Verification & Tests
The routing behavior has been verified using automated unit tests:
- **Test File**: `test/unit/ghost-proxy.test.ts`
- **Result**:
  - Running command: `npm run test test/unit/ghost-proxy.test.ts`
  - Output: **9 passed, 0 failed**.
  - **GP-PROD-001 / GP-PROD-002**: Confirms real provider URLs are used in production mode.
  - **GP-TEST-001**: Confirms mock provider URLs are used in test mode for workers.
  - **GP-TEST-003**: Confirms admin calls `getProviderInstance` and always targets real endpoints.
  - **GP-SWITCH-001 / GP-SEC-002**: Verifies instant transitions and rapid concurrent checks without caching interference.
