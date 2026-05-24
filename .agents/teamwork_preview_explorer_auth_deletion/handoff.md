# Handoff Report — Smmplan Auth & Deletion Audit

**Author**: Teamwork Explorer (Read-Only Deep Investigation)  
**Date**: May 23, 2026  
**Status**: Task Complete  

---

## 1. Observation

Direct code observations from the Smmplan codebase:

1. **Database Constraints on User Deletion (`prisma/schema.prisma`)**:
   - `Order` model (line 265): `user User @relation(fields: [userId], references: [id], onDelete: Restrict)`
   - `Payment` model (line 302): `user User @relation(fields: [userId], references: [id], onDelete: Restrict)`
   - `Invoice` model (line 336): `user User @relation(fields: [userId], references: [id], onDelete: Restrict)`
   - `LedgerEntry` model (line 575): `user User @relation("UserLedger", fields: [userId], references: [id], onDelete: Restrict)`

2. **Session Verification (`src/lib/session.ts`)**:
   - `verifySession` (lines 77-79) queries:
     ```typescript
     const session = await db.session.findUnique({ where: { id: sessionId } });
     if (!session) return null;
     ```
   - Invalidation during password changes is already accomplished via `db.session.deleteMany` in `changePasswordAction` (`src/actions/auth/password-settings.ts`, lines 109-112).

3. **Current Login View (`src/app/(auth)/login/page.tsx` & `login-form.tsx`)**:
   - `LoginPage` is forced dynamic (line 4) and serves `<LoginForm />` inside `src/app/(auth)/login/page.tsx` (line 75) without performing any server-side session checks.
   - `LoginForm` uses `loginWithPasswordAction` (line 41) or magic links (line 20).

4. **Settings Page (`src/app/dashboard/settings/page.tsx`)**:
   - Client profile dashboard containing stat cards, loyalty tier, and password update via `PasswordCard` (lines 18-257). It does not currently contain any account deletion triggers.

---

## 2. Logic Chain

1. **Soft-Deletion vs. Hard-Deletion**:
   - *Premise*: `prisma/schema.prisma` declares `onDelete: Restrict` relationships on `Order`, `Payment`, `Invoice`, and `LedgerEntry` to protect historical audit data.
   - *Reasoning*: A hard-delete operation (`db.user.delete`) will trigger a foreign-key restriction error from PostgreSQL and fail instantly if a user has any orders or payments.
   - *Conclusion*: A soft-deletion method that updates `isActive = false`, nullifies unique identifiers (`telegramId`, `phoneHash`, `apiKeyHash`, B2B billing details), and randomizes `email` to `deleted_${userId}@smmplan.local` is the only way to satisfy GDPR/FZ-152 while preserving database integrity.

2. **Database Schema Alteration**:
   - *Premise*: The current `User` model lacks fields to record a soft-deleted status.
   - *Reasoning*: Adding `isActive Boolean @default(true)` and `deletedAt DateTime?` to the `User` model provides an elegant, indexing-friendly way to mark accounts as inactive.
   - *Conclusion*: An index-backed schema migration adding these two fields is required.

3. **Robust Session Purging**:
   - *Premise*: Setting `isActive = false` on a user will keep their active sessions alive in user cookies unless deleted.
   - *Reasoning*: Because the `Session` table has a cascade constraint on the `User` table, deleting the user's `Session` records directly in the DB will immediately cause all subsequent `verifySession` checks on other devices to fail.
   - *Conclusion*: Instantly purge `db.session.deleteMany({ where: { userId } })` in the database transaction and erase `session_token` via `cookies().delete` to ensure total session isolation.

4. **Account Switching UI**:
   - *Premise*: If a user with a valid cookie visits `/login`, the current setup forces them to manually navigate back to `/dashboard` to find a sign-out button.
   - *Reasoning*: Fetching `await verifySession()` and the corresponding user's details on the server in `src/app/(auth)/login/page.tsx` allows passing active user details directly into the client-side `LoginForm`.
   - *Conclusion*: Render a beautiful, premium account switcher card if they are logged in, with simple "Продолжить работу" (Continue) and "Войти в другой аккаунт" (Log out / Switch account) buttons.

---

## 3. Caveats

1. **Grace Period Policies**: This audit assumes soft-deletion is immediate and permanent. If Smmplan decides to offer a 30-day grace period where the user can restore their account, PII anonymization must be deferred until the grace period expires, and a background cron job must handle the final purging.
2. **Third-Party Providers**: Soft-deletion will deactivate local accounts but will not automatically clean up user data on external SMM panels (e.g. VexBoost) or YooKassa, as those transactions are legally finalized and sealed.

---

## 4. Conclusion

We have established a watertight implementation path for user-initiated account deletion, multi-device session purging, and an account switcher dashboard inside `/login`. All suggestions adhere strictly to `AGENTS.md` guidelines, including the use of semantic tokens, HeroUI v3 dot notation, and App Router principles. No codebase edits were performed as this was a read-only investigation.

The full analysis is documented at:
`d:\SMM_plan_2\.agents\teamwork_preview_explorer_auth_deletion\analysis.md`

---

## 5. Verification Method

To verify the findings and subsequent implementation:
1. **Prisma Type-Safety Check**: Run `npx tsc --noEmit` and check that the schema changes do not break other queries.
2. **Database Constraint Test**: Inspect `prisma/schema.prisma` and attempt a simulated manual soft-deletion via Prisma Studio to ensure that foreign keys on `Order` and `Payment` remain fully intact.
3. **Session Purge Test**: Delete an active session record from the database and verify that `verifySession()` in `src/lib/session.ts` instantly invalidates the user's cookies.
