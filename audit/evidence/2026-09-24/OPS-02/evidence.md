# Evidence: [OPS-02] Distributed Lock Fencing Token & Split-Brain Prevention

## 1. Finding Information
- **ID**: OPS-02
- **Severity**: MEDIUM
- **Description**: Periodic tasks and distributed workers acquired locks with TTL and background heartbeat, but lacked monotonic fencing tokens or post-execution lock ownership verification. If an event loop stall, GC pause, or network partition caused the lock to expire, a second worker could acquire the lock while the first worker proceeded to write stale/conflicting mutations (split-brain).
- **Affected File**: `src/lib/redis-lock.ts`

## 2. Evidence Before Fix (E0/E2 Verification)
- Inspection of `MutexManager` in `src/lib/redis-lock.ts`:
  - `acquireLock` only set a UUID string and TTL.
  - No monotonic counter (`INCR fence:...`) was associated with the acquisition.
  - `withLock(key, ttlMs, maxWaitMs, fn)` invoked `await fn()`, and released the lock without validating if the current worker was still the rightful owner at completion.
  - A slow or paused worker would silently write changes after another worker took over.

## 3. Remediation Applied
1. **Monotonic Fencing Tokens**: Added `acquireLockWithFencing(key, ttlMs, maxWaitMs)` which atomically increments a Redis counter (`fence:${lockKey}`) upon successful lock acquisition.
2. **Context-Aware Lock Execution**: `withLock` provides a typed `LockContext`:
   - `fencingToken: number` — monotonic sequence number for storage gating.
   - `isLockValid: () => Promise<boolean>` — non-throwing ownership check.
   - `assertLockValid: () => Promise<void>` — throws `LockLostError` if lock ownership was revoked.
3. **Automatic Split-Brain Prevention**: In `withLock`, if heartbeat extension fails or if `isLockOwner(key, token)` returns false at the end of execution, `LockLostError` is thrown, aborting the split-brain outcome.

## 4. Verification & Proof (E2 Level)
- Unit test `src/__tests__/security/ops-02-lock-fencing.test.ts` (3/3 tests PASS):
  ```
   ✓ src/__tests__/security/ops-02-lock-fencing.test.ts (3 tests) 13831ms
       ✓ allocates monotonically increasing fencing tokens upon lock acquisition
       ✓ passes LockContext into withLock and allows explicit assertLockValid()
       ✓ detects stolen/expired lock during execution and throws LockLostError

   Test Files  1 passed (1)
        Tests  3 passed (3)
  ```
