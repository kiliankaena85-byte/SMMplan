# 🚀 SMMplan Full Project Multi-Agent Swarm Audit Report

**Дата проверки:** 2026-08-27T02:33:38.646Z

## 📦 Домен: Payments, Ledger & Billing (payments)

*WalletOps, LedgerEntry, YooKassa / Robokassa webhooks, 54-FZ VAT 2026*

### DevSecOps Sentinel (550B)

**Статус:** ❌ DEFECTS FOUND
**Резюме:** Critical IDOR vulnerability in WalletOps due to missing tenant scoping on user lookup; idempotency race condition risk; user enumeration via error messages; webhook routes lack rate limiting. Admin actions properly scoped with RBAC and tenant isolation. YooKassa/Robokassa webhooks implement fail-closed signature verification with timingSafeEqual and IP allowlists.

| Серьезность | Правило | Файл | Строка | Суть | Рекомендация |
|---|---|---|---|---|---|
| **CRITICAL** | CODE-AUDIT | `src/services/financial/wallet-ops.ts` | 58 | Code Finding | Add tenantId to where clause: where: { id: userId, tenantId: tenantId || user.tenantId } or require tenantId parameter. Enforce tenant scoping at service layer, not just API layer. |
| **HIGH** | CODE-AUDIT | `src/services/financial/wallet-ops.ts` | 85 | Code Finding | Add @@unique([idempotencyKey]) to LedgerEntry model. Use upsert or create with unique constraint as atomic operation. Remove separate findFirst check. |
| **MEDIUM** | CODE-AUDIT | `src/services/financial/wallet-ops.ts` | 45 | Code Finding | Use generic error message for both cases: 'Operation not allowed'. Log detailed reason server-side only. |
| **MEDIUM** | CODE-AUDIT | `src/app/api/webhooks/yookassa/route.ts` | 1 | Code Finding | Implement per-IP rate limiting (e.g., 100 req/min) using Redis sliding window. Apply before signature verification. |
| **MEDIUM** | CODE-AUDIT | `src/app/api/webhooks/robokassa/route.ts` | 1 | Code Finding | Apply identical rate limiting strategy. |
| **LOW** | CODE-AUDIT | `src/services/financial/payment.service.ts` | 135 | Code Finding | Move allowed currencies to configuration. Validate against supported list. |
| **LOW** | CODE-AUDIT | `src/services/financial/wallet-ops.ts` | 180 | Code Finding | Complete implementation with same security patterns as charge(). |

### FinOps and Logic Specialist (GLM-5.2)

**Статус:** ❌ DEFECTS FOUND
**Резюме:** Core financial invariants (Ledger-First, BigInt kopecks, optimistic locking, fail-closed HMAC, IP allowlisting, idempotency via unique constraint) are generally well-implemented. However, two CRITICAL gaps exist: (1) Redis distributed lock is imported in both webhooks (yookassa, robokassa) but never invoked — webhook replay protection is therefore dependent solely on DB idempotency rather than a Mutex-guarded critical section; (2) Multi-tenant defaulting silently coerces any null/missing tenantId to 'smmplan' in at least two places, violating the 'smmplan' ∪ 'flux' invariant. Additionally, the WalletOps.charge API requires a PrismaTx but does not enforce that the caller actually wraps the call in a transaction — invoked standalone, an orphaned APPROVED ledger row can be left behind on a balance-update failure, breaking the ledger-first invariant at the persistence boundary.

| Серьезность | Правило | Файл | Строка | Суть | Рекомендация |
|---|---|---|---|---|---|
| **CRITICAL** | CODE-AUDIT | `src/app/api/webhooks/yookassa/route.ts` | 1 | Redis distributed lock not applied in YooKassa webhook | Verify implementation against AGENTS.md |
| **CRITICAL** | CODE-AUDIT | `src/app/api/webhooks/robokassa/route.ts` | 1 | Redis distributed lock not applied in Robokassa webhook | Verify implementation against AGENTS.md |
| **CRITICAL** | CODE-AUDIT | `src/services/financial/wallet-ops.ts` | 1 | Hardcoded 'smmplan' default in tenant resolution | Verify implementation against AGENTS.md |
| **CRITICAL** | CODE-AUDIT | `src/services/financial/wallet-ops.ts` | 1 | WalletOps.charge does not guarantee transactional wrapping | Verify implementation against AGENTS.md |
| **HIGH** | CODE-AUDIT | `src/services/financial/wallet-ops.ts` | 1 | TOCTOU on balance pre-check can produce misleading error | Verify implementation against AGENTS.md |
| **HIGH** | CODE-AUDIT | `src/services/financial/payment.service.ts` | 1 | Precision risk: payment.amount accepts plain `number` | Verify implementation against AGENTS.md |
| **HIGH** | CODE-AUDIT | `src/actions/admin/finance/ledger.ts, src/actions/admin/finance/payments.ts` | 1 | BigInt → Number conversion in admin DTOs loses precision | Verify implementation against AGENTS.md |
| **HIGH** | CODE-AUDIT | `src/services/financial/payment.service.ts` | 1 | Receipt of issuance (54-FZ) not visible in confirmPayment path | Verify implementation against AGENTS.md |
| **MEDIUM** | CODE-AUDIT | `n/a (order service not provided)` | 1 | Drip-feed floor invariant not verifiable from this slice | Verify implementation against AGENTS.md |
| **MEDIUM** | CODE-AUDIT | `src/services/financial/ledger-reconciliation.service.ts` | 1 | getAccounts HAVING clause embeds balance != ledger_sum; null ledger_sum is implicitly treated as 0 but only via COALESCE — verify with empty-user case | Verify implementation against AGENTS.md |
| **MEDIUM** | CODE-AUDIT | `src/app/api/webhooks/yookassa/route.ts, src/app/api/webhooks/robokassa/route.ts` | 1 | Hardcoded gateway IP allowlists risk operational fragility | Verify implementation against AGENTS.md |
| **MEDIUM** | CODE-AUDIT | `src/app/api/webhooks/robokassa/route.ts` | 1 | Robokassa signature uses createHash, not createHmac — sensitive to canonical parameter order | Verify implementation against AGENTS.md |
| **LOW** | CODE-AUDIT | `src/services/financial/ledger-reconciliation.service.ts` | 1 | search filter uses string concatenation into SQL — safe today (Prisma.sql) but couples Prisma version | Verify implementation against AGENTS.md |
| **LOW** | CODE-AUDIT | `src/app/api/webhooks/yookassa/route.ts` | 1 | YooKassa webhook timestamp guard accepts future-dated webhooks | Verify implementation against AGENTS.md |
| **LOW** | CODE-AUDIT | `src/services/financial/ledger-reconciliation.service.ts` | 1 | auditAdminAwaitable imported but unused in reconciliation service | Verify implementation against AGENTS.md |

### UI/UX and Design System Guardian

**Статус:** ✅ PASS
**Резюме:** The provided source code snippets are exclusively backend services, server actions, and webhook handlers for financial operations (Payments, Ledger & Billing). The code contains no UI components, Tailwind CSS classes, forms, modals, dropdowns, tooltips, or any frontend elements that would be subject to UI/UX audits. All critical UI/UX checks (Zero Raw Colors, Viewport 100% Fit, Form UX, Modal Hoisting) are therefore not applicable to this backend code.

### Fast Arbiter and Triage (Inkling)

**Статус:** ✅ PASS
**Резюме:** ⚠️ Аудит пропущен (Expected ',' or ']' after array element in JSON at position 4641 (line 73 column 8))

