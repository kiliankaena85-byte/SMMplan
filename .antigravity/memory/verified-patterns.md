# AEARH Verified Patterns Repository

The following 10 verified architectural patterns are required for high-assurance controls:

1. **Atomic debit updateMany balance gte:** Decrementing user balance using `updateMany({ where: { id: userId, balance: { gte: amount } } })`.
2. **Idempotent upsert with unique business key:** Creating financial entries using `upsert` or unique constraint guards (`orderId`, `referrerId`).
3. **Atomic status transition updateMany where status expected:** Transitioning task/order state only if current status matches expected pre-condition.
4. **Fail-closed signature validation:** Immediately rejecting webhooks if signature header is missing or signature check fails.
5. **Owner binding from DB record:** Verifying `order.userId === payment.userId` directly from database state rather than trusting request body payloads.
6. **Stable idempotency key:** Constructing idempotency keys from deterministic entity IDs (`smart-task-${taskId}`) instead of volatile timestamps (`Date.now()`).
7. **Reconciliation balance == SUM(ledger):** Verifying that live balance strictly matches the sum of all immutable ledger entries.
8. **Negative test for attack scenario:** Writing automated tests that deliberately supply invalid signatures or payload tampering and assert clean rejections.
9. **Concurrency test for race scenario:** Executing parallel `Promise.all` invocations in Vitest to verify lock and state transition invariants under high concurrency.
10. **Monitoring/alerting for security events:** Logging security events to structured storage and configuring alerts for unauthorized access attempts.
