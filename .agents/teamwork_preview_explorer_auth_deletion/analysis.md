# Smmplan Authentication, Session Management, and Deletion Architecture Audit

**Date**: May 23, 2026  
**Auditor**: Teamwork Explorer (Read-Only Deep Investigation)  
**Status**: COMPLETE  

---

## 1. Executive Summary

This deep audit investigates Smmplan's authentication, session handling, and profile settings to formulate a zero-defect implementation blueprint for:
1. **User-initiated soft-deletion** (compliance with GDPR/FZ-152, maintaining accounting ledger integrity).
2. **Personal Identifiable Information (PII) anonymization** to circumvent database unique constraints.
3. **Session isolation & instant purging** across multiple devices.
4. **Premium account switching UI** directly on `/login` for already authenticated sessions.

Due to strict financial bookkeeping constraints (`onDelete: Restrict` on orders, payments, invoices, and ledger logs), **hard-deletion is impossible** and would crash the database. A highly secure, transaction-wrapped **soft-deletion and scrubbing routine** is the only correct path to follow.

---

## 2. Evidence Chain & Direct Observations

### 2.1. Prisma Database Schema (`prisma/schema.prisma`)
The relevant models and their relations to the `User` model are observed as follows:
- **`User` (lines 10-66)**: Contains sensitive fields like `email` (`@unique`), `passwordHash`, `telegramId`, `phoneHash` (`@unique`), `apiKeyHash` (`@unique`), B2B data (`companyName`, `inn`, `kpp`, `legalAddress`), and referrals.
- **`AuthToken` (line 85)**: `userId String` with `onDelete: Cascade`.
- **`Session` (line 94)**: `userId String` with `onDelete: Cascade`.
- **`Order` (line 265)**: `user User @relation(fields: [userId], references: [id], onDelete: Restrict)`.
- **`Payment` (line 302)**: `user User @relation(fields: [userId], references: [id], onDelete: Restrict)`.
- **`Invoice` (line 336)**: `user User @relation(fields: [userId], references: [id], onDelete: Restrict)`.
- **`LedgerEntry` (line 575)**: `user User @relation("UserLedger", fields: [userId], references: [id], onDelete: Restrict)`.
- **`Ticket` (line 434)**: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`.
- **`AuditLog` (line 517)**: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`.
- **`Commission` (line 535)**: `referrer User @relation("ReferredCommissions", fields: [referrerId], references: [id], onDelete: Cascade)`.

**Critical Finding**: If we attempt a hard-deletion (`db.user.delete`), the database will throw a foreign key constraint violation (Prisma error code `P2003`) on `Order`, `Payment`, `Invoice`, and `LedgerEntry` because they utilize `onDelete: Restrict`. This is a vital architectural guard that prevents deleting historical revenue transactions.

### 2.2. Login Page & Form (`src/app/(auth)/login/` files)
- **`page.tsx` (lines 11-101)**: `LoginPage` is currently a Server Component marked with `export const dynamic = 'force-dynamic'`. It renders `<LoginForm />` inside the Right Form Panel without checking if a session already exists.
- **`login-form.tsx` (lines 14-236)**: A Client Component. It allows password login (via `loginWithPasswordAction`) and magic link login (via `requestMagicLink`). After a successful password login, it redirects the user using `window.location.href = res.redirectTo`.

### 2.3. Authentication Actions & Sessions (`src/actions/auth/` and `src/lib/session.ts`)
- **`src/actions/auth/password-login.ts` (lines 17-81)**: Verifies the email and password hash, then triggers `await createSession(user.id)`. It determines the redirection path: `/admin/dashboard` for staff (`OWNER`, `ADMIN`, `MANAGER`, `SUPPORT`) and `/dashboard` for clients.
- **`src/lib/session.ts` (lines 17-139)**:
  - `createSession(userId)`: Inserts a session record into the PostgreSQL database `Session` table, creates a JWT signed with `JWT_SECRET` containing the `sessionId` and `userId`, and sets a secure `httpOnly` cookie `session_token`.
  - `verifySession()`: Extracts the `session_token` cookie, validates the JWT signature, and queries `db.session.findUnique({ where: { id: sessionId } })` to ensure the session exists and has not expired.
- **`src/app/api/auth/logout/route.ts` (lines 23-41)**: The standard logout endpoint. It parses the JWT `session_token`, deletes the associated session from `db.session`, and deletes the cookie: `cookieStore.delete('session_token')`.

### 2.4. Client Settings & Password Management
- **`src/app/dashboard/settings/page.tsx` (lines 18-257)**: A Server Component containing profile information, balances, loyalty progression, quick links, and renders the client-side `<PasswordCard />` component.
- **`PasswordCard.tsx` (lines 9-185)**: A Client Component supporting both setting a new password and changing an existing password using server actions from `@/actions/auth/password-settings`.
- **`src/actions/auth/password-settings.ts` (lines 69-120)**: `changePasswordAction` verifies the current session, hashes the new password, updates the DB, and securely purges other active sessions:
  ```typescript
  // W3-2 SECURITY FIX: Invalidate all existing sessions on password change
  await db.session.deleteMany({
    where: { userId: session.userId }
  });
  ```

---

## 3. Design and Recommendations for Requirements

### Recommendation R1: User-Initiated Soft-Deletion Flow

To support soft-deletion natively, we must alter the database schema to track deleted/archived states and when they occurred.

#### 1. Schema Alterations (`prisma/schema.prisma`)
Add `deletedAt` and `isActive` fields to the `User` model, accompanied by a performance index on `isActive`:
```prisma
model User {
  // ... existing fields ...
  
  isActive  Boolean   @default(true)
  deletedAt DateTime?

  @@index([isActive])
}
```

#### 2. Settings Integration (`src/app/dashboard/settings/page.tsx`)
Create a designated "Опасная зона" (Danger Zone) card at the bottom of the page, styled according to the design system (with semantic warning colors, proper whitespace, and transitions):
```tsx
{/* Danger Zone */}
<div className="bg-card border border-destructive/20 rounded-2xl overflow-hidden hover:shadow-sm transition-all duration-200">
  <div className="px-5 py-4 border-b border-destructive/10 flex items-center gap-2.5 bg-destructive/5">
    <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
      <AlertTriangle className="w-4 h-4" />
    </div>
    <div>
      <h2 className="font-semibold text-destructive text-sm">Удаление аккаунта</h2>
      <p className="text-[10px] text-muted-foreground">Безвозвратное удаление вашего профиля и данных</p>
    </div>
  </div>
  <div className="p-5 space-y-4">
    <p className="text-xs text-muted-foreground leading-relaxed">
      Удаление аккаунта приведет к безвозвратной деактивации вашего профиля. Все ваши персональные данные будут стёрты в соответствии с законом ФЗ-152 и GDPR. Вы больше не сможете войти в этот аккаунт.
    </p>
    <div className="flex justify-end border-t border-border/40 pt-4">
      <DeleteAccountButton hasPassword={!!user.passwordHash} />
    </div>
  </div>
</div>
```

#### 3. Security Confirmation Modal (`DeleteAccountButton.tsx`)
Implement a client-side component using HeroUI v3 dot notation and Tailwind v4 design tokens:
- **Requirement 1**: Typing the confirmation word **"УДАЛИТЬ"** (Russian uppercase). The action button remains disabled until typed exactly.
- **Requirement 2**: For users with a set password, verify their credentials through a secure input field.
- **Action Button**: Standard destructive state (`intent="danger"`, showing a `Loader2` spinner during state transition).

---

### Recommendation R2: PII Anonymization & Constraint Handling

Since key fields like `email`, `phoneHash`, `telegramId`, `apiKeyHash`, and `referralCode` carry unique database indices, simply keeping the `User` row unchanged would prevent the user from ever registering a new account using the same email or Telegram ID. We must scrub PII atomically.

Within a database transaction (`$transaction`), perform the following anonymization:
1. **Email**: Map to a unique, non-colliding localized address using the user's ID: `deleted_${user.id}@smmplan.local`.
2. **Unique Identifiers**: Nullify `telegramId`, `phoneHash`, `apiKeyHash`, and B2B billing details (`companyName`, `inn`, `kpp`, `legalAddress`).
3. **Password**: Set `passwordHash` to `null` to disable all subsequent password-based logins.
4. **Referral Code**: Nullify `referralCode` or append a random string to free up the original referral code.
5. **Flags**: Set `isActive: false` and `deletedAt: new Date()`.

---

### Recommendation R3: Robust Session Isolation and Purging

To ensure zero-defect security, the instant the user deletes their account:
1. **Server-Side Session Purge**: Within the transaction, delete all active `Session` and `AuthToken` database records matching the user's ID:
   ```typescript
   await tx.session.deleteMany({ where: { userId } });
   await tx.authToken.deleteMany({ where: { userId } });
   ```
2. **Cookie Clearance**: Erase the active `session_token` cookie:
   ```typescript
   const cookieStore = await cookies();
   cookieStore.delete('session_token');
   ```
3. **Client-Side Reset**: On successful action callback, force `window.location.href = '/'` to bypass all Next.js client-side route caching and wipe out memory states.
4. **Authentication Block**: Update `loginWithPasswordAction` (`src/actions/auth/password-login.ts`) and magic-link resolvers to forbid access to inactive accounts, serving a standard "Неверный email или пароль" message (to prevent account discovery attacks):
   ```typescript
   if (!user || user.isActive === false || user.deletedAt !== null) {
     return { error: "Неверный email или пароль", success: false };
   }
   ```

---

### Recommendation R4: Clean Account Switching UI on `/login`

If a user visits the `/login` route while already possessing an active session, they should see a premium profile card indicating their active login state, rather than being forced to log out from an obscured menu.

#### 1. Server-Side Page Audit (`src/app/(auth)/login/page.tsx`)
Verify the active session on the server and load the authenticated user's details:
```typescript
// src/app/(auth)/login/page.tsx
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';

export default async function LoginPage() {
  const session = await verifySession();
  let activeUser = null;

  if (session) {
    activeUser = await db.user.findUnique({
      where: { id: session.userId },
      select: { email: true, role: true }
    });
  }

  return (
    // ... layout wrappers ...
    <LoginForm currentUser={activeUser} />
    // ... layout wrappers ...
  );
}
```

#### 2. Premium Switch-Account Component (`src/app/(auth)/login/login-form.tsx`)
Incorporate the `currentUser` prop. If the user is logged in, hide the login inputs and render a card adhering to the B2B design guidelines:

```tsx
// src/app/(auth)/login/login-form.tsx
export function LoginForm({ currentUser }: { currentUser?: { email: string; role: string } | null }) {
  const [showForm, setShowForm] = useState(!currentUser);
  const [isPending, startTransition] = useTransition();

  const handleSwitchAccount = () => {
    startTransition(async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        toast.success('Сессия завершена');
        window.location.reload();
      } catch (err) {
        toast.error('Не удалось выйти из аккаунта');
      }
    });
  };

  if (currentUser && !showForm) {
    const isStaff = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'].includes(currentUser.role);
    const dashboardUrl = isStaff ? '/admin/dashboard' : '/dashboard';

    return (
      <div className="bg-card border border-border/60 rounded-2xl p-6 text-center space-y-5 shadow-sm animate-in fade-in duration-300">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg font-black uppercase mx-auto">
          {currentUser.email.substring(0, 2)}
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-foreground text-base">Вы уже в системе</h3>
          <p className="text-xs text-muted-foreground">
            Авторизован как <span className="font-semibold text-foreground">{currentUser.email}</span>
          </p>
          {isStaff && (
            <span className="inline-block text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md uppercase mt-1">
              Персонал ({currentUser.role})
            </span>
          )}
        </div>

        <div className="space-y-2 pt-2">
          <Link
            href={dashboardUrl}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-sm font-bold"
          >
            Продолжить работу
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          <button
            type="button"
            onClick={handleSwitchAccount}
            disabled={isPending}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-200 cursor-pointer"
          >
            {isPending ? 'Выход...' : 'Войти в другой аккаунт'}
          </button>
        </div>
      </div>
    );
  }

  // ... existing LoginForm forms render ...
}
```

---

## 4. Technical Risks & Mitigations

### 4.1. The Cascade Restriction Crash (Database-Level)
* **Risk**: If any code inadvertently attempts a `db.user.delete` on users with completed orders, payments, invoices, or ledger entries, database constraint `onDelete: Restrict` will cause a server crash or database exception.
* **Mitigation**: Strictly wrap the deletion action in a try-catch block and perform a soft-delete (using `$transaction` to atomically scrub PII and set `isActive = false` while keeping the `User` row intact). **Never invoke `db.user.delete` directly in the dashboard.**

### 4.2. Next.js Client-Side Route Caching Gotchas
* **Risk**: Next.js App Router aggressively caches segment layouts (like sidebar navigation, active header balances) in the browser. If a user deletes their account and we simply redirect via `router.push('/')`, the cache may retain old session data or trigger layout flashes.
* **Mitigation**: Do not rely on soft redirects (`router.push`). Use a physical window reload: `window.location.href = '/'` on successful soft-deletion. This purges all client memory states, wipes the Next.js router cache, and recreates the HTML context from scratch.

### 4.3. Multi-Device/Tab Ghost Sessions
* **Risk**: A user might have Smmplan open on a mobile browser and a desktop browser. If they soft-delete the account on desktop, the session cookie on mobile remains physically valid in the browser until it expires.
* **Mitigation**: Because `db.session.deleteMany({ where: { userId } })` is executed during the transaction, the mobile browser's session is deleted in PostgreSQL. The next request the mobile browser makes will call `verifySession()`. Because the session ID is no longer present in the database, `verifySession()` will fail and return `null`, causing an immediate redirect to `/login`.

### 4.4. Referral Tree Orphanage
* **Risk**: If a deleted user was referred by another user, or has invited referrals under their code, unique constraints and tree structures could break.
* **Mitigation**: Break references by setting `referredById = null` for the soft-deleted user, and nullify `referralCode` so that no new accounts can be linked to this soft-deleted user. Any existing referral payouts will point to the anonymized user, preserving the ledger balance history cleanly.
