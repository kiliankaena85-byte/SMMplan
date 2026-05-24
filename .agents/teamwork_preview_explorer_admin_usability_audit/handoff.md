# Handoff Report — Smmplan Admin Usability & Logical Flow Audit

## 1. Observation
We observed the following exact code paths, files, and lines:
- **Support Tickets Architecture:**
  - Route `/admin/tickets` uses `src/app/admin/tickets/page.tsx` as page, and `src/app/admin/tickets/components/ticket-client.tsx` and `src/app/admin/tickets/components/columns.tsx` for table/list rendering.
  - Route `/admin/tickets/[id]` uses `src/app/admin/tickets/[id]/page.tsx` as page, `src/components/support/ChatWindow.tsx` for the main chat UI, and `src/components/support/ClientProfileSidebar.tsx` for the user panel.
  - `TemplateManagerModal` is implemented in `src/components/support/TemplateManagerModal.tsx`.
  - `ManualRefillModal` is in `src/components/support/ManualRefillModal.tsx`.
  - Manual compensation limit check is implemented in `src/actions/support/compensation.ts` (lines 35-40):
    ```typescript
    if (amountCents > staffUser.supportLimitCents) {
      throw new Error("Превышен лимит компенсации для вашего аккаунта");
    }
    ```
    Visibility injection is done by inserting a `SYSTEM` ticket message in the conversation thread.

- **Transition Logic Bugs:**
  - "Смотреть все заказы →" link in `src/components/support/ClientProfileSidebar.tsx` (line 250):
    ```tsx
    <Link href={`/admin/orders?userId=${user.id}`} ...>
    ```
  - `/admin/orders/page.tsx` parses ONLY `q`, `status`, and `cursor` (lines 25-29 and 42-45):
    ```typescript
    type Props = {
      searchParams: Promise<{
        q?: string;
        status?: string;
        cursor?: string;
      }>;
    };
    ```
  - `adminOrderService.searchOrders()` in `src/services/admin/order.service.ts` (lines 19-24 and 34-36) does not accept `userId` and its `where` clause (lines 38-62) completely ignores user filtering.
  - "Перейти к заказу" button in `src/components/support/ChatWindow.tsx` (line 594) transitions to `/admin/orders?edit_order_id=${orderId}`.
  - `src/app/admin/orders/components/order-client.tsx` (lines 448-452) sets the selected order by looking it up in the current page's dataset (`data` prop):
    ```typescript
    const editOrderId = searchParams.get('edit_order_id');
    const selectedOrder = React.useMemo(
      () => data.find(o => o.id === editOrderId) ?? null,
      [data, editOrderId]
    );
    ```
    This `data` prop ONLY contains the first 50 results (the first paginated page) queried by `searchOrders` on `AdminOrdersPage`.

- **Catalog Search and Filtering Engine:**
  - Page `src/app/admin/catalog/page.tsx` and table `src/components/admin/catalog-table-v2.tsx`.
  - `AdminCatalogService.listServices` in `src/services/admin/catalog.service.ts` (lines 57-90) only handles category and search queries (name-based or numeric ID strict match):
    ```typescript
    if (params.search?.trim()) {
      const q = params.search.trim();
      const numId = parseInt(q, 10);

      if (!isNaN(numId) && q === String(numId)) {
        where.numericId = numId;
      } else {
        where.name = { contains: q, mode: 'insensitive' };
      }
    }
    ```
  - No database search condition or UI controls exist for filtering by Network/Social Platform or SMM Provider in either the page or the service layer.
  - Search by `externalId` is completely missing from `listServices`.

---

## 2. Logic Chain
- **userId Ignored Logic Chain:**
  1. Observation: `ClientProfileSidebar.tsx` appends `userId` to the `/admin/orders` query string.
  2. Observation: `/admin/orders/page.tsx` does not parse `userId` from `searchParams`.
  3. Observation: `adminOrderService.searchOrders()` does not accept or process a `userId` filter parameter.
  4. Conclusion: Any `userId` filter passed to the orders URL is silently ignored, and all platform orders are shown instead.

- **OrderDrawer Failing on Page 2+ Logic Chain:**
  1. Observation: `ChatWindow.tsx` appends `edit_order_id` to the `/admin/orders` query string.
  2. Observation: `OrderClient` determines `selectedOrder` by checking if the ID exists inside the `data` prop array.
  3. Observation: The `data` prop holds only the 50 orders fetched for the current page (defaults to page 1).
  4. Conclusion: If the target `edit_order_id` belongs to an older order not present in page 1's 50 items, `selectedOrder` returns `null` and `OrderDrawer` fails to open.

- **Catalog Filtering Gaps Logic Chain:**
  1. Observation: `listServices()` queries services and filters only on `categoryId` and name/numericId search query.
  2. Observation: SMM providers (`providerId`) and social platforms (`Network` relations) are stored in the database but have no matching `where` clause inside the service method.
  3. Conclusion: Admins cannot search by provider external API ID, nor can they filter catalog items by specific SMM providers or social networks in the admin UI.

---

## 3. Caveats
- Standard database relationships were analyzed via typescript typings and prisma includes, but we assume the underlying schema matches standard Smmplan definitions.
- No other search pages or sub-panels were audited beyond tickets, orders, catalog, and categories.

---

## 4. Conclusion
- Support ticket components and manual compensation limits/transactions are securely and safely modeled.
- Order navigation contains two critical logical bugs: ignored `userId` queries and list-pagination-bound `edit_order_id` Drawer rendering.
- Catalog search operates as a simple search query that lacks vital support for provider/network filters and `externalId` queries.

---

## 5. Verification Method
- **To Verify userId Parameter Bug:** Inspect `src/app/admin/orders/page.tsx` at line 25 and `src/services/admin/order.service.ts` at line 19 to confirm that `userId` is omitted from search parameters.
- **To Verify OrderDrawer Bug:** View `src/app/admin/orders/components/order-client.tsx` at lines 448-452 to see that the `selectedOrder` lookup is strictly bounded by the `data` prop.
- **To Verify Catalog Gaps:** Read `src/services/admin/catalog.service.ts` at lines 57-90 to verify the lack of filters for networks, providers, or external IDs.
