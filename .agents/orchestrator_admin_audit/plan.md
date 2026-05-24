# Audit Plan: Smmplan Admin Panel

## 🎯 Objectives
Conduct a thorough audit of the Smmplan admin panel (`/admin/*`) across three dimensions (Routing & Navigation, Server Actions & Backend, Operator B2B UX) and produce a detailed report `admin_panel_audit_report.md` in the `brain` folder.

## 🗺 Decomposition & Tasks

### Step 1: Codebase Mapping & Exploratory Audit (Explorer Agent)
- Identify all routes under `src/app/admin/` (Dashboard, Finance, Marketing, Orders, Providers, Settings, Tickets, CMS)
- Check all navigation links, sidebar components, layouts, and route transition states
- Audit all Server Actions inside `src/actions/admin/` or related directories, checking for `requireAdmin()` guards and Prisma database integrations
- Inspect UI components for B2B UX quality, Tailwind CSS v4 conformity, and HeroUI v3 dot-notation usage
- Highlight errors (broken links, unhandled edge cases, missing loaders, lack of safety checks, hydration errors)

### Step 2: Quality Gates & Build Verification (Worker Agent)
- Perform build checks using `npm run build` or `npx tsc --noEmit`
- Run linting and check if there are any TS/ESLint violations in `src/app/admin` or `src/actions/admin`

### Step 3: Synthesis & Report Generation (Orchestrator Synthesis)
- Consolidate all findings from the Explorer and Worker agents
- Build a structured Priority Matrix (Critical, Major, Minor) with detailed issues, code references, and recommendations
- Write `admin_panel_audit_report.md` to `d:\SMM_plan_2\brain\admin_panel_audit_report.md`

### Step 4: Final Verification
- Review the generated report against AGENTS.md requirements
- Report completion back to the parent agent

## 🛡 Risk Management / Pre-Mortem
1. **Explorer takes too long:** Break down the audit page-by-page if needed. Set a liveness safety timer of 10 minutes.
2. **Missing `brain` folder:** Verify if `d:\SMM_plan_2\brain\` exists; create it if not.
3. **Build errors in unrelated areas:** Focus specifically on whether the build succeeds and detail any TS errors found in the admin routes.
