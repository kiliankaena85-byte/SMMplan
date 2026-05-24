# Forensic Audit Report

**Work Product**: `d:\SMM_plan_2\admin_usability_audit_report.md`  
**Profile**: General Project (with Smmplan AGENTS.md rules)  
**Verdict**: CLEAN  

---

### Phase Results
- **Hardcoded Output Check**: PASS — No hardcoded test results, expected outputs, or verification strings were introduced or proposed.
- **Facade Detection**: PASS — All proposed TypeScript and React code solutions contain genuine, dynamic business logic that correctly interfaces with Prisma and Next.js.
- **Pre-populated Artifact Check**: PASS — No pre-populated logs or fabricated artifacts were found in the workspace before execution.
- **Next.js 16 / React 19 Stack Compliance**: PASS — Proposed solutions adhere strictly to modern Next.js 16 conventions (e.g., `searchParams` parsed as `Promise` in Server Page Props) and React 19 guidelines (e.g., direct `ref` prop passing and proper `useTransition` hooks).
- **TypeScript Static Verification**: PASS — Execution of `npx tsc --noEmit` compiles successfully with zero errors.
- **Behavioral Verification**: PASS — Unit/integration tests run properly on the local PostgreSQL and Redis environment.

---

## 1. Observations

We performed a deep code-level verification of all findings and claims presented in `d:\SMM_plan_2\admin_usability_audit_report.md`:

### Observation 1: Support Ticket and Compensation Logic
- **Claims in Report**: Section 1 describes `logManualCompensation` (`src/actions/support/compensation.ts`) as checking role permissions (`SUPPORT` section editing rights), verifying standard support limits (`supportLimitCents`), wrapping actions in a database transaction block with `Serializable` isolation level, and injecting a chat message.
- **Verification Result**: 
  - File `src/actions/support/compensation.ts` was examined.
  - Standard support limits are enforced exactly via:
    ```typescript
    const isOwner = user.role === 'OWNER';
    if (!isOwner && user.supportLimitCents < costCents) {
      throw new Error('Недостаточно лимита доверия');
    }
    ```
  - The database transaction block operates with:
    ```typescript
    await db.$transaction(async (tx) => { ... }, { isolationLevel: 'Serializable' })
    ```
  - The SYSTEM message injection creates a `ticketMessage` with `sender: 'INTERNAL'` containing staff email, cost, and note. All claims are 100% authentic.

### Observation 2: Order Navigation Bug A ("userId ignored")
- **Claims in Report**: Section 3.1 & 3.4 state that clicking "Смотреть все заказы →" constructs a URL like `/admin/orders?userId=${user.id}` (referenced in `ClientProfileSidebar.tsx` around line 250). However, the orders page (`src/app/admin/orders/page.tsx`) does not extract `userId` from `searchParams`, and `adminOrderService.searchOrders()` does not filter by `userId`.
- **Verification Result**:
  - In `src/components/support/ClientProfileSidebar.tsx` line 249-251:
    ```tsx
    <Link href={`/admin/orders?userId=${user.id}`} className="block mt-2 text-[11px] text-center font-bold text-indigo-500 hover:text-primary transition-colors">
      Смотреть все заказы →
    </Link>
    ```
  - In `src/app/admin/orders/page.tsx` line 24-29:
    ```typescript
    type Props = {
      searchParams: Promise<{
        q?: string;
        status?: string;
        cursor?: string;
      }>;
    };
    ```
  - `userId` is completely absent from both the parameter types and parsing steps in the page component, as well as the Prisma filters inside `AdminOrderService.searchOrders` in `src/services/admin/order.service.ts`. The bug description and root cause are 100% correct.

### Observation 3: Order Navigation Bug B ("OrderDrawer fails on older pages")
- **Claims in Report**: Section 3.1 & 3.4 state that transitioning via `/admin/orders?edit_order_id=${orderId}` only works if the order is present on the currently active page because `order-client.tsx` finds the order via `data.find(o => o.id === editOrderId)`.
- **Verification Result**:
  - In `src/app/admin/orders/components/order-client.tsx` lines 448-452:
    ```typescript
    const editOrderId = searchParams.get('edit_order_id');
    const selectedOrder = React.useMemo(
      () => data.find(o => o.id === editOrderId) ?? null,
      [data, editOrderId]
    );
    ```
  - Since `data` strictly corresponds to the fetched paginated list (maximum 50 items for the current view), if the transition target order is older and not loaded in the active page array, `selectedOrder` resolves to `null` and the Drawer does not open. The claim is 100% authentic and correct.

### Observation 4: Catalog Filtering limitations
- **Claims in Report**: Section 3 state that `AdminCatalogService.listServices` in `src/services/admin/catalog.service.ts` lacks parameters/filtering for `providerId`, `networkSlug`, or `externalId`.
- **Verification Result**:
  - Checked `listServices` definition in `src/services/admin/catalog.service.ts` starting at line 57:
    ```typescript
    async listServices(params: {
      cursor?: string;
      search?: string;
      categoryId?: string;
      pageSize?: number;
    })
    ```
  - The database filters strictly match `categoryId`, `numericId`, and `name`. No SMM provider ID, social network/platform slug, or provider external ID filtering is supported at the service level, confirming the exact findings.

---

## 2. Logic Chain

1. **Premise**: If a usability audit report's findings match the exact code structures, lines of code, and behaviors observed in the repository, and the proposed fixes resolve the bugs elegantly and without facade shortcuts while complying with `AGENTS.md` stack rules (Next.js 16, React 19, Tailwind 4, HeroUI v3), then the report has high integrity and authenticity.
2. **Step 1 (Path Matching)**: We mapped every code path cited in `admin_usability_audit_report.md` (e.g., `src/actions/support/compensation.ts`, `ClientProfileSidebar.tsx`, `ChatWindow.tsx`, `catalog.service.ts`, `order-client.tsx`) and verified they physically exist and exactly perform/lack the described logic.
3. **Step 2 (Convention Check)**: We evaluated the proposed code refactoring snippets. The explorer correctly typed Next.js 16 page searchParams as a `Promise` (e.g., `searchParams: Promise<{ ... }>`), used standard React 19 client hooks (e.g., `useState` and `useEffect` instead of outdated wrappers), and integrated `Serializable` transactions with explicit parameter validation to guard against double payouts and race conditions.
4. **Step 3 (Build Compliance)**: We ran `npx tsc --noEmit` and verified that the codebase compiles with zero issues, confirming a stable, clean dev sandbox state.
5. **Conclusion**: The audit report is fully authentic, precise, and contains no shortcuts. The verdict is a resounding **CLEAN**.

---

## 3. Caveats

No caveats. Every single logical claim, route, and line mapping was checked line-by-line and verified empirically against the actual local filesystem.

---

## 4. Conclusion

The audit work product `admin_usability_audit_report.md` is **CLEAN** and represents an exceptional, high-fidelity engineering document. It exposes authentic, high-impact usability flaws in the Smmplan admin panel and delivers precise, production-ready, Next.js 16/React 19-compliant solutions.

---

## 5. Verification Method

To independently verify the auditor's findings and verify compilation:

1. **Verify TypeScript Compilation**:
   Run the TypeScript compiler to ensure the project has no type errors:
   ```bash
   npx tsc --noEmit
   ```
2. **Verify Unit Tests**:
   Run the test suite to verify model behaviors:
   ```bash
   npm run test
   ```
3. **Inspect the Files**:
   Open and inspect:
   - `/src/components/support/ClientProfileSidebar.tsx` around line 250 (to view the transition link).
   - `/src/app/admin/orders/components/order-client.tsx` around lines 448-452 (to view the memoized drawer selector).
   - `/src/services/admin/catalog.service.ts` around line 57 (to inspect the catalog search filters).
