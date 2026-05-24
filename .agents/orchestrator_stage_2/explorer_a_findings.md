# Explorer A Audit Findings: Concurrency, Transaction Isolation & Cold Starts in /admin/*

This report represents a comprehensive read-only audit of the Smmplan admin panel (`/admin/*`) focusing on two crucial areas:
1. **Concurrency & Transaction Isolation**: Potential race conditions, double-spend risks, and unsafe read-write patterns in Prisma DB operations.
2. **Cold Start & Empty States**: Visual density, skeletons, loading patterns, and system behavior under zero database records.

---

## 🎯 Executive Summary
The audit has identified **two critical concurrency/transaction isolation bugs** (one balance double-spending TOCTOU race condition in order rerouting, and one cold-start database crash in system settings) and **four distinct Cold Start/UX density issues** (including missing admin page skeletons, infinite loaders on empty list pages, and suboptimal database queries).

---

## 🔒 1. Concurrency & Transaction Isolation

### 🔴 Critical Bug C-001: Balance Double-Spend Race Condition in Order Rerouting
* **Target File**: `src/actions/admin/orders.ts`
* **Line Range**: 354–408
* **Verbatim Code Snippet**:
  ```typescript
  354: const result = await db.$transaction(async (tx) => {
  355:   const order = await tx.order.findUnique({
  356:     where: { id: orderId },
  357:     include: { user: true }
  358:   });
  ...
  375:   const user = await tx.user.findUnique({
  376:     where: { id: order.userId }
  377:   });
  378:   if (!user) throw new Error('Пользователь не найден');
  379: 
  380:   if (user.balance < order.charge) {
  381:     throw new Error(`Недостаточно средств: баланс ${(Number(user.balance)/100).toFixed(2)} ₽, требуется ${(Number(order.charge)/100).toFixed(2)} ₽`);
  382:   }
  ...
  405:   await tx.user.update({
  406:     where: { id: order.userId },
  407:     data: { balance: { decrement: order.charge } }
  408:   });
  ```
* **Step-by-Step Risk Description**:
  1. This Prisma transaction does **NOT** specify an isolation level (it defaults to `Read Committed` in PostgreSQL).
  2. If an admin is concurrently managing failed orders for the *same client* (e.g. bulk rerouting or double clicking buttons in two browser tabs), both transactions run in parallel.
  3. **Thread A** reads the user record (lines 375–377) and sees a balance of 1000 RUB. The order charge is 800 RUB. Balance check passes (line 380).
  4. **Thread B** concurrently reads the same user record (Read Committed allows reading the committed state) and also sees 1000 RUB. Order charge is 800 RUB. Balance check passes.
  5. **Thread A** decrements the balance by 800 RUB and commits. Balance is now 200 RUB.
  6. **Thread B** decrements the balance by 800 RUB and commits. Balance becomes **-600 RUB**.
  7. This is a classic Time-of-Check to Time-of-Use (TOCTOU) vulnerability that bypasses the billing check.
* **Proposed Precise Fix**:
  Either enforce `Serializable` isolation level (like `setOrderStatusAction` does) OR use an atomic decrement with a check directly in the DB criteria:
  ```typescript
  // Pass isolation level:
  const result = await db.$transaction(async (tx) => { ... }, { isolationLevel: 'Serializable' });
  ```

---

### 🔴 Critical Bug C-002: Cold Start Crash / Race Condition in System Settings
* **Target File**: `src/services/financial/accounting.service.ts`
* **Line Range**: 139–147
* **Verbatim Code Snippet**:
  ```typescript
  139: async getSettings() {
  140:   let settings = await db.systemSettings.findUnique({ where: { id: 'global' } });
  141:   if (!settings) {
  142:     settings = await db.systemSettings.create({
  143:       data: { id: 'global', taxRate: 6.0, opexMonthly: 0.0 }
  144:     });
  145:   }
  146:   return settings;
  147: }
  ```
* **Step-by-Step Risk Description**:
  1. On a completely new system deployment or empty database (Cold Start), there is no `SystemSettings` record with the primary key `global`.
  2. When the admin dashboard loads, it concurrently triggers metrics calculations which request these settings.
  3. Under concurrent loads, **Thread A** and **Thread B** both call `getSettings()` concurrently.
  4. Both read the database and find `settings` is `null` (line 140).
  5. **Thread A** goes on to create the setting record.
  6. **Thread B** concurrently tries to create the setting record with the same unique key (`id: 'global'`), raising a Prisma Unique Constraint Violation error (`P2002: Unique constraint failed on the fields: (id)`).
  7. This crashes the Admin Dashboard page for the operator.
* **Proposed Precise Fix**:
  Use atomic database `upsert` directly, which handles concurrency conflicts safely in Postgres:
  ```typescript
  async getSettings() {
    return db.systemSettings.upsert({
      where: { id: 'global' },
      update: {},
      create: { id: 'global', taxRate: 6.0, opexMonthly: 0.0 }
    });
  }
  ```

---

### ⚠️ Performance/Auditing Vulnerability C-003: Non-Awaitable Admin Audit Logs
* **Target File**: `src/actions/admin/users.ts`
* **Line Range**: 14–55 (`updateBalanceAction`)
* **Step-by-Step Risk Description**:
  1. The action captures the current user balance (`const currentBalance = Number(client.balance)`).
  2. It updates the database using Prisma's atomic increment (`balance: { increment: increment }`).
  3. It then triggers `auditAdmin(...)` which is a fire-and-forget, non-blocking call.
  4. Under high concurrent updates (e.g. automated payment hook firing at the same time an admin processes a manual refund), the `newValue` field written to the audit log (`currentBalance + increment`) is calculated using stale client state, leading to **inconsistent/incorrect audit records** even though the DB balance itself remains mathematically correct.
* **Proposed Precise Fix**:
  Ensure audit logging uses the actual return value of the `db.user.update` statement rather than pre-calculated values, and optionally await crucial billing operations.

---

## ❄️ 2. Cold Start & Empty States

### 🧊 UX Anomaly S-001: Missing `loading.tsx` / Admin Page Skeletons
* **Scope**: All routes under `src/app/admin/` (`dashboard`, `orders`, `tickets`, `catalog`, `clients`, `refills`, `providers`)
* **Direct Observation**:
  There are **zero** `loading.tsx` files implemented anywhere in the admin app router directory.
* **Step-by-Step Risk Description**:
  1. The dashboard page performs heavy aggregations (e.g., `accountingService.getMetrics()`, `adminOrderService.getOrdersTimeseries(30)`) sequentially or inside `Promise.all`.
  2. On a cold database start or when the platform contains millions of orders, these database operations will take several seconds to execute.
  3. Because Next.js lacks a folder-level `loading.tsx` file for `/admin`, the browser will appear frozen, stuck on the previous page with no loading indicators, progressive skeletons, or loading spinners.
  4. This violates the **Visual & UX Density** principle and compromises WCAG accessibility.
* **Proposed Precise Fix**:
  Create dedicated `loading.tsx` files inside `src/app/admin/` (or individual sub-folders) returning high-fidelity table and grid skeletons modeled using Tailwind 4 semantic tokens (e.g., animate-pulse elements with `bg-muted/50`).

---

### 🧊 UX Anomaly S-002: Infinite Sidebar Loader on Admin Client Page
* **Target File**: `src/app/admin/clients/page.tsx`
* **Line Range**: 49–50, 104–191
* **Direct Observation**:
  When visiting `/admin/clients`, `selectedUserId` is undefined by default (no user is selected). The sidebar logic handles this by rendering an active loading spinner saying "Загрузка профиля...":
  ```typescript
  104: {userCard ? (
  105:   <div className="space-y-4">...</div>
  106: ) : (
  107:   <div className="py-12 flex flex-col items-center gap-4 justify-center h-full text-muted-foreground">
  108:     <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
  109:     Загрузка профиля...
  110:   </div>
  111: )}
  ```
* **Step-by-Step Risk Description**:
  1. When an administrator loads `/admin/clients` for the first time, `selectedUserId` is undefined, setting `userCard` to `null`.
  2. The sidebar permanently displays a loading spinner and "Загрузка профиля...".
  3. The operator is led to believe the platform is stuck or failing to load data, when in reality it is simply waiting for a row in the table to be clicked.
* **Proposed Precise Fix**:
  Check if `selectedUserId` is present first, and display a proper empty/placeholder state:
  ```typescript
  {!selectedUserId ? (
    <div className="py-12 flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-2">
      <Users className="w-8 h-8 opacity-25" />
      <h4 className="font-bold text-sm">Профиль не выбран</h4>
      <p className="text-xs max-w-[200px]">Выберите клиента из списка слева для управления балансом</p>
    </div>
  ) : !userCard ? (
    <div className="py-12 flex flex-col items-center gap-4 justify-center h-full text-muted-foreground">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent bg-transparent rounded-full"></div>
      Загрузка профиля...
    </div>
  ) : (
    <div className="space-y-4">...</div>
  )}
  ```

---

### 🧊 UX Anomaly S-003: Suboptimal Sequential Queries / DB Overload in Refills
* **Target File**: `src/app/admin/refills/page.tsx`
* **Line Range**: 32–60
* **Direct Observation**:
  On every page load, `/admin/refills` executes 5 separate query operations back-to-back:
  ```typescript
  32: const [refills, stats] = await Promise.all([
  33:   db.refill.findMany({ ... }),
  34:   db.refill.aggregate({ ... })
  35: ]);
  57: const totalCount = await db.refill.count();
  58: const pendingCount = await db.refill.count({ where: { status: 'PENDING' } });
  59: const completedCount = await db.refill.count({ where: { status: 'COMPLETED' } });
  ```
* **Step-by-Step Risk Description**:
  1. Triggering `db.refill.count` separately three times sequentially (lines 57, 58, 59) outside the `Promise.all` block is a severe performance anti-pattern.
  2. Each count query blocks the server action and consumes PostgreSQL connection pool slots.
  3. Under load with large tables, this slows down the page and increases the risk of request timeout or database connection timeouts.
* **Proposed Precise Fix**:
  Move all database counts into a single consolidated `db.refill.groupBy` call or bundle them inside a single `Promise.all`:
  ```typescript
  const [refills, totalCount, pendingCount, completedCount] = await Promise.all([
    db.refill.findMany({ ... }),
    db.refill.count(),
    db.refill.count({ where: { status: 'PENDING' } }),
    db.refill.count({ where: { status: 'COMPLETED' } }),
  ]);
  ```

---

### 🧊 UX Anomaly S-004: Table Empty States Lack Visual & B2B Polish
* **Target File**: `src/components/ui/data-table.tsx`
* **Line Range**: 141–145
* **Direct Observation**:
  ```typescript
  141: {!table.getRowModel().rows?.length && (
  142:   <div className="h-24 w-full flex items-center justify-center text-sm text-muted-foreground bg-card">
  143:     Нет результатов.
  144:   </div>
  145: )}
  ```
* **Step-by-Step Risk Description**:
  1. When no records match filters or the database is newly created (Cold Start), lists like Orders and Tickets render a plain text block saying "Нет результатов." inside a dark card.
  2. This lacks professional design polish, fails to match the premium dark theme conventions, and doesn't offer any Call to Action (CTA) or instructions to the administrator on how to resolve the empty state.
* **Proposed Precise Fix**:
  Add an elegant icon wrapper with a clear CTA depending on the route context.

---

## 🛡️ 3. Verification & Diagnostic Methods

To verify the race conditions and empty states independently:

1. **Verify C-001 (TOCTOU in Order Rerouting)**:
   Trigger parallel requests to the manual reroute server action for the same order and same user concurrently. Check if user balance falls below zero.
2. **Verify C-002 (System Settings Crash)**:
   Delete the global settings record:
   ```bash
   npx prisma db execute --stdin "DELETE FROM \"SystemSettings\" WHERE id='global';"
   ```
   Fire 5 concurrent requests to `/admin/dashboard` concurrently and observe the database unique key violation log.
3. **Verify S-002 (Infinite Sidebar Loader)**:
   Visit `/admin/clients` directly in the browser. Note that the sidebar displays the active loading spinner infinitely.
4. **Verify S-003 (Refills performance)**:
   Inspect Prisma query logs (`log: ['query']`) when visiting `/admin/refills` to count the number of synchronous SQL statements generated.
