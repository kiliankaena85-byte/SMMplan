# AEARH Anti-Patterns Repository

The following 15 anti-patterns are strictly prohibited during audits and remediations:

1. **Model exists != control works:** Assuming a Prisma model definition enforces business constraints without checking runtime logic.
2. **Field exists != field enforced:** Having a field like `tenantId` in schema without checking if queries filter by it.
3. **Unique constraint in text != unique constraint in DB:** Writing `@@unique` in schema without applying database migrations.
4. **Test exists != test passed:** Pointing to a test file without inspecting test run execution results.
5. **Script exists != script executed:** Adding a script to repository without executing it against live environment.
6. **Empty DB reconciliation != passed reconciliation:** Running reconciliation queries on an empty database (0 records) and claiming clean state.
7. **Positive test != security proof:** Passing a happy path test and claiming security immunity against attacks.
8. **Single request test != race proof:** Running single-threaded sequential tests and declaring immunity to race conditions.
9. **Code fix != deployed fix:** Modifying code locally without compiling and running verification suites.
10. **Dev guard != production proof:** Adding `if (dev)` checks without verifying production environment behavior.
11. **SecurityEvent model != security events logged:** Creating `SecurityEvent` model without calling `.create()` in security handlers.
12. **IdempotencyKey field != idempotency enforced:** Adding an `idempotencyKey` parameter without checking for duplicates before execution.
13. **Mutex exists != mutex safe:** Using simple locks without token-based ownership release guards.
14. **IP header exists != IP trusted:** Reading `x-forwarded-for` header without IP whitelist validation.
15. **Currency field exists != currency validated:** Storing currency strings without cross-checking exchange rates and amount types.
