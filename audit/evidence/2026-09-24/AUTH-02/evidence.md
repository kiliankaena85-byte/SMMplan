# Evidence: [AUTH-02] Public CSP Report Telemetry Endpoint Rate Limiting & Deduplication

## 1. Finding Information
- **ID**: AUTH-02
- **Severity**: MEDIUM
- **Description**: Public browser reporting endpoint (`/api/telemetry/csp-report`) accepted unlimited requests from any client without IP rate limiting or deduplication, allowing potential flood/denial-of-service in the security events table.
- **Affected File**: `src/app/api/telemetry/csp-report/route.ts`

## 2. Evidence Before Fix (E2/E3 Verification)
- Inspection of `src/app/api/telemetry/csp-report/route.ts`:
  - Payload size accepted up to 50,000 bytes.
  - No check on request frequency per IP.
  - Every single request unconditionally executed `await SecurityAlertService.record({ event: 'CSP_VIOLATION', ... })`.
  - A flood of repeated identical CSP errors immediately generated thousands of database writes.

## 3. Remediation Applied
1. **Payload Size Guard**: Reduced payload threshold from 50,000 to 10,000 bytes. Oversized payloads return `400 { status: 'ignored' }`.
2. **IP Rate Limiting**: Added `rateLimit(`csp:ip:${ip}`, 30, 60)` allowing max 30 reports/min per IP. Exceeding limits returns `429 { status: 'rate_limited' }` with `Retry-After`.
3. **Violation Deduplication**: Added signature check `rateLimit(`csp:dedup:${ip}:${blockedUri}:${violatedDirective}`, 1, 60)` with 60s TTL. Duplicated reports return `200 { status: 'deduplicated' }` without creating duplicate database records in `SecurityAlertService`.

## 4. Verification & Proof (E2 Level)
- Unit test `src/__tests__/security/auth-02-csp-report.test.ts` (4/4 tests PASS):
  ```
   ✓ src/__tests__/security/auth-02-csp-report.test.ts (4 tests) 23480ms
       ✓ rejects oversized payload > 10000 bytes with 400 ignored
       ✓ accepts and records a valid CSP report
       ✓ deduplicates identical reports from the same IP within 60s
       ✓ rate limits when IP exceeds 30 reports per minute

   Test Files  1 passed (1)
        Tests  4 passed (4)
  ```
