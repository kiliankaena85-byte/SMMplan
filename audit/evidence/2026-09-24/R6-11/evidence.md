# Evidence: [R6-11] Vitest 4 Configuration Modernization & Service Test Exclusion

## 1. Finding Information
- **ID**: R6-11
- **Severity**: LOW / HYGIENE
- **Description**: Test configuration used removed runner option (`test.poolOptions` deprecated/removed in Vitest 4) and included auxiliary service benchmark script (`**/test_round_table.ts`) in the default test glob.
- **Affected File**: `vitest.config.ts`

## 2. Evidence Before Fix (E1 Verification)
- Running any vitest command triggered deprecation warning:
  ```
  DEPRECATED `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. Please, refer to the migration guide: https://vitest.dev/guide/migration#pool-rework
  ```
- `include` array contained `**/test_round_table.ts`, causing service scripts to be executed as unit tests.

## 3. Remediation Applied
- Removed deprecated `poolOptions: { forks: { singleFork: true } }` block in `vitest.config.ts`.
- Retained clean top-level `pool: 'forks'`, `maxWorkers: 1`, `fileParallelism: false`.
- Removed `**/test_round_table.ts` from default unit test execution scope.

## 4. Verification & Proof (E1 Level)
- Clean test run without deprecation warnings:
  ```
   RUN  v4.1.4 C:/Users/Shadow/Documents/SMM
   ✓ src/__tests__/security/sec-rel-noopener.test.ts (1 test) 432ms
       ✓ enforces rel="noopener noreferrer" on all <a ... target="_blank"> and <Link ... target="_blank"> tags

   Test Files  1 passed (1)
        Tests  1 passed (1)
  ```
