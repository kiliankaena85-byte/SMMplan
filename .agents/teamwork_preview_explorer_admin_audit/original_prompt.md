## 2026-05-23T08:09:32Z
You are a teamwork_preview_explorer (read-only exploration agent).
Your working directory is 'd:\SMM_plan_2\.agents\teamwork_preview_explorer_admin_audit'.

Your mission is to conduct a comprehensive visual, logical, UX/UI, routing, and backend connection (Server Actions & Prisma) audit of the Smmplan admin panel ('/admin/*') in accordance with d:\SMM_plan_2\ORIGINAL_REQUEST.md and d:\SMM_plan_2\AGENTS.md guidelines.

Please perform the following steps:
1. Initialize your BRIEFING.md and progress.md in your working directory ('d:\SMM_plan_2\.agents\teamwork_preview_explorer_admin_audit').
2. Map the routes under 'src/app/admin/' and actions under 'src/actions/admin/' (including related actions like cms/pages, finance/settings, etc.).
3. Conduct a deep code inspection of:
   - **Routing and Navigation**: Verify layouts (e.g., sidebar links, sidebar design, route transitions, hydration safety, error boundaries).
   - **Server Actions & Database Connections**: Check that all actions are secured with 'requireAdmin()', handle validation/errors properly, and perform correct Prisma queries/mutations. Check for any Trust Boundary vulnerabilities, IDOR, or data leaks.
   - **Operator-Centric B2B UX**: Audit tables (must use HeroUI v3 dot notation, have 'aria-label', not use 1px solid borders between rows, instead using tonal contrast), filters, loaders, responsive grids (320px to 4K), data density, and WCAG 2.2 AA accessibility (touch target >= 44px on mobile/interactive elements, high contrast).
   - **Tailwind CSS v4 & HeroUI v3**: Verify correct syntax (e.g., no hardcoded colors, use semantic tokens, correct HeroUI import conventions).
4. Identify and catalog all bugs, missing elements, and safety gaps. Assess their priority (Critical, Major, Minor).
5. Compile your detailed findings into a comprehensive audit document 'findings.md' in your working directory.
6. Report back to me (the Project Orchestrator) with your completed findings and a pointer to your 'findings.md' file.
