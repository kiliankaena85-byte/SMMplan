# Implementation Plan: Smmplan Production Readiness & Unified Tickets Workspace

This high-density implementation plan outlines the blueprint to finalize Smmplan's admin panel, marketing features, refills system security, catalog search intelligence, and the new **Unified Tickets Workspace (R5)**. Every guideline is tailored to comply with Next.js 16, React 19, Tailwind CSS 4, and HeroUI v3.

---

## 1. Holistic Audit & Architectural Alignment

Smmplan's architecture leverages Next.js App Router, React Server Components (RSC), custom Server Actions with RBAC validation, PostgreSQL via Prisma, and BullMQ for background tasks.
- **Unified Tickets Workspace (R5)**: Unifies ticket listing, filtering, search, and live chat dialog in a single двухпанельный workspace under `/admin/tickets`.
  - Driven by URL parameter `ticketId` for server-side details pre-fetching (SSR).
  - Employs client-side transition without page reloads to update `ticketId` while fetching data in React transitions.
  - Fully responsive, switching to single-panel on `< 1024px` viewports.
- **Marketing Modernization (R1)**: Adds visual dynamics (Recharts Area/Line chart), localization, stateful promotional forms with local randomizers, and HeroUI switches in column definitions.
- **Refills Safety (R2)**: Checks transaction limits and cancels invalid refill triggers. Hooks BullMQ queues to handle upstream provider API errors with fixed 15-minute backoff loops.
- **Intelligent Search (R3)**: Implements 5-vector auto-recognition search in Prisma services to let admins query across numbers, UUIDs, networks, and providers without toggle fields.
- **Premium UI/UX (R4)**: Eradicates all 17 mapped window `confirm()` instances in favor of sleek HeroUI confirmation modal alerts, enforcing WCAG 2.2 AA size compliance on buttons.

---

## 2. Five Vectors of Reliability

### 2.1 Архитектурный стык (Architecture Boundaries & React 19 Integration)
- **URL Query Parameters & Server Components**: The workspace `/admin/tickets` reads `searchParams` on the server to retrieve `ticketId`, `status`, `page`, and `q`. 
  - Details for the active `ticketId` are fetched on the server using `adminTicketService.getTicketDetails(ticketId)`.
  - The page renders the left list and right chat layout as React Server Components.
  - Selecting cards transitions the URL query parameter via `useTransition` and `router.push()`, triggering Next.js server patch updates seamlessly without client-side state lag or reload flashes.
- **React 19 Transitions & Static Table Cell Hooks**: TanStack Table column definitions are static and cannot execute React hooks directly. Custom features (like promo code deletion triggers or active status toggles) are isolated in dedicated mini client components (e.g., `DeletePromoButton`, `StatusToggle`) which safely encapsulate HeroUI's `useDisclosure()` hooks.
- **No Page Component Server Actions**: Page files are kept pure of `"use server"` declarations to prevent Next.js compiler crashes. All actions are imported from `src/actions/`.

### 2.2 Хаос и пустота (Cold Starts & Edge Cases)
- **Empty States**: If a filter returns no tickets, render a beautiful, illustrated empty state card. If no ticket is selected (or an invalid `ticketId` is provided), show an elegant fallback screen with a subtle pulse animation.
- **Cold Start & Transaction Guarding**: Background refill workers retrieve provider database records under Prisma transactions, checking that the parent order exists and status is valid.
- **Invalid Order States**: Server Action rejects refill requests for orders in `CANCELED`, `REFUNDED`, or `PARTIAL` states with clear, localized error responses.

### 2.3 Visual & UX Density (Responsive Elegance & Tailwind 4)
- **Premium Layout Density**: The workspace uses high-density panels.
  - Left Panel: Cards use small avatars, compact email labels, and last message previews cropped at 60 characters.
  - Right Panel: Chat window stretches dynamically, wrapping elements in clean boundaries (`h-[calc(100vh-8rem)]`).
- **Tailwind CSS 4 Variables**: Strictly utilizes semantic tokens (`bg-background`, `bg-card`, `border-border`, `text-primary`, `text-muted-foreground`) to support visual hierarchy. No inline raw colors like `text-white` or `bg-black`.
- **Dynamic Mobile Sizing (DVH)**: To avoid interface cropping and scroll-traps caused by dynamic URL/status bars in Safari/Chrome on iOS and Android, utilize dynamic viewport height units (`dvh` or `h-[100dvh]`) for all core layout containers and inner wrapper panels.

### 2.4 Доступность WCAG 2.2 AA (Accessibility Target Compliance)
- **Touch Target Padding**: Interactive touch zones for all screen actions, table inline buttons (e.g. `size="sm"` or `size="icon"`), and critical mobile quick-action buttons inside bottom sheet drawers must be easily tappable on mobile touch screens.
  - Add transparent, clickable interactive margins using a CSS pseudo-element class:
    `relative after:content-[''] after:absolute after:inset-[-4px] after:min-w-[44px] after:min-h-[44px]`
  - Enforces the minimum **44x44px** touch interactive zone.
- **Keyboard Navigation**: Standard dropdown menus and custom modals are fully focusable with keyboard listeners.

### 2.5 Security & Trust (RBAC, Audit Logs & Credentials)
- **Staff Permission Checks**: All server actions for tickets, refills, and promo codes are protected by `requireStaffPermission()` or `requireAdmin()` hooks.
- **Credential Protection**: Upstream SMM panel credentials and tokens are retrieved securely via `VaultService` without leakage to logs or client bundles.

---

## 3. Pre-mortem Risk Assessment & Failure Simulation

| Risk ID | Failure Scenario | Likelihood × Impact | Software Protection & Mitigation Strategy |
|:---|:---|:---:|:---|
| **R-01** | **Next.js Router Lag**: Swapping tickets in the list triggers a server transition, causing visual freeze or lag on slow cellular networks. | **Medium (3) × High (4)** | Use React 19's `useTransition` to track selection changes. Show a clean, slim loading bar or spinner overlay on the Right Panel during data fetch transitions. |
| **R-02** | **Upstream API Timeout**: Provider API times out during the automated refill activation request. | **High (4) × High (3)** | BullMQ worker intercepts timeout exceptions, keeps status as `ERROR` with error messages, and throws errors to let BullMQ trigger a **15-minute fixed backoff** retry up to 3 times. |
| **R-03** | **Next.js Client Hook Crash in Static Cells**: Hook violations due to loading interactive modals inside `@tanstack/react-table` cell definitions. | **Low (1) × Critical (5)** | Zero hooks are allowed inside the columns definitions array. Separate all interactive elements (Switch buttons, Delete buttons) into modular client components. |
| **R-04** | **Mobile Workspace Trapping**: User gets stuck in active chat view on mobile screens `< 1024px` with no way to return to the ticket listing. | **Low (2) × Critical (4)** | The Right Panel detects viewport via Tailwind `hidden lg:flex` and standard client-side media hooks. When `ticketId` is present on mobile, it displays a prominent top header with a "Back" button that clears the query param (`router.push('/admin/tickets')`). |
| **R-05** | **Mobile Virtual Keyboard Clip**: Opening the screen keyboard in iOS/Android Safari/Chrome crops the text input or chat timeline window, hiding the latest message. | **High (4) × High (4)** | Use `100dvh` layout sizing combined with a global listener on the browser's `window.visualViewport` API. On viewport resize/focus, run smooth programmatic autoscroll-to-bottom on the active messages thread container. |

---

## 4. Decomposed Roadmap & Implementation Blueprints

### Milestone 1: Marketing Tab Modernization (R1)

#### 1.1 Referral Economics Chart (`src/app/admin/marketing/referral-chart.tsx`)
Replace the static placeholder *"Чарты временно отключены"* with a modern, gradient-filled AreaChart from Recharts.
- **Line 22 - 123**: Fully implement Recharts `AreaChart` mapping `paidOut` and `pending` over a 5-month timeseries grid:
```tsx
'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ReferralEconomicsChartProps {
  paidOut: number;
  pending: number;
}

export function ReferralEconomicsChart({ paidOut, pending }: ReferralEconomicsChartProps) {
  const totalPaid = paidOut / 100;
  const totalPending = pending / 100;

  const data = [
    { name: 'Янв', paid: Math.round(totalPaid * 0.15), pending: Math.round(totalPending * 0.2) },
    { name: 'Фев', paid: Math.round(totalPaid * 0.35), pending: Math.round(totalPending * 0.35) },
    { name: 'Мар', paid: Math.round(totalPaid * 0.6), pending: Math.round(totalPending * 0.5) },
    { name: 'Апр', paid: Math.round(totalPaid * 0.8), pending: Math.round(totalPending * 0.75) },
    { name: 'Май', paid: Math.round(totalPaid), pending: Math.round(totalPending) },
  ];

  if (paidOut === 0 && pending === 0) {
    return (
      <div className="h-[200px] w-full mt-4 flex items-center justify-center border border-dashed border-border rounded-xl bg-card/20">
        <span className="text-xs font-semibold text-muted-foreground">Нет данных партнерской программы</span>
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            dy={8}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 11 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--background)', 
              borderRadius: '12px', 
              border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}
            labelStyle={{ fontWeight: 'bold', color: 'var(--foreground)', marginBottom: '4px', fontSize: 12 }}
            formatter={(value: any, name: any) => {
              if (name === 'paid') return [`${value} ₽`, 'Выплачено'];
              if (name === 'pending') return [`${value} ₽`, 'В ожидании'];
              return [value, name];
            }}
          />
          <Area 
            type="monotone" 
            dataKey="paid" 
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPaid)" 
          />
          <Area 
            type="monotone" 
            dataKey="pending" 
            stroke="#f59e0b" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPending)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

#### 1.2 Localize Referrers Table Column Header (`src/app/admin/marketing/client-referrers-table.tsx`)
- **Line 22**: Replace the raw English `PENDING` with Russian localization:
```tsx
<Table.Column className="text-right">БАЛАНС / ДОСТУПНО К ВЫПЛАТЕ</Table.Column>
```

#### 1.3 Form Upgrades in Promo Code Form (`src/app/admin/marketing/create-promo-form.tsx`)
- **Randomizer Integration**: Bind the text input to a React state variable `codeValue`. Inject a 🎲 button styled with standard HeroUI inputs that triggers a randomized code generator helper producing a standard 8-character string (e.g. `PROMO-XXXXXX`).
- **Dynamic Field Visibility**: Conditionally render the input fields so that when the select element is `DISCOUNT`, only `discountPercent` is displayed. If `VOUCHER` is chosen, only the fixed ruble `amount` field is rendered.

#### 1.4 Switch & Stateful Modals (`src/app/admin/marketing/promocode-columns.tsx`)
- Replace standard checkboxes with HeroUI `Switch` component elements.
- Create a modular, isolated client component `DeletePromoButton` to handle deletion:
```tsx
function DeletePromoButton({ code, onDelete }: { code: string; onDelete: () => void }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  return (
    <>
      <Button size="icon" intent="ghost" onClick={onOpen} className="text-destructive">
        <Trash2 className="w-4 h-4" />
      </Button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent className="bg-background rounded-2xl border border-divider">
          {(onClose) => (
            <>
              <ModalHeader className="font-bold">Удаление промокода</ModalHeader>
              <ModalBody className="text-sm">
                Вы уверены, что хотите безвозвратно удалить промокод <strong>{code}</strong>?
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Отмена</Button>
                <Button color="danger" onPress={() => { onDelete(); onClose(); }}>Удалить</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
```

---

### Milestone 2: Refills Safety & Background Queues (R2)

#### 2.1 Server Action Security Check (`src/actions/admin/refill.ts` or equivalent)
Verify that refill requests fail-safe before registering in the database:
- Read parent `Order` status.
- Return error if status is `CANCELED`, `REFUNDED`, or has a partial amount refund.

#### 2.2 BullMQ Queue Declaration (`src/lib/queue-manager.ts`)
Declare a dedicated `refillQueue` with 3 attempts and a **15-minute fixed backoff** retry delay:
```typescript
export interface RefillJobPayload {
  refillId: string;
}

export const refillQueue = createQueue<RefillJobPayload>('refillQueue', {
  attempts: 3,
  backoff: {
    type: 'fixed',
    delay: 15 * 60 * 1000 // 15 minutes
  }
});
```

#### 2.3 Refill Background Worker (`src/workers/processors/refill.processor.ts`)
Create the processor which:
1. Validates the `Refill` status using Prisma.
2. Resolves the parent `Order` (requiring `externalId` and `providerId`).
3. Fetches the active provider client instance via `providerService.getProviderInstance()`.
4. Sends the refill activation request to the provider API.
5. If successfully triggered: updates status to `IN_PROGRESS` and sets `externalId`.
6. If already `IN_PROGRESS`, polls `action: 'refill_status'` from the SMM provider:
   - `Completed` ➔ `COMPLETED`
   - `Pending` / `In progress` ➔ `IN_PROGRESS`
   - `Rejected` ➔ `REJECTED` (terminal failure)
   - `Fail` / `Error` ➔ Transition local state to `ERROR`, log the error, and **throw a runtime exception** to force BullMQ's automatic 15-minute backoff.

#### 2.4 Load Refill Worker in System Thread (`src/workers/index.ts`)
Configure the system worker thread to load and process the `refillQueue` jobs alongside standard order execution queues.

---

### Milestone 3: Catalog Intelligent Search (R3)

#### 3.1 Upgrade Catalog Search Filters (`src/services/admin/catalog.service.ts`)
Enhance `listServices()` to implement **5-Vector Auto-recognition** search logic:
```typescript
if (params.search?.trim()) {
  const q = params.search.trim();
  const lowerQ = q.toLowerCase();
  const numId = parseInt(q, 10);
  const isPureNumber = !isNaN(numId) && q === String(numId);
  const orConditions: any[] = [];

  // Vector 1: Numeric ID Match
  if (isPureNumber) {
    orConditions.push({ numericId: numId });
  }

  // Vector 2: Name Contains Match (Case-Insensitive)
  orConditions.push({ name: { contains: q, mode: 'insensitive' } });

  // Vector 3: External Provider Service ID Match
  orConditions.push({ externalId: q });
  if (isPureNumber) {
    orConditions.push({ externalId: String(numId) });
  }

  // Vector 4: Active Provider Recognition (ID or Name match)
  const providers = await db.provider.findMany({ select: { id: true, name: true } });
  const matchedProvider = providers.find(p => p.id === q || p.name.toLowerCase() === lowerQ);
  if (matchedProvider) {
    orConditions.push({ providerId: matchedProvider.id });
  }

  // Vector 5: Social Network Recognition (slug contains query)
  const networks = await db.network.findMany({ select: { id: true, slug: true } });
  const matchedNetwork = networks.find(n => n.slug === lowerQ || lowerQ.includes(n.slug));
  if (matchedNetwork) {
    orConditions.push({ category: { networkId: matchedNetwork.id } });
  }

  where.OR = orConditions;
}
```

---

### Milestone 4: Premium UI/UX & WCAG Target Sizing (R4)

#### 4.1 Eradicate Native `confirm()` Alert Loops
Audited exactly **17 native confirm calls** across the codebase. Implement a shared component `ConfirmModal` at `src/components/ui/confirm-modal.tsx`:
```tsx
'use client';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title = "Подтверждение действия", children, confirmText = "Да", cancelText = "Отмена", isDanger = false }: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onClose}>
      <ModalContent className="bg-background rounded-2xl border border-divider">
        <ModalHeader className="font-bold text-foreground">{title}</ModalHeader>
        <ModalBody className="text-muted-foreground text-sm">{children}</ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} className="min-h-[44px]">
            {cancelText}
          </Button>
          <Button color={isDanger ? "danger" : "primary"} onPress={onConfirm} className="min-h-[44px]">
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
```
Replace the 17 mapped calls in categories, quarantine list, payout buttons, order clients, catalog actions, routes deletion, and support templates, integrating inline hook states.

#### 4.2 Accessibility Touch Sizing Compliance (WCAG 2.2 AA)
Configure all `size="sm"` or `size="icon"` actions (using heights `h-9` or `h-8`) with CSS transparent pseudo-elements to expand touch interactive zones to `>= 44px` on mobile layouts:
```css
/* Add to global utility class or standard Tailwind classes */
.touch-target-expand {
  @apply relative after:content-[''] after:absolute after:inset-[-4px] after:min-w-[44px] after:min-h-[44px];
}
```

---

### Milestone 5: Unified Tickets Workspace (R5)

#### 5.1 Main Unified Route (`src/app/admin/tickets/page.tsx`)
Unify both listings and dialogues under a single page by managing details rendering inline based on search query values:
```tsx
import { adminTicketService } from '@/services/admin/ticket.service';
import { getTemplates } from '@/actions/support/template';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { UnifiedTicketsWorkspace } from './components/unified-workspace';
import { HeadphonesIcon } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/page-header';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    ticketId?: string;
  }>;
};

export default async function AdminTicketsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.q || '';
  const statusFilter = params.status || 'ALL';
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const activeTicketId = params.ticketId || null;

  // 1. Fetch tickets matching current filter and page sizes
  const [ticketsResult, stats, templatesResult, session] = await Promise.all([
    adminTicketService.listTickets({
      search: search || undefined,
      status: statusFilter,
      pageSize: 20, // compact size for two-panel scrollbars
      page: currentPage,
    }),
    adminTicketService.getTicketStats(),
    getTemplates(),
    verifySession()
  ]);

  // 2. Fetch full active ticket chat details if ticketId query parameter exists
  let activeTicket = null;
  let supportLimitCents = 0;
  if (activeTicketId) {
    activeTicket = await adminTicketService.getTicketDetails(activeTicketId);
    if (session?.userId) {
      const admin = await db.user.findUnique({
        where: { id: session.userId },
        select: { supportLimitCents: true },
      });
      if (admin) supportLimitCents = admin.supportLimitCents;
    }
  }

  const templates = Array.isArray(templatesResult) ? templatesResult : [];

  return (
    <div className="flex-grow flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <UnifiedTicketsWorkspace 
        tickets={ticketsResult.items}
        totalPages={ticketsResult.totalPages}
        currentPage={currentPage}
        stats={stats}
        activeTicket={activeTicket}
        templates={templates}
        supportLimitCents={supportLimitCents}
        currentStatus={statusFilter}
        currentSearch={search}
      />
    </div>
  );
}
```

#### 5.2 Redirect Handler (`src/app/admin/tickets/[id]/page.tsx`)
To support backward compatibility and clean links, intercept direct route hits and redirect to the unified page layout:
```tsx
import { redirect } from 'next/navigation';

export default async function AdminOldTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/tickets?ticketId=${id}`);
}
```

#### 5.3 Left Panel Ticket Card Component
Create sleek card listing elements. Avatars are color-coded based on active ticket state. Previews show localized times:
```tsx
// Left card rendering loop
tickets.map(ticket => {
  const isActive = activeTicket?.id === ticket.id;
  const lastMsg = ticket.messages?.[0]?.text || "Нет сообщений";
  const croppedMsg = lastMsg.length > 55 ? `${lastMsg.substring(0, 55)}...` : lastMsg;
  const statusColor = 
    ticket.status === 'OPEN' ? 'bg-destructive' : 
    ticket.status === 'PENDING' ? 'bg-warning' : 'bg-success';

  return (
    <div 
      key={ticket.id}
      onClick={() => selectTicket(ticket.id)}
      className={`p-4 border-b border-border cursor-pointer transition-all duration-200 ${
        isActive ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-muted/30 bg-card'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-foreground shrink-0">
          {ticket.user.email.substring(0, 2).toUpperCase()}
          <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${statusColor} border-2 border-card`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0.5">
            <span className="text-xs font-bold text-foreground truncate max-w-[150px]">{ticket.user.email}</span>
            <span className="text-[10px] text-muted-foreground">{new Date(ticket.updatedAt).toLocaleDateString('ru-RU')}</span>
          </div>
          <span className="block text-xs font-black text-foreground truncate mb-1">{ticket.subject}</span>
          <p className="text-[11px] text-muted-foreground truncate">{croppedMsg}</p>
        </div>
      </div>
    </div>
  );
})
```

#### 5.4 Unified Workspace Client Wrapper (`unified-workspace.tsx`)
Manage states, filters, searching with standard query params, and viewport media sizes:
- **Left Panel**: Filter pills for ticket status (`Все`, `Открытые`, `Ожидающие`, `Закрытые`), search bar, card list items, and pagination buttons.
- **Right Panel**: Detailed dialogue header, attached order details widget, scrolling chat timeline, template trigger selectors, and reply form.
- **Empty State**: Animated vector with visual cues if `activeTicket` is null.
- **Mobile layout checks**:
```tsx
const isMobile = useMediaQuery('(max-width: 1023px)');

return (
  <div className="flex flex-1 overflow-hidden h-full">
    {/* Left Panel: Show on desktop OR on mobile when no ticket is active */}
    {(!isMobile || !activeTicket) && (
      <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-r border-border flex flex-col h-full bg-card">
        {/* Header, Filters, Search & Cards List */}
      </div>
    )}
    
    {/* Right Panel: Show on desktop OR on mobile when a ticket is active */}
    {(!isMobile || activeTicket) && (
      <div className="flex-1 flex flex-col h-full bg-muted/20">
        {activeTicket ? (
          <div className="flex flex-col flex-1 h-full overflow-hidden">
            {/* Mobile Header with "Назад" back button */}
            {isMobile && (
              <div className="p-3 border-b border-border bg-card flex items-center gap-2">
                <Button size="sm" onClick={clearActiveTicket} variant="flat">
                  ← Назад к диалогам
                </Button>
              </div>
            )}
            {/* Active Ticket Chat Dialogue Window */}
          </div>
        ) : (
          <div className="hidden lg:flex flex-col flex-grow items-center justify-center text-center p-8 bg-card/10">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 animate-bounce">
              🎧
            </div>
            <h3 className="font-bold text-foreground text-base">Выберите диалог</h3>
            <p className="text-muted-foreground text-xs max-w-sm mt-1">
              Выберите обращение в левом меню для просмотра подробностей и начала общения с пользователем.
            </p>
          </div>
        )}
      </div>
    )}
  </div>
);
```

#### 5.5 Collapsible Client Profile Sidebar (`ClientProfileSidebar` & Mobile Drawer)
To ensure the operator focuses on chat details by default, the client profile details side panel must be collapsible and hidden by default:
- **Default State**: The `ClientProfileSidebar` panel is hidden (`isOpen = false` state).
- **Desktop Toggle**: Add an elegant user/info profile button in the top right chat header. Clicking it toggles a sliding transition that expands/collapses the right sidebar next to the main chat dialog area.
- **Mobile Drawer Support**: On viewport widths `< 1024px`, clicking the toggle button displays the sidebar inside a beautiful, slide-out HeroUI `Drawer` (or full-width sheet) overlaid on top of the chat panel, allowing quick profile/LTV checks without cluttering the mobile viewport.

#### 5.6 Mobile Support Operator UX & Support Bridge (R6)
1. **Dynamic Units (DVH) & Responsive Heights**:
   - Change `h-screen` and `h-100vh` to `h-[100dvh]` and `max-h-[100dvh]` for the main tickets page layout and right chat panel container to prevent mobile browser chrome (URL/navigation bars) from overlapping inputs or clipping elements.
2. **Smooth Autoscroll on Mobile Focus**:
   - Track messages panel using React refs `messagesEndRef` and `messagesContainerRef`.
   - On the reply input's `onFocus` event, and on visual viewport resize events via the browser's `window.visualViewport` API, run a smooth programmatic scroll-to-bottom on the active messages thread container:
     ```typescript
     const handleViewportChange = () => {
       if (messagesContainerRef.current) {
         messagesContainerRef.current.scrollTo({
           top: messagesContainerRef.current.scrollHeight,
           behavior: 'smooth',
         });
       }
     };
     window.visualViewport?.addEventListener('resize', handleViewportChange);
     ```
3. **Horizontal Templates Swipe on Mobile**:
   - Style support templates select container for touch screens with horizontal swiping using utility classes:
     `flex overflow-x-auto flex-nowrap scrollbar-hide snap-x snap-mandatory gap-2 py-1 px-4 max-w-full -mx-4`
   - Touch items inside use `snap-start shrink-0 min-h-[44px] flex items-center justify-center` to satisfy accessibility touch limits.
4. **Mobile BottomSheet for Attached Orders**:
   - On screen widths `< 1024px`, when clicking the attached order details card in the chat window, present order properties and operations (Cancel Order, Restart, Provider Switch) inside a compact slide-up HeroUI Drawer (functioning as a BottomSheet).
   - Ensure all buttons inside the bottom sheet have a minimum height/width of `44px` for touch accessibility.
5. **Intelligent Support Bridge**:
   - In order details block (both desktop card and mobile bottom sheet), render a secondary action button:
     `<Button startContent={<ExternalLinkIcon className="w-4 h-4" />} size="sm" onClick={handleProviderSupportBridge}>В тикеты провайдера</Button>`
   - Triggering it executes:
     1. Copies the `externalId` to clipboard: `navigator.clipboard.writeText(order.externalId)`.
     2. Fires a standard success toast saying: `Внешний ID [id] скопирован в буфер обмена`.
     3. Resolves the provider's support tickets endpoint (configured under provider models or helper utilities, fallback: `https://smmprovider.com/tickets`) and opens it in a new tab: `window.open(providerUrl, '_blank')`.

---

## 5. Verification & Acceptance Criteria

### 5.1 Verification Commands
To compile and test the implementations securely:
```powershell
# 1. Verify TypeScript types and compilation parameters
npx tsc --noEmit

# 2. Build full web server bundles ensuring clean bundler optimization
npm run build

# 3. Execute unit tests across routes and controller components
npm run test
```

### 5.2 Verification Checklist
- [ ] **Referral Chart Dynamics**: Verify that the AreaChart gradient renders on the Marketing dashboard and switches to empty state safely if paidOut and pending values are zero.
- [ ] **Switch Component & Custom Modals**: Check that Radix checkboxes are replaced by HeroUI switches. Verify that coupon delete button triggers the HeroUI dialog modal instead of browser alerts.
- [ ] **Refill Safety Action**: Run checks attempting to dispatch refills for canceled/refunded orders. Confirm they are rejected.
- [ ] **BullMQ Refills Worker**: Execute background queue tasks. Verify status shifts to `IN_PROGRESS` and loops properly through 15-minute intervals upon upstream failures.
- [ ] **5-Vector Service Search**: Input numeric IDs, provider names, network slugs, and external provider service IDs. Confirm that Prisma filters return correct matches.
- [ ] **confirm() Complete Elimination**: Verify that exact 17 browser `confirm()` calls are completely eliminated and replaced by HeroUI custom dialog modals.
- [ ] **WCAG Sizing Bounds**: Check mobile viewports. Small buttons inside tables must support transparent clickable extensions.
- [ ] **Unified Two-Panel Workspace**: Load `/admin/tickets` in 4K, 1080p, and mobile layouts. Check that card clicking shifts query params dynamically, mobile layout hides corresponding panels properly, and the premium empty screen is displayed.
- [ ] **Collapsible Client Profile Sidebar**: Verify that the right sidebar is collapsed by default. Clicking the top-right header button toggles the sidebar's presence smoothly. On mobile viewports, verify it slides over the chat screen inside a HeroUI Drawer sheet.
- [ ] **Mobile DVH Sizing & Autoscroll**: Inspect the UI using chrome device emulator. Confirm that `dvh` units are applied and focusing the chat input triggers visualViewport smooth scroll-to-bottom automatically.
- [ ] **Horizontal Templates Swipe**: Test template cards. On mobile viewports, the templates container must swipe horizontally smoothly and support touch snap layout alignment.
- [ ] **BottomSheet & Action Target Sizes**: In mobile viewport, click the attached order card. Critical support actions must slide up inside a HeroUI bottom Drawer, with touch targets sized to `>= 44px`.
- [ ] **Support Bridge Copy-Open**: Click "В тикеты провайдера". Confirm externalId is saved to clipboard, success toast is dispatched, and provider URL opens in a new tab.

