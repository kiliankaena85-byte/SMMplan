# Stage 3 Code Exploration Report: Comprehensive E2E Support & Admin Verification

This report provides a comprehensive, read-only analysis of the Smmplan codebase for **Stage 3: Comprehensive E2E Support & Admin Verification**. It details the structural architecture, component logic, validators, database models, and E2E test setup to facilitate seamless verification and implementation.

---

## 1. Support Chat (R1)

### Routing & Redirect Patterns for `/dashboard/tickets`
*   **Redirect file**: `src/app/dashboard/tickets/page.tsx`
    *   **Behavior**: When a user accesses `/dashboard/tickets`, they are instantly routed to their active (non-`CLOSED`) support chat room using an on-the-fly lookup/creation:
        ```typescript
        // Lines 11-19
        const ticket = await ticketService.getOrCreateTicket(
          session.userId,
          'Чат с поддержкой',
          'WEB'
        );
        redirect(`/dashboard/tickets/${ticket.id}`);
        ```
*   **Individual Ticket page**: `src/app/dashboard/tickets/[id]/page.tsx`
    *   **Behavior**: Validates ticket ownership and loads historical data. If the ticket doesn't exist or is not owned by the active session's `userId`, it triggers a `notFound()` response:
        ```typescript
        // Lines 21-31
        const ticket = await db.ticket.findUnique({
          where: { id },
          select: { id: true, subject: true, status: true, userId: true },
        });
        if (!ticket || ticket.userId !== session.userId) return notFound();
        ```

### Loading Historical Messages & Separator Logic
*   **Historical Ticket Loading**: Inside `src/app/dashboard/tickets/[id]/page.tsx` (lines 33-86):
    *   Fetches the user's **3 most recent `CLOSED` tickets** (excluding the currently active ticket).
    *   Orders them by `updatedAt: 'desc'` and retrieves their messages (excluding internal notes: `sender: { not: 'INTERNAL' }`).
    *   Maps these historical messages chronologically, oldest closed ticket first (`reversedHistorical = [...historicalTickets].reverse()`).
    *   Sets `isHistorical: true` on each message, storing metadata like `historicalTicketId` and `historicalSubject`.
*   **Separator Rendering Logic**: Inside `src/components/support/ChatWindow.tsx` (lines 441, 453-459):
    *   The `showSeparator` boolean detects the boundary where the previous message was historical (`isHistorical === true`) and the current message is active (`isHistorical !== true`):
        ```typescript
        const showSeparator = index > 0 && messages[index - 1].isHistorical && !msg.isHistorical;
        ```
    *   When `showSeparator` is true, it renders a semantic visual line with the label:
        ```tsx
        <span className="text-xs font-semibold uppercase text-slate-500 tracking-widest">--- Диалог завершен ---</span>
        ```
    *   It also renders individual ticket markers above historical blocks:
        ```tsx
        {msg.isHistorical && (index === 0 || messages[index - 1].historicalTicketId !== msg.historicalTicketId) && (
          <div className="text-center text-[10px] uppercase font-bold text-slate-400 my-4 bg-slate-100 rounded-full px-3 py-1 w-max mx-auto border border-slate-200">
            История: {msg.historicalSubject || 'Предыдущий тикет'}
          </div>
        )}
        ```

### Premium Order Binding Button & Dropdown (📦)
*   **Location**: `src/components/support/ChatWindow.tsx` (lines 806-870) and input preview (lines 768-782).
*   **Status**: Already implemented!
*   **Behavior**:
    *   Accepts `initialOrders` from `src/app/dashboard/tickets/[id]/page.tsx` (which pulls the 5 most recent orders).
    *   Renders a `📦` button that toggles `showOrdersDropdown` state.
    *   Clicking an order in the dropdown populates the `selectedOrder` state.
    *   Renders an elegant, animated layout preview above the input box:
        ```tsx
        {selectedOrder && (
          <motion.div key="order-preview" ...>
            <span className="text-indigo-700 font-bold text-xs shrink-0">📦 Заказ #{selectedOrder.numericId}</span>
            <span className="text-xs text-foreground/80 line-clamp-1">— {selectedOrder.serviceName} ({selectedOrder.charge} ₽)</span>
          </motion.div>
        )}
        ```

### Transmission & Server Handling
*   **FormData binding**: In `ChatWindow.tsx` (line 346), if `selectedOrder` is set, it appends the ID to the submission payload:
    ```typescript
    if (selectedOrder) formData.set('orderId', selectedOrder.id);
    ```
*   **Omnichannel Action Handler**: In `src/actions/support/ticket.ts` inside `sendLiveChatMessage`:
    ```typescript
    // Lines 59-70: On-the-fly order binding
    if (orderId && !ticket.orderId) {
      const order = await db.order.findFirst({
        where: { id: orderId, userId: session.userId }
      });
      if (order) {
        await db.ticket.update({
          where: { id: ticketId },
          data: { orderId }
        });
      }
    }
    ```

---

## 2. Telegram Profile Merge (R2)

### Client Profile Sidebar Component
*   **File Path**: `src/components/support/ClientProfileSidebar.tsx`
*   **Role**: Handles administrative operator workflows when inspecting a customer's active chat profile in the admin support desk.

### Merging Interface & Interaction Flows
*   **Temporary Profile detection**: If the user's email starts with `'tg_'` (indicating a guest profile auto-created when they messaged the support Telegram bot), a dedicated warning panel renders (lines 90-188).
*   **Action Flow 1 (Magic Link / Level 2)**:
    *   Displays a button labeled `"Отправить ссылку для привязки"`.
    *   On click, runs `requestTelegramBind(fd)` Server Action with `ticketId`.
    *   Injects a formatted system message into the chat containing a secure magic token redirection link to `/api/support/telegram?forceAuth=true` to verify ownership.
*   **Action Flow 2 (Manual Bind / Level 3)**:
    *   Displays an input for target web user email (`email@client.ru`) and button `OK` (id `#manual-bind-submit`).
    *   Submits `adminManualTelegramBind(fd)` Server Action.
    *   If the target exists, the action responds with `{ preview: true, data: { tempUserOrders, targetEmail, targetBalance, targetOrders } }` without executing the merge.
    *   Renders a confirmation box with summary statistics and a green `"Слить"` button (id `#manual-bind-confirm`).
    *   Clicking `#manual-bind-confirm` triggers the same action with `confirm: 'true'`, making the merge permanent in the DB.

### Database Operations & Transactional Integrity
*   **Execution Handler**: `adminManualTelegramBind` inside `src/actions/support/ticket.ts` (lines 356-387):
    *   Enforces RBAC access: only `'ADMIN'` or `'OWNER'` roles are permitted (avoids support operator privilege escalation).
    *   Spins up an atomic transactional block (`db.$transaction`):
        1.  Re-maps all relational foreign keys from `tempUser.id` to `webUser.id` across: `Ticket`, `Order`, `Payment`, `LedgerEntry`, `Invoice`, and `AuditLog`.
        2.  Deletes the `tempUser` record to release the unique `telegramId` constraint.
        3.  Updates the `webUser` profile, assigning the newly merged `telegramId` to them.
        4.  Creates an `AdminAuditLog` tracking the exact operation (`action: 'MANUAL_TELEGRAM_BIND'`).

---

## 3. Balance and Trust Guards (R3)

All administrative financial and marketing adjustments are protected by robust Zod validation schemas.

### Schema Validation Limits & Trimming Rules

| Zod Validator Schema | Target Action / Parameter | Location | Validation Constraints |
| :--- | :--- | :--- | :--- |
| **`updateBalanceSchema`** | Balance adjustment (Cents) | `src/validators/admin.validators.ts:4` | Amount: `[-50000000, 50000000]` (Capped at `±500,000` RUB).<br>Reason: Trimmed, length between `[3, 500]` characters. |
| **`limitSchema`** | Operator Trust Limit (Cents) | `src/actions/admin/team.ts:9` | Limit: `[0, 10000000]` (Capped at `100,000` RUB trust limit). |
| **`discountSchema`** | Personal Discount (%) | `src/actions/admin/clients.ts:24` | Discount: `[0, 50]` (Capped at `50%` max).<br>Validity Date (`endsAt`): Refined to be strictly in the future. |
| **`promoCodeSchema`** | Marketing Promocode | `src/actions/admin/marketing.ts:10` | Code: Max 12 chars, uppercase alphanumeric (`^[A-Z0-9_-]+$`).<br>Discount: Max `90%` if DISCOUNT type.<br>Amount: Max `500,000` cents (`5,000` RUB) if VOUCHER.<br>Max Uses: `[1, 1,000,000]`. Expires: Must be in future. |

### Core Code Enforcement Mechanics
*   **Balance adjustments** are passed through `escrowService.evaluateBalanceAdjustment(userId, amount, reason.trim(), admin)` (in `src/services/admin/escrow.service.ts`).
    *   *System Guard*: If a non-`OWNER`/`ADMIN` operator initiates a positive balance adjustment, it tracks their daily adjustments (reset at MSK 00:00). If the daily accumulated adjustment exceeds their `supportLimitCents` trust limit, the transaction is **diverted to Escrow Quarantine (`status: 'QUARANTINE'`)** awaiting manual Owner approval.
*   **Support Trust Limits** are updated exclusively by `'OWNER'` or `'ADMIN'` roles via `updateSupportLimit(formData)` (in `src/actions/admin/team.ts`).
*   **Compensation and Manual Refills** are handled by `logManualCompensation(formData)` (in `src/actions/support/compensation.ts`).
    *   Deducts the compensation cost from the non-owner operator's `supportLimitCents`. If the remaining limit drops below 0 during processing, it aborts the database transaction.

---

## 4. Existing Tests & Environment Setup

### 1. Playwright E2E Tests

Located in the `/e2e` directory, they run in full-browser environments and use real/mock seed databases.

*   **`e2e/tickets.spec.ts`**:
    *   *Test 1*: "Optimistic UI: Admin replies to a ticket"
        *   Seeds user `e2e_ticket_user@test.local` and an `OPEN` ticket.
        *   Navigates to `/admin/tickets/${id}`.
        *   Types a reply, clicks Send, and asserts that the message is immediately visible before database confirmation completes (Optimistic rendering).
        *   Asserts that the ticket status in the database flips to `PENDING`.
    *   *Test 2*: "Level 1: Generate Smart Bind token for authenticated user"
        *   Calls GET `/api/support/telegram`.
        *   Expects a redirect (`307`) to Telegram (`t.me/` bot URL) carrying a unique `?start=tg_bind_<token>` token.
        *   Verifies an unused `authToken` record was generated.
    *   *Test 3*: "Level 2 & 3: Admin UI Request Auth & Manual Bind"
        *   Seeds temporary Telegram user `tg_99999@smmplan.bot` with an active ticket, and seeds a target web account.
        *   Asserts "Временный профиль" warning shows in sidebar.
        *   Level 2: Clicks `"Отправить ссылку для привязки"`, expects chat magic link system message.
        *   Level 3: Inputs the target email, submits, verifies the confirmation stats display, clicks `"Слить"` (`#manual-bind-confirm`), and checks that the temp account is successfully deleted and relations are merged.
*   **`e2e/admin-panel.spec.ts`**:
    *   Asserts access to dashboard and user list (`/admin/clients` table).
    *   Asserts admin chat reply delivery.
    *   Asserts price spike quarantine handling (approving/rejecting quarantined provider services).
    *   Asserts financial table view.
    *   Asserts user balance adjustments.
    *   Asserts setting updates (global USD conversion exchange rate).

### Playwright E2E Auth Setup & Cleanup
*   **Authentication (E2E Pre-setup)**: Located in `e2e/auth.setup.ts`.
    *   It seeds/upserts a user `e2e-tester@test.com` with role `OWNER` and 200,000 RUB balance.
    *   Creates a session, signs a JWT session token, sets it as the `session_token` browser cookie, and saves it to `e2e/playwright/.auth/user.json`.
    *   All sub-tests run automatically in authenticated states using this configuration.
*   **Cleanup Teardown**: Located in `e2e/utils/db-cleaner.ts`.
    *   Runs after all test suites finish.
    *   Cleans up the database by deleting users, orders, tickets, ledger entries, and payments that match test identifiers (`contains: 'test'` or `contains: 'e2e'`).

### 2. Vitest Unit & Integration Tests

*   **Execution Commands**:
    *   *Run tests*: `npm run test` (executes `dotenv -e .env.test -- vitest run`).
    *   *Watch mode*: `npm run test:watch` (executes `dotenv -e .env.test -- vitest`).
    *   *Database Sync (CRITICAL)*: Before running unit/integration tests that call Prisma, the test database must be synchronized using `npm run test:db` (which executes `dotenv -e .env.test -- prisma db push --accept-data-loss`).
