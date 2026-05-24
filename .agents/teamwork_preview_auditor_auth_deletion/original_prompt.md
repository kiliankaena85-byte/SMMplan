## 2026-05-23T21:48:30Z
You are the teamwork_preview_auditor.
Your mission is to perform a strict forensic integrity audit on the user soft-deletion, session deactivation, action blocking, and dynamic account switcher implementation on Smmplan.

Specifically, inspect:
1. `src/actions/auth/delete-account.ts` - Check that it uses a secure Prisma transaction ($transaction) to scrub PII, nullify Telegram/B2B/Referral/API fields, set passwordHash to null, set isDeleted=true, isActive=false, delete sessions/tokens, and log USER_ACCOUNT_SOFT_DELETION.
2. `src/lib/session.ts` - Verify that `verifySession` includes the user and rejects session lookup if `isDeleted === true` or `isActive === false`.
3. `src/actions/order/checkout.ts`, `src/actions/user/top-up.action.ts`, `src/actions/user/referral.action.ts`, and `src/services/users/loyalty.service.ts` - Verify that soft-deleted or inactive users are strictly blocked from checkout, balance deposits, transferring referral balance, and receiving referral commissions.
4. `src/actions/auth/password-login.ts` and `src/actions/auth/request-magic-link.ts` - Verify that blocked/inactive/deleted users are rejected with a standardized generic error message "Неверный email или пароль" (or similar standard message) to prevent account enumeration.
5. `src/app/api/auth/logout/route.ts` - Verify that GET and POST routes cleanly delete DB session, clear cookies, and set strict Cache-Control headers (`no-store, max-age=0, must-revalidate`).
6. `src/app/(auth)/login/page.tsx` - Verify the account switcher checks the DB user role and redirects staff to `/admin/dashboard` or normal clients to `/dashboard`.
7. Perform an overall integrity scan to ensure all implementations are authentic, secure, and fully operational (no cheating, dummy, or hardcoded mock implementations).

Please compile your findings and state your binary verdict (CLEAN or VIOLATION) in a file named `report.md` under `d:\SMM_plan_2\.agents\teamwork_preview_auditor_auth_deletion\report.md`. Handoff and notify me once done!
