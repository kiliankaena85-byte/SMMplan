# Scope: Authentication, Session Isolation, & Soft-Deletion

## Architecture
- **Framework & Routing**: Next.js 16 (App Router) client pages `/login` and `/dashboard/settings` interact with Server Actions (`password-login`, `deleteAccountAction`) and the API Route `/api/auth/logout`.
- **Session Layer**: Database-backed sessions utilizing Prisma `Session` and `AuthToken` tables. Client reads `session_token` cookie, verified server-side.
- **B2B Isolation**: User data remains in DB to preserve financial references (`Order`, `Payment`, `LedgerEntry`), but PII data is fully scrubbed and anonymized on soft-deletion.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | DB Schema & Verification | Ensure user deletion flags and indexes are set, and reject inactive sessions | None | DONE |
| 2 | Purge & Logout headers | Evict cookies, database sessions, and set Cache-Control headers | M1 | DONE |
| 3 | Account Switcher UI | Render premium card on `/login` to switch or continue | M2 | DONE |
| 4 | Settings Danger Zone | Implement Danger Zone modal, password gate, and soft-delete Action | M3 | DONE |
| 5 | Integration Tests | Write and execute Vitest suites, verify build & types | M4 | DONE |

## Interface Contracts
### `verifySession()` ↔ `User` database record
- **Function**: `verifySession(cookieStore: ReadonlyRequestCookies): Promise<Session & { user: User } | null>`
- **Behavior**: Retrieves user session from DB. If user has `isActive === false` or `isDeleted === true`, the session is rejected as invalid and deleted.

### `deleteAccountAction(formData: FormData)` ↔ Deletion Gate
- **Input**: `formData` with `confirmation` (string) and optional `password` (string).
- **Output**: `Promise<{ success: boolean; error?: string }>`
- **Errors**: `NOT_AUTHENTICATED`, `INVALID_CONFIRMATION` (if confirmation !== 'УДАЛИТЬ'), `INCORRECT_PASSWORD`.

---

## 🎯 UI-SPEC / API-SPEC

### 1. Database Schema Alteration (`prisma/schema.prisma`)
Add/ensure the following fields on `User` model:
- `isActive  Boolean   @default(true)`
- `isDeleted Boolean   @default(false)`
- Add an index: `@@index([isActive])`

### 2. Login Page Account Switcher (`src/app/(auth)/login/page.tsx` & `login-form.tsx`)
- **API Spec**: `LoginPage` will retrieve active session using `verifySession()`. If authenticated, query `db.user.findUnique({ where: { id: userId } })` for email and role.
- **UI Spec**:
  - Render active user profile with a premium avatar/card.
  - Button 1: "Продолжить как [email]" (redirects to `/dashboard` or `/admin/dashboard` depending on role).
  - Button 2: "Войти под другим аккаунтом" (calls POST `/api/auth/logout` and reloads the page to show clean login form).

### 3. Account Soft-Deletion Action & Danger Zone (`src/app/dashboard/settings/page.tsx`)
- **Danger Zone UI**: Responsive, high-contrast B2B Danger Zone card styled using semantic tokens (`border-destructive/20`, `bg-destructive/5`, `text-destructive`).
- **Confirmation Modal**:
  - Modal requires user to type the word `УДАЛИТЬ` (must match exactly, uppercase).
  - Modal requires user's current password if they have a password hash set.
  - Action button: Displays a spinner when loading and calls the `deleteAccountAction` Server Action.
- **Server Action `deleteAccountAction`**:
  - Securely verifies session and password.
  - Wraps in a database transaction (`$transaction`):
    1. Randomizes `email` to `deleted_${user.id}@smmplan.local` to satisfy unique constraints while allowing reuse of original email.
    2. Nullifies unique identifiers: `telegramId = null`, `phoneHash = null`, `apiKeyHash = null`, `referralCode = null`.
    3. Nullifies B2B data: `companyName = null`, `inn = null`, `kpp = null`, `legalAddress = null`.
    4. Sets `passwordHash = null` (blocks future credential login).
    5. Sets `isActive = false` and `isDeleted = true`.
    6. Deletes all database `Session` and `AuthToken` rows for this user.
  - Clears `session_token` cookie from response headers.
  - Hard-redirects to `/` using a clean window reload/redirect to wipe out client-side cached routes.

---

## 🔒 5 Векторов Надежности (Reliability Audit Score)

1. **Архитектурный стык (Server/Client boundaries)**: **5/5**
   - The deletion modal is a client-side component using standard state triggers. The actual database mutations are performed via a Server Action which enforces the authentication boundary.
   - Redirection after deletion uses `window.location.href` to force the Next.js router cache to completely invalidate and prevent layout flashes.

2. **Хаос и пустота (Database / Cold Start / Transactionality)**: **5/5**
   - Deletion of session data and user PII is bound together inside a single Prisma `$transaction`. If any step fails, the entire transaction rolls back, preventing partial anonymization states.
   - Soft-deletion preserves all financial orders, payments, invoices, and ledger entries intact since they link to the user record, which is *not* physically deleted.

3. **Visual & UX Density**: **5/5**
   - The Danger Zone card matches Smmplan's layout guidelines (Tailwind 4 tokens, semantic dark-mode text, hover animations, touch target padding).
   - Mobile and desktop responsiveness is fully preserved across the `/login` account switcher card.

4. **Доступность WCAG 2.2 AA**: **5/5**
   - Zone click touch targets on the modal close button, input text fields, and action buttons are all configured with heights `>= 44px` (using classes like `h-11`, `py-3`).
   - Color contrast utilizes design tokens that guarantee at least `4.5:1` contrast in light and dark modes.

5. **Security & Trust**: **5/5**
   - Block brute force: When user account is deleted, password login immediately fails with the generic "Неверный email или пароль" message, protecting against account enumeration attacks.
   - PII Scrubbing: The email is randomized and all unique integration identifiers (Telegram, API Keys) are completely removed to prevent data leaks.

---

## 🔒 Премортем-анализ (Failure Simulation & Risk Matrix)

| # | Риск / Гипотетический Сбой | Программный Механизм Защиты (Код) | Приоритет |
|---|-----------------------------|-----------------------------------|-----------|
| 1 | **Утечка сессии / Призрак-сессия**: Deleted user's session remains cached on another device/browser. | Database-level validation: `verifySession` in `session.ts` queries the active session in DB. Since all sessions for the deleted user are purged in the transaction, any other device will fail the DB query and instantly logout on its next request. | Критический (P0) |
| 2 | **Уникальный ключ / Email collision**: A new user signs up using the same email or Telegram ID as a deleted user, causing Prisma database errors. | Atomic transaction anonymizes the soft-deleted user's email to `deleted_${userId}@smmplan.local` and nullifies their `telegramId` and API key hash. This frees up the original email and Telegram ID for a clean sign-up. | Высокий (P1) |
| 3 | **Каскадное падение транзакций**: Attempting a cascade delete triggers PostgreSQL `onDelete: Restrict` violations on orders or invoices. | We only perform update actions (`db.user.update`) and session deletes (`db.session.deleteMany`). Historical orders, payments, invoices, and ledger entries are completely untouched, retaining their audit trails. | Высокий (P1) |
| 4 | **Обход подтверждения**: A malicious client invokes the server deletion action directly without passing safety gates. | The `deleteAccountAction` Server Action verifies the user's session, checks if a password is set, and validates the password hash directly on the server before running the database transaction. | Высокий (P1) |

---

## 🔒 Double-Pass Planning Re-Evaluation (Self-Audit)

### Pass 1: Reviewing Logic and Edge Cases
- **B2B / KYC Implications**: Does deactivating users break KYC status logs? No, `isKycVerified` can remain, and `User` row stays. B2B parameters (`companyName`, `inn`, etc.) are cleared for privacy compliance.
- **Referral Code Leak**: If a user is referred by someone, they have a `referredById`. The relation `referredBy` uses `onDelete: SetNull`. Since we are *not* deleting the user, we just set `referredById = null` during soft-delete to break the referral link cleanly without affecting commission records.
- **Next.js Cache**: The logout headers and physical reloads completely invalidate Next.js caches on `/login` and `/dashboard`.

### Pass 2: Final Contract Audit
- Complies strictly with all `AGENTS.md` and user rules (Next.js 16, React 19, Tailwind CSS 4, HeroUI v3 dot notation, Zod schemas, Vitest 4).
