# Changes Report — Stage 4 Hardening (Milestone 2)

This report details the implementation of **Auto-pricing, Elastic Quarantine, and Loss Prevention** for Smmplan. All changes adhere strictly to the `AGENTS.md` pricing rules and security mandates.

## Modified Files

### 1. `src/services/system/cbr-rate.service.ts`
- **Goal**: Implement reliable Daily USD/RUB exchange rate retrieval from the official Central Bank of Russia (CBR) API.
- **Details**:
  - Implemented primary XML parser of `https://www.cbr.ru/scripts/XML_daily.asp` using direct regular expression parsing (resilient, no massive external XML libraries).
  - Implemented 5-second connection timeout constraint.
  - Implemented fallback to secondary daily JSON mirror `https://www.cbr-xml-daily.ru/daily_json.js` on XML failure.
  - Implemented 3% spread margin multiplier (`spreadMultiplier = 1.03`) for currency protection.
  - Returns `nominalRate` and `systemRate` (rounded to 2 decimal places), falling back gracefully to the existing database rate if both services fail.

### 2. `src/services/providers/quarantine.service.ts`
- **Goal**: Implement decoupled evaluation logic for price spikes and unprofitable items.
- **Details**:
  - Implemented `shouldQuarantine(oldRate, newRate)` to detect price spikes greater than 20% (`newRate > oldRate * 1.20`).
  - Implemented `isLossBreach(newRate, markup, usdToRub)` to check if the rounded retail price per unit (`pricePerUnitRub = applyBeautifulRounding(rate * markup * usdToRub) / 1000`) is strictly lower than the purchase cost per unit (`costPerUnitRub = (rate * usdToRub) / 1000`).

### 3. `src/actions/admin/providers/sync-action.ts`
- **Goal**: Hardening of the provider catalog synchronization flow.
- **Details**:
  - Integrated primary CBR exchange rate retrieval at the beginning of the sync.
  - Skips synchronization of any service that is already quarantined (preserves its quarantine state).
  - Automatically deactivates and quarantines any service whose rate spikes by >20%: sets `isQuarantined: true`, `quarantineReason: "Ценовой скачок у провайдера"`, `isActive: false`, and saves the proposed rate in `pendingRate`. Logs a WARNING-level admin alert.
  - Automatically deactivates any service that violates the Loss Prevention floor: sets `isActive: false`, creates a `LOSS_PREVENTION_BLOCK` routing audit log entry, and alerts the administrator with a CRITICAL warning.
  - Ensures correct retail price calculations matching Smmplan standard formulas and `applyBeautifulRounding`.

### 4. `src/services/admin/catalog.service.ts`
- **Goal**: Secure background re-pricing against exchange rate fluctuations.
- **Details**:
  - Enhanced `syncDenormalizedPrices` (which updates all service prices when the daily exchange rate fluctuates) to perform surgical Loss Prevention checks on every service.
  - Automatically disables any service that becomes unprofitable after rate changes, logs `LOSS_PREVENTION_BLOCK` to the routing audit log, and raises a CRITICAL alert.

## Added Files

### 1. `test/unit/elastic-pricing-prevention.test.ts`
- **Goal**: Comprehensive unit/integration testing of all added pricing safety mechanics.
- **Details**:
  - Tests `CBRRateService` direct XML regex parsing and JSON daily mirror fallback.
  - Tests `QuarantineService` helpers for >20% spikes and loss breaches.
  - Tests the entire `adminSyncProviderCatalog` sync action behavior: normal updates, auto-quarantines, and loss prevention blocks.
  - Employs 100% mocked database (`db.$transaction`, `$queryRaw`, etc.) and system hooks to guarantee lightning-fast, zero-network execution.
