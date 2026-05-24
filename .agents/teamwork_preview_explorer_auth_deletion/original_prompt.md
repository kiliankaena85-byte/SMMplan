## 2026-05-23T13:15:37Z

Perform a read-only deep audit of Smmplan's authentication, session management, and settings architecture.

Your objective is to identify precisely how we can integrate user-initiated soft-deletion, robust session isolation/purging, and a clean account switching UI on /login.

Specifically, inspect:
1. `prisma/schema.prisma` - Determine the current fields on User, Session, and other related models (Order, Ticket, Payment, etc.). Check if there are foreign key constraints (like Cascade vs Restrict vs SetNull) that we need to keep in mind, and determine if any schema alterations are required.
2. `src/app/(auth)/login/page.tsx` and `src/app/(auth)/login/login-form.tsx` - Review how authentication is initiated, where users are redirected, and how we can show a premium card for already logged-in users with options to continue or log out/switch.
3. `src/actions/auth/password-login.ts` and `src/lib/session.ts` - Understand how session creation, JWT signing, cookies, and verification work.
4. `src/app/dashboard/settings/page.tsx` - Locate the client user settings page and examine how to integrate the "Удаление аккаунта" (Delete Account) flow, including modal interactions, typing "УДАЛИТЬ", and password verification (where/how credentials can be verified).
5. Search for any existing logout actions or endpoints, e.g. how logout is currently initiated in the UI or backend.

Write your findings to a file named `analysis.md` in your working directory `d:\SMM_plan_2\.agents\teamwork_preview_explorer_auth_deletion\`.
Your output must include:
- Exact filenames and relevant code sections.
- Recommendations for implementing the R1, R2, R3, R4 requirements.
- Any potential risks (e.g., cascade delete issues, Next.js route caching gotchas).

Do NOT modify any source files. Deliver your handoff and notify when complete.
