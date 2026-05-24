## 2026-05-23T21:42:00Z
You are the teamwork_preview_worker.
Your mission is to implement a robust, transaction-secured user-initiated soft-deletion flow, session isolation, and account switching UI on Smmplan.

Here is the exact task list:

### Step 1: Secure Deletion Action Refinement (`src/actions/auth/delete-account.ts`)
Modify `deleteAccountAction` Server Action:
1. Verify the active session using `verifySession()` and retrieve the user from the database.
2. If the user has a password set, verify the password using `verifyPassword` from `@/lib/auth/password`.
3. Wrap the database updates in a Prisma `$transaction`:
   - Anonymize `email` to `deleted_${userId}@smmplan.local` to fulfill GDPR/FZ-152 compliance and free up the original email for clean reuse.
   - Nullify unique integration identifiers: `telegramId = null`, `phoneHash = null`, `apiKeyHash = null`, `referralCode = null`.
   - Nullify B2B billing details: `companyName = null`, `inn = null`, `kpp = null`, `legalAddress = null`.
   - Set `passwordHash = null` and break referral links: `referredById = null`.
   - Set flags: `isDeleted = true` and `isActive = false`.
   - Delete all active DB sessions and auth tokens for this user: `db.session.deleteMany({ where: { userId } })` and `db.authToken.deleteMany({ where: { userId } })`.
   - Write a `USER_ACCOUNT_SOFT_DELETION` audit log within the transaction.
4. Outside the transaction, clear the `session_token` cookie and set `explicit_logout = 'true'` cookie in response headers.
5. Return `{ success: true, error: null }`.

### Step 2: Enforce Database-Level Session Validation (`src/lib/session.ts`)
Modify `verifySession`:
- Change `db.session.findUnique` query to include the user record: `include: { user: true }`.
- Validate user state: `if (!session.user || !session.user.isActive || session.user.isDeleted) return null;`
- Keep the return signature of `{ userId: string }` if valid.

### Step 3: Block Account Actions for Deleted/Inactive Users
1. **Checkout Orders (`src/actions/order/checkout.ts`)**:
   - In `checkoutAction`, after retrieving `user`: `if (user && (user.isDeleted || !user.isActive)) throw new Error("Ваш аккаунт заблокирован или удален");`.
   - In `retryCheckoutAction`, after retrieving `order`: `if (order.user.isDeleted || !order.user.isActive) throw new Error("Ваш аккаунт заблокирован или удален");`.
2. **Add Balance / Deposits (`src/actions/user/top-up.action.ts`)**:
   - In `createTopUpPaymentAction`, after retrieving `dbUser`: `if (dbUser.isDeleted || !dbUser.isActive) throw new Error("Ваш аккаунт заблокирован или удален");`.
3. **Transfer Referral Balance (`src/actions/user/referral.action.ts`)**:
   - In `transferReferralBalanceAction`, query `isActive` and `isDeleted` on the user, and if they are deleted or inactive, throw a standard `new Error("Ваш аккаунт заблокирован или удален")`.
4. **Referral Payouts / Commissions (`src/services/users/loyalty.service.ts`)**:
   - In `awardCommission`, select the `referrer`'s `isActive` and `isDeleted` flags. If `referrer.isDeleted || !referrer.isActive`, skip commission award and return immediately.

### Step 4: Refine Cache Invalidation, Routing, and Anti-Enumeration Messages
1. **Anti-Enumeration in Authentication Actions**:
   - In `src/actions/auth/password-login.ts` (lines 53-56) and `src/actions/auth/request-magic-link.ts` (lines 49-52), change the error message for blocked/deleted/inactive users to the generic standard message: "Неверный email или пароль" (or similar standard message).
2. **Logout Response Headers (`src/app/api/auth/logout/route.ts`)**:
   - Update both `GET` and `POST` handlers to retrieve the redirected `NextResponse` and append header `Cache-Control: no-store, max-age=0, must-revalidate`.
   - Ensure it redirects to `/login` instead of `/`.
3. **Account Switcher (`src/app/(auth)/login/page.tsx`)**:
   - In `LoginPage`, query user `email` and `role`. If authenticated, set the redirect link to `/admin/dashboard` for staff roles (`OWNER`, `ADMIN`, `MANAGER`, `SUPPORT`) and `/dashboard` for standard clients, then render the appropriate `<Link>` element with that path instead of hardcoding `/dashboard`.

### Step 5: Implement Automated Integration Tests
Create a new Vitest test file `src/services/users/__tests__/deletion.test.ts` to assert:
- Deletion sets `isDeleted = true`, `isActive = false`, anonymizes email, and deletes sessions.
- Inactive/deleted users are blocked from password and magic link authentication.
- Soft-deleted users are blocked from checkout, balance deposits, transferring referral balance, and referral commission awards.
- Historical ledger and orders remain fully intact.
Verify tests pass using vitest.

### Step 6: Review, Compile and Verify
- Run strict typechecks: `npx tsc --noEmit`
- Run production build: `npm run build`
- Report build and test outcomes in your handoff report.
