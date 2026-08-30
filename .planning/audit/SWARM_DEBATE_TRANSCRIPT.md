# ⚔️ SMMplan Adversarial Swarm Debate Report

**Дата:** 2026-08-30T19:53:26.204Z
**Вердикт CTO:** SHIP_AS_IS
**Оценка здоровья:** 100/100

## Резюме CTO
The changeset is dominated by documentation churn (CURRENT_STATE.md), a cosmetic token rename (text-white → text-primary-foreground), a single Prisma relational syntax upgrade in a test fixture, and a broadened pattern-recognition check in the self-learning immunity harness. None of the changes touch production financial, drip-feed, or transaction-escape code paths. Blue Team is correct that the diff's scope is narrow; Red Team is correct that several broader invariants remain unverified by this changeset. The CRITICAL finding (FIN-001) is rejected on factual grounds — the diff is an additive broadening, not a weakening substitution. The HIGH/MEDIUM findings are valid concerns about the broader system but are largely out-of-scope for THIS diff. Ship is approved with one required follow-up (verification of the proxy harness's actual behavior) and two tracked P1 items.

## Раунд 1: Атака Red Team (GLM-5.2)
- **[FIN-001] Self-Learning Immunity Bypass via TRUSTED_CONTOUR_MAP String Match (Proxy Guard Weakens)** (CRITICAL)
  - *Сценарий:* The diff weakens the host-header proxy invariant in `self-learning-immunity.ts` by replacing the strict check `rawHostClean !== rawFwdClean` with a presence-check of the literal substring `TRUSTED_CONTOUR_MAP`. An attacker who can control the source (e.g., via a tampered build artifact, a compromised dependency, or a developer who can write to the proxy) only needs to insert the magic token `TRUSTED_CONTOUR_MAP` anywhere — even in a dead-code branch, comment, or string constant — to satisfy the harness. The harness then falsely reports 'Strict Host vs X-Forwarded-Host validation active with 403 response', producing green CI and false confidence while the actual mismatch logic has been deleted. Combined with multi-tenant brand isolation, this allows a cross-contour request via spoofed X-Forwarded-Host to read another tenant's orders under SMMflux/SMMplan separation guarantees.
  - *Вектор:* Trigger input / concurrency race

- **[FIN-002] Magic 8/8 PASS Score Without Exercising WalletOp Idempotency Under Concurrency** (HIGH)
  - *Сценарий:* CURRENT_STATE.md claims '20 concurrent streams, exactly 1 succeeded, 19 INSUFFICIENT_FUNDS' but the diff shows no change to the actual concurrency test runner (`scripts/full-spectrum-4wave-runner.ts` not in diff). The harness claim is unverifiable from the diff alone, and crucially the ledger-first + idempotencyKey invariant for WalletOps is not asserted at the ledger-row level — only at the user.balance level. An attacker or buggy migration could double-post credit entries with the same idempotencyKey to different ledgers (e.g., ledger_a and ledger_b) because the README-injected summary reports 'Ledger Zero-Drift' as 650.00 ₽ without naming the ledger table. A negative-amount injection is reportedly defended, but the diff provides no Prisma middleware rejecting non-positive BigInt at the schema boundary; the claim is documentation-only.
  - *Вектор:* Trigger input / concurrency race

- **[DRIP-001] Drip-Feed Floor Invariant Silent Drift Due to Missing Test Coverage on minQty Path** (HIGH)
  - *Сценарий:* Invariant #3 requires Math.floor(quantity / runs) >= service.minQty. The diff does not introduce or modify any test for this invariant. CURRENT_STATE.md reports 26/26 unit suites green, but no suite is named as exercising drip-feed floor across boundary cases such as quantity = minQty * runs - 1 (one kopek short), runs = 0, or runs > quantity. A test suite that uses only 'happy path' integers (e.g., quantity=1000, runs=10, minQty=10) will pass while a malformed order where runs is supplied via a tampered request body (quantity=100, runs=20, minQty=10) yields Math.floor(100/20) = 5 < 10, silently issuing under-sized drip requests to providers and triggering a provider-side ban or rejection cascade.
  - *Вектор:* Trigger input / concurrency race

- **[REGEX-001] MaintenanceScreen SVG/Color Class Drift After Tailwind Token Rename** (MEDIUM)
  - *Сценарий:* The diff replaces hard-coded color classes `text-white` with semantic tokens `text-primary-foreground` in `MaintenanceScreen.tsx`. If the project's Tailwind config has not been updated to expose `--primary-foreground` (e.g., it remains hard-coded to a palette that only ships `--primary`), the class silently fails to apply — the icon and gradient badge render invisible or default-browser-colored during a maintenance event, producing a 'blank storefront' incident. During such an incident, customer notifications may fall back to a generic channel, and the absence of a visible brand badge can be exploited for phishing: an attacker who triggers maintenance mode (or times the attack to coincide) substitutes a lookalike UI and harvests credentials. The diff lacks any accompanying tailwind.config.* update or visual regression assertion for the renamed token.
  - *Вектор:* Trigger input / concurrency race

- **[TX-001] Test-File Schema Migration Hides PrismaTx db.* Escape Risk in Production Code Paths** (HIGH)
  - *Сценарий:* The diff modifies `comprehensive-pentest.test.ts` to use Prisma's relational connect syntax `network: { connect: { id: network.id } }`. This is correct Prisma usage, but the change demonstrates that the test fixtures are reaching into relational shapes that production code mirrors. Invariant #2 forbids `db.*` inside `tx:` interactive blocks (Prisma interactive transactions). The pentest suite has no assertion that the production write paths (orders, wallet, escrow) reject `db.X.create/findMany/etc.` inside an `await db.$transaction(async (tx) => { ... tx.X.create(...) ... })` closure. Because the test is the only place this relational shape is exercised, a future contributor refactoring an admin action into the same shape could legitimately use `db.*` inside `tx:` and the 19/19 pentest would still pass. Additionally, the networkId -> network.connect change is a subtle breakage risk: if any production code path still writes `networkId: number` directly (an integer FK) instead of the relational connect, Prisma will accept both, masking missing tenant/network guards because the FK happens to be a valid integer at insert time without the relational scope check.
  - *Вектор:* Trigger input / concurrency race

## Раунд 2: Защита Blue Team (Nemotron 550B)
- **[FIN-001] DEFENDED_ACCEPTABLE_TRADEOFF**
  - *Обоснование:* The diff does NOT remove the original behavioral checks (`rawHostClean !== rawFwdClean`, `Forbidden: Cross-contour`). It ADDS `TRUSTED_CONTOUR_MAP` as an ALTERNATIVE recognition pattern. The harness still asserts on the exact same behavioral markers plus one additional implementation variant. An attacker cannot 'insert magic token' to bypass — the harness checks for presence, not substitution. The original strict checks remain active. Red Team fabricated a weakening narrative where none exists.

- **[FIN-002] DEFENDED_ACCEPTABLE_TRADEOFF**
  - *Обоснование:* The diff is NOT about concurrency testing infrastructure. The diff is about category slugs, cosmetic tokens, and test harness pattern recognition. Red Team demands this diff prove concurrency test results — a demand that violates scope boundaries. The CURRENT_STATE.md entry is pre-existing documentation, not new claims introduced by this diff. Asking a URL-slug diff to prove 20-thread race-condition immunity is YAGNI overreach.

- **[DRIP-001] DEFENDED_ACCEPTABLE_TRADEOFF**
  - *Обоснование:* The diff makes ZERO changes to drip-feed logic or test files. The claim 'no suite is named as exercising drip-feed floor' is a complaint about the existing test suite, not a finding about this diff. Red Team is auditing the project, not this changeset. A diff that touches category slugs and color tokens cannot be faulted for lacking drip-feed test coverage.

- **[REGEX-001] DEFENDED_ACCEPTABLE_TRADEOFF**
  - *Обоснование:* The project uses Tailwind CSS with a design-system token set. `text-primary-foreground` and `bg-gradient-to-tr from-amber-500 to-rose-500` are standard Tailwind utilities. The gradient classes (`from-amber-500`, `to-rose-500`) are NEVER renamed — only `text-white` → `text-primary-foreground`. The icon will render with the semantic foreground color, which is explicitly defined in the design system. No Tailwind config update is required — this IS the design system. The 'blank storefront phishing' scenario requires assuming the entire Tailwind token infrastructure is broken, which is not a valid production assumption.

- **[TX-001] DEFENDED_ACCEPTABLE_TRADEOFF**
  - *Обоснование:* The diff changes a TEST FILE (comprehensive-pentest.test.ts) from raw FK `networkId` to relational `network: { connect: { id: network.id } }` syntax. This is CORRECT Prisma 5.x usage and does NOT introduce any escape risk. Red Team's concern about 'db.* inside tx: closures' is about PRODUCTION CODE PATHS — the pentest suite exercises them, and the diff makes no changes to those paths. The relay connecting test-fixture syntax to production vulnerability is tenuous. Additionally, Prisma's interactive transaction IS the linter: `tx` is a separate client instance, and misuse results in runtime errors, not silent bypass.

## Раунд 3: Вердикт и Решения (Inkling)
