## 2026-05-24T03:42:14Z
You are the implementation agent 'teamwork_preview_worker'.
Your working directory is: d:\SMM_plan_2\.agents\worker_catalog_ops_frontend
Your task is to implement the frontend user interfaces for Milestones 3 & 4 of the Smmplan Catalog Ops & CRUD project in the admin panel.

### Background Info & Existing Backend:
1. Milestone 2 completed the backend actions in:
   - `src/actions/admin/catalog/batch.ts`: `batchReassignServicesCategoryAction(serviceIds, targetCategoryId)`
   - `src/actions/admin/catalog/categories.ts`: `mergeCategoriesAction(sourceCategoryId, targetCategoryId)`, Network CRUD (`createNetworkAction`, `updateNetworkAction`, `deleteNetworkAction`)
   - `src/actions/admin/catalog/services.ts`: manual Service CRUD (`createServiceAction(rawData)`, `updateServiceAction(id, rawData)`)
2. Useful UI components exist:
   - `@/components/ui/dialog`: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger`
   - `@/components/ui/select`: `@base-ui/react/select`-based `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
   - `src/components/admin/hero-ui`: exposure of Radix/Shadcn table wrappers for dot-notation (e.g. `Table.Header`, `Table.Column` etc.)

### Required Frontend Tasks:

1. **In `src/app/admin/catalog/page.tsx`**:
   - Fetch the list of providers using `adminProviderService.listProviders()` from `@/services/admin/provider.service`.
   - Pass both `categories` and `providers` down as props to `<CatalogTable />`.

2. **In `src/components/admin/catalog-table-v2.tsx`**:
   - Update `CatalogTable` component to accept `categories` and `providers` as props.
   - **Create Service Button**: Add a button "Создать услугу" at the top header/action area next to the quarantine button/table settings that triggers a `CreateServiceModal` dialog.
   - **Edit Service Pencil**: Add a pencil icon button next to the `ArchiveButton` at the end of each service row that triggers an `EditServiceModal` dialog pre-filled with the service's current parameters.
   - **Service CRUD Modals (Create & Edit)**:
     - Design highly-usable forms supporting all attributes:
       - `name` (text input)
       - `description` (textarea)
       - `categoryId` (Select category - list of categories)
       - `providerId` (Select provider - list of active/all providers, or empty)
       - `rate` (number input, rate in USD)
       - `markup` (number input, default 3.0)
       - `minQty` (number input, default 10)
       - `maxQty` (number input, default 100000)
       - `externalId` (text input, optional provider mapping ID)
       - `targetType` (Select link type: CHANNEL, POST, STORY, CUSTOM, or empty for category-based inference)
       - `customDataType` (Select custom type: NONE, TEXTAREA, NUMBER)
       - `isMediaGroupAware` (checkbox)
       - `isDripFeedEnabled` (checkbox, default checked)
       - `isRefillEnabled` (checkbox, default unchecked)
       - `isCancelEnabled` (checkbox, default unchecked)
       - `isActive` (checkbox, default checked)
     - Use `useTransition` for submission. Call `createServiceAction` / `updateServiceAction` from `@/actions/admin/catalog/services`.
     - Show appropriate sonner success/error toasts. Upon success, refresh the page (`router.refresh()`).
   - **Batch Category Reassignment**:
     - Inside `BatchActionBar` when one or more rows are selected, add a "Перенести в категорию" button.
     - When clicked, open a searchable/dropdown dialog modal displaying all categories (optionally grouped by network or alphabetically sorted).
     - Select a category, and upon confirmation, call `batchReassignServicesCategoryAction(selectedIds, targetCategoryId)` inside a transition.
     - Clear the selected state, show a success sonner toast, and call `router.refresh()`.

3. **In `src/app/admin/catalog/categories/components/category-manager.tsx`**:
   - **Category Merge Utility**:
     - Add a dedicated section or card for "Объединение Категорий" (Category Merge).
     - Let the admin select a "Source Category" (from/source) and "Target Category" (to/target) from two dropdowns.
     - Add an "Объединить категории" button. When clicked, display a confirmation warning ("Это перенесет все услуги из категории А в категорию Б и удалит категорию А. Продолжить?").
     - On confirmation, call `mergeCategoriesAction(sourceCategoryId, targetCategoryId)` inside a transition. Show sonner success/error toasts, and call `router.refresh()`.
   - **Network CRUD**:
     - Add a card or tab for "Управление Социальными Сетями" (Networks).
     - Display a table or list of existing networks (name, slug, sort, actions) and a sidebar form to create or edit networks.
     - Create Form: input for `name`, `slug` (strict validation pattern `/^[a-z0-9-_]+$/`), and `sort` (number).
     - On submitting, call `createNetworkAction(rawData)` inside a transition.
     - Table rows should have an "Изменить" button (sets the form to edit mode with the network's data, calling `updateNetworkAction(id, rawData)`) and "Удалить" button (calls `deleteNetworkAction(id)`).
     - Show sonner toasts on success or failure, and refresh.

### Rules & Protocol from AGENTS.md:
- **Base UI Select children-function pattern is MANDATORY** for trigger rendering when values are CUIDs:
  `<SelectValue placeholder="-- Выберите --">{(value: string) => items.find(item => item.id === value)?.name ?? value}</SelectValue>`
- **No inline colors**: NEVER use `text-white`, `bg-black`, `text-blue-500`. Always use Tailwind 4 semantic tokens from `globals.css` (e.g. `text-foreground`, `bg-background`, `bg-card`, `text-primary`, `text-muted-foreground`, `border-border`).
- **Use Russian language** for all user-facing interface labels, placeholders, titles, success/error toasts, and form validation error messages in the Smmplan admin panel.
- Ensure all interactive elements have `transition-all duration-200`.

### MANDATORY INTEGRITY WARNING (DO NOT REMOVE):
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Verification Criteria:
1. Make sure your changes compile with no errors using `npx tsc --noEmit`.
2. Check your files using ESLint: `npx eslint src/app/admin/catalog/page.tsx src/components/admin/catalog-table-v2.tsx src/app/admin/catalog/categories/components/category-manager.tsx`.
3. Verify that the UI designs and features operate correctly.

Write all implementation changes, designs, and verification results in `d:\SMM_plan_2\.agents\worker_catalog_ops_frontend\changes.md`. When done, write a handoff report in `d:\SMM_plan_2\.agents\worker_catalog_ops_frontend\handoff.md` and send a message back to me (conversation ID: c818c0de-874d-4af4-a050-0f80122c47b3) with a summary.
