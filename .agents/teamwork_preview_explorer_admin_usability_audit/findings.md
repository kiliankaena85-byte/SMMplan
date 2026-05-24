# Usability and Logical Flow Audit — Smmplan Admin Panel

## Executive Summary
This report documents a thorough usability and logical flow audit of the Smmplan admin panel codebase (Next.js 16, React 19, Tailwind CSS 4, HeroUI v3, and Prisma 5). 

We have mapped the structural layout of support tickets, analyzed the root causes of major navigation and parameter-passing bugs, and audited the catalog search and category/network management systems to identify structural design constraints and missing core filters.

---

## 1. Support Ticket Components & Compensation Flow

### Route and Component Mapping
- **Ticket List Page:** `/admin/tickets` (defined in `src/app/admin/tickets/page.tsx`).
  - Utilizes the client-side wrapper `TicketClient` (`src/app/admin/tickets/components/ticket-client.tsx`) to manage pagination and status filters.
  - Leverages table definitions in `src/app/admin/tickets/components/columns.tsx` for row structure and dropdown action menus.
- **Ticket Details / Conversation Chat Page:** `/admin/tickets/[id]` (defined in `src/app/admin/tickets/[id]/page.tsx`).
  - Houses two primary UI sub-components:
    - **`ChatWindow`** (`src/components/support/ChatWindow.tsx`): Renders the message thread, handles message sending, and hosts support action triggers like manual compensation and transitions to related orders.
    - **`ClientProfileSidebar`** (`src/components/support/ClientProfileSidebar.tsx`): Displays client statistics, current balance, and quick transaction links.
- **Template Manager Modal:** `TemplateManagerModal` (`src/components/support/TemplateManagerModal.tsx`) provides an interface for support staff to manage prepared templates (stored in the `SupportTemplate` model) for quick canned replies in chat.

### Manual Compensation and Limit Enforcement
- **Modal Component:** `ManualRefillModal` (`src/components/support/ManualRefillModal.tsx`) prompts the support agent for a compensation amount in rubles, which is subsequently converted into cents.
- **Backend Service/Action:** `logManualCompensation` (`src/actions/support/compensation.ts`).
- **Authorization, Limit Checking, and Transaction Safety:**
  1. **Role Check:** The action validates the executing user's session and verifies their staff role permissions (`permissions` check matching `SUPPORT` section editing rights).
  2. **Limit Checking (`supportLimitCents`):**
     - Non-`OWNER` staff users (e.g., standard support roles) have a daily or overall compensation limit tracked via the `supportLimitCents` field.
     - The action fetches the executing staff user's record and compares the requested transaction amount:
       ```typescript
       if (amountCents > staffUser.supportLimitCents) {
         throw new Error("Превышен лимит компенсации для вашего аккаунта");
       }
       ```
  3. **Atomic Transaction Logic:**
     - Enforces Prisma transaction block wrapping with explicit isolation levels (e.g., `Serializable` or `@transaction` concurrency guard).
     - Decrements the staff user's `supportLimitCents` by the compensation amount.
     - Credits the customer's wallet balance using the `WalletOps.credit` helper.
     - Appends a financial `LedgerEntry` indicating the compensator, receiver, and reason.
  4. **Visibility & Chat Message Injection:**
     - Inserts a system-level message (of type `SYSTEM` or indicating staff action) directly into the ticket chat's message thread. This informs both the client and auditing admins exactly when and by whom compensation was credited, ensuring full operational transparency.

---

## 2. Transition Logic Bugs & Core Root Causes

### Bug A: The "/admin/orders page ignores the userId query parameter"
- **Location of Trigger:** In `ClientProfileSidebar.tsx` (line 250), the "Смотреть все заказы →" link is constructed as follows:
  ```tsx
  <Link href={`/admin/orders?userId=${user.id}`}>Смотреть все заказы →</Link>
  ```
- **Analysis of Page Parsing:**
  In `src/app/admin/orders/page.tsx`, the search parameters are typed and parsed on lines 24-29 and 42-45:
  ```typescript
  type Props = {
    searchParams: Promise<{
      q?: string;
      status?: string;
      cursor?: string;
    }>;
  };
  
  // ... inside AdminOrdersPage ...
  const params = await searchParams;
  const query = params.q || '';
  const statusFilter = params.status || 'ALL';
  const cursor = params.cursor || undefined;
  ```
  **Root Cause:**
  1. The page completely neglects to declare or extract `userId` from the URL query string (`searchParams`).
  2. The database search method `adminOrderService.searchOrders()` called on line 47 does not accept a `userId` property or bind it to the Prisma query's `where` clause:
     ```typescript
     const { items: orders, nextCursor, hasMore } = await adminOrderService.searchOrders({
       query: query || undefined,
       status: statusFilter,
       cursor,
       pageSize: 50,
     });
     ```
  **Impact:** Clicking "Смотреть все заказы" for a specific user dumps the admin onto the global orders list showing orders for all users instead of filtering by the requested client.

### Bug B: The "OrderDrawer only opens if the order is on the first page of 50 items"
- **Location of Trigger:** In `ChatWindow.tsx` (line 594), a button to jump to a specific order is set to:
  ```tsx
  href={`/admin/orders?edit_order_id=${orderId}`}
  ```
- **Analysis of Client Component (`src/app/admin/orders/components/order-client.tsx`):**
  In `order-client.tsx` (lines 448-452), the client component retrieves the query parameter and searches the local list of orders:
  ```typescript
  const editOrderId = searchParams.get('edit_order_id');
  const selectedOrder = React.useMemo(
    () => data.find(o => o.id === editOrderId) ?? null,
    [data, editOrderId]
  );
  ```
  **Root Cause:**
  1. The `data` array passed to `OrderClient` represents the *active page* of orders (limited to the 50 results fetched by `adminOrderService.searchOrders` for the current pagination state).
  2. If the user transitions from a support ticket referring to an order that is older or currently not included in the first page of 50 items (or the page currently active), `data.find()` yields `undefined`.
  3. Consequently, `selectedOrder` becomes `null`, and `<OrderDrawer order={selectedOrder} ... />` refuses to render or slide open.
  
  **Impact:** Admins clicking "Перейти к заказу" on any older ticket order are navigated to the orders table, but no drawer is shown, forcing them to manually search the order ID or click through pages to find it.

---

## 3. Catalog Search & Management Architecture

### Main Catalog Page Route
- **File:** `src/app/admin/catalog/page.tsx`
- **Catalog Table Component:** `src/components/admin/catalog-table-v2.tsx`
- **Catalog Backend Service:** `src/services/admin/catalog.service.ts`

### Search Engine Capabilities & Limits
The main query controller is defined in `AdminCatalogService.listServices`:
```typescript
  async listServices(params: {
    cursor?: string;
    search?: string;
    categoryId?: string;
    pageSize?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      const numId = parseInt(q, 10);

      if (!isNaN(numId) && q === String(numId)) {
        where.numericId = numId;
      } else {
        where.name = { contains: q, mode: 'insensitive' };
      }
    }
    // ... pagination query ...
  }
```
#### Structural Search Limits:
- **By Name:** Searches case-insensitively using `{ contains: q, mode: 'insensitive' }`.
- **By ID:** If the search parameter parses entirely as a number, it performs a strict matching query against `numericId`.
- **Missing `externalId` Support:** Crucially, there is no search clause targeting the SMM provider's external service identifier (`externalId`). Admins cannot search for services using their raw provider API ID.

#### Missing Layout Filters:
1. **Filter by Network / Social Media Platform:** Categories are assigned to social networks (e.g., Telegram, VK, YouTube) in the database via the `Network` relationship. However, the catalog sidebar only lists categories, lacking a high-level network filter (e.g., "Show only Telegram categories").
2. **Filter by SMM Provider:** The catalog page retrieves a list of all providers via `adminProviderService.listProviders()`, but the interface has no select dropdown or filter to narrow the services table by SMM provider (e.g., "Show only services sourced from provider X").

---

## 4. Category & Network Management (`/admin/catalog/categories`)

### Layout and Functionality
- **File:** `src/app/admin/catalog/categories/page.tsx` and `src/app/admin/catalog/categories/components/category-manager.tsx`.
- **Key Features:**
  - **Category Merge UI:** Includes `CategoryMergeCard` which moves all associated services from a source category to a target category and deletes the source category atomically using `mergeCategoriesAction`.
  - **Network Manager UI:** Allows standard CRUD operations for `Network` records (social networks) including `slug` mapping and custom `sort` orders.
  - **Category Table:** Renders Category names, their parent network slugs, sort indices, and the count of services in each category (`_count.services`).

### Design Gaps:
- The categories page lacks a live search or filter to find a category quickly in the list. While there is a search filter in the **Category Reassign Modal** and the **Category Merge UI**, the primary categories table does not support sorting or searching by name, making manual scrolling necessary when there are dozens of categories.

---

## 5. Architectural Recommendations

To address the usability and logical flaws identified above, we recommend the following non-breaking changes for the implementer:

1. **Fix `userId` Parameter in Orders List:**
   - Add optional `userId` string to `Props["searchParams"]` in `/admin/orders/page.tsx`.
   - Update `OrderSearchParams` in `order.service.ts` to include `userId?: string`.
   - In `searchOrders()`, if `userId` is present, append `where.userId = userId` to the database query.
2. **Fix `edit_order_id` OrderDrawer Rendering:**
   - In `AdminOrdersPage` (`/admin/orders/page.tsx`), extract `edit_order_id` from searchParams.
   - If present, query that specific order from the database. Pass it to the `OrderClient` as a separate prop: `initialSelectedOrder`.
   - In `OrderClient`, initialize `selectedOrder` state to either the prop or fallback to finding it in the array, ensuring it opens immediately regardless of pagination.
3. **Enhance Catalog Filtering & `externalId` Search:**
   - Update `listServices()` in `catalog.service.ts` to accept optional `providerId?: string` and `networkSlug?: string`.
   - If search string matches an external provider ID format, allow fallback OR searches on `externalId`.
   - Expose SMM Provider and Network filters in the `AdminCatalogPage` header to allow easy bulk adjustments.
