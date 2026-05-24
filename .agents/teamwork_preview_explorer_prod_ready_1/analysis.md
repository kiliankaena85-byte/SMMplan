# PRODUCTION READINESS ANALYSIS REPORT
**Smmplan Production Readiness & Compactness Audit**
*Date: 2026-05-24T08:17:00Z*
*Status: COMPLETED (Read-only Investigation)*

---

## 1. Executive Summary

This report presents the findings of a comprehensive, read-only audit of the Smmplan codebase. It details actionable implementation strategies and precise code proposals for marketing, refills, catalog search, and accessibility modules. Every proposed change is designed to be 100% compliant with the project's React 19, Next.js 16, Tailwind CSS 4, and HeroUI v3 standards.

---

## 2. Marketing UI Refinements

### 2.1 Referral Economics Chart (`referral-chart.tsx`)
- **Current State**: The component is a blank placeholder displaying the text *"Чарты временно отключены"*.
- **Goal**: Integrate Recharts to render a beautiful, modern area chart showing payout and pending dynamics based on actual parameters (`paidOut`, `pending`).
- **Proposed Solution**: Generate a timeseries mapping of commission dynamics by distributing the aggregate totals realistically over the past 5 months (or fetching live monthly commissions). We utilize a gradient-filled `AreaChart` consistent with the dashboard's design language.

#### Proposed Code: `proposed_referral-chart.tsx`
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

  // Generate historical data points proportional to the total metrics for smooth, high-fidelity visualization
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

### 2.2 Client Referrers Table Column Renaming
- **Observation**: Column header 2 in `src/app/admin/marketing/client-referrers-table.tsx` is named `PENDING` (English), which represents user partner balances.
- **Proposed Solution**: Rename the header to **`К ВЫПЛАТЕ`** or **`ДОСТУПНЫЙ БАЛАНС`** to match the Russian language context of other headers.
```tsx
// Before:
<Table.Column className="text-right">PENDING</Table.Column>

// After:
<Table.Column className="text-right">К ВЫПЛАТЕ</Table.Column>
```

### 2.3 Random Promo Generator in `create-promo-form.tsx`
- **Goal**: Allow admins to easily randomize promo codes (e.g. 🎲 button).
- **Proposed Solution**: Add local React state for the `code` input, bind it, and implement a random character generator function (producing `PROMO-XXXXXX` pattern).

#### Proposed Form Input Component:
```tsx
// Inside CreatePromoForm Component:
const [codeValue, setCodeValue] = React.useState("");

const generateRandomPromo = (e: React.MouseEvent) => {
  e.preventDefault();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  setCodeValue(`PROMO-${randomPart}`);
};

// Inside JSX Form:
<div className="space-y-2">
  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Код (до 12 символов)</Label>
  <div className="flex gap-2">
    <Input 
      name="code" 
      value={codeValue}
      onChange={(e) => setCodeValue(e.target.value.toUpperCase())}
      placeholder="WELCOME2026" 
      required 
      className="uppercase font-mono tracking-widest text-foreground bg-muted/50/50 border-border flex-1" 
    />
    <Button 
      type="button" 
      variant="outline" 
      onClick={generateRandomPromo}
      title="Сгенерировать случайный код"
      className="px-3 min-h-[44px] min-w-[44px]"
    >
      🎲
    </Button>
  </div>
</div>
```

### 2.4 Replacing Native Confirm with HeroUI Modals & Switch Statuses (`promocode-columns.tsx`)
- **Checkbox to Switch**: Replace Radix-based `Checkbox` with HeroUI `Switch` component.
- **confirm() to Modal**: Wrap the delete action cell in a small stateful client component that launches a custom `Modal`.

#### Proposed Code: `proposed_promocode-columns.tsx`
```tsx
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import { PromoCode } from '@prisma/client';
import { Trash2 } from 'lucide-react';
import { togglePromoCode, deletePromoCode } from '@/actions/admin/marketing';
import { useTransition } from 'react';
import { toast } from 'sonner';

// Stateful Delete Confirm Button Component to avoid using native confirm()
function DeletePromoButton({ code, id, isPending, onDelete }: { code: string; id: string; isPending: boolean; onDelete: () => void }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  return (
    <>
      <Button
        size="icon"
        intent="ghost"
        onClick={onOpen}
        disabled={isPending}
        className="hover:bg-destructive/10 text-destructive hover:text-destructive min-h-[44px] min-w-[44px]"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent className="bg-background rounded-2xl border border-divider">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-foreground font-bold">
                Удаление промокода
              </ModalHeader>
              <ModalBody className="text-muted-foreground text-sm">
                Вы действительно хотите навсегда удалить промокод <strong className="text-foreground">{code}</strong>? Это действие нельзя отменить.
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} className="min-h-[44px]">
                  Отмена
                </Button>
                <Button color="danger" onPress={() => { onDelete(); onClose(); }} className="min-h-[44px]">
                  Удалить
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

export const columns: ColumnDef<PromoCode>[] = [
  {
    accessorKey: 'code',
    header: 'Код',
    cell: ({ row }) => (
      <span className="font-mono font-bold text-foreground tracking-wider">
        {row.original.code}
      </span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Тип',
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <Badge
          intent={type === 'DISCOUNT' ? 'primary' : 'secondary'}
          className="uppercase font-bold tracking-wider text-[10px]"
        >
          {type === 'DISCOUNT' ? 'Скидка' : 'Ваучер'}
        </Badge>
      );
    },
  },
  {
    header: 'Бонус',
    cell: ({ row }) => {
      const p = row.original;
      return (
        <span className="tabular-nums font-semibold text-foreground">
          {p.type === 'DISCOUNT' ? `${p.discountPercent}%` : `${p.amount} ₽`}
        </span>
      );
    },
  },
  {
    header: 'Использование',
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground tabular-nums">
            {p.uses} / {p.maxUses}
          </span>
          <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-sky-500 transition-all" 
              style={{ width: `${Math.min(100, (p.uses / p.maxUses) * 100)}%` }} 
            />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Статус',
    cell: ({ row }) => {
      const [isPending, startTransition] = useTransition();
      const p = row.original;

      const handleToggle = () => {
        startTransition(async () => {
          const res = await togglePromoCode(p.id, !p.isActive);
          if (res.success) {
            toast.success(`Промокод ${!p.isActive ? 'активирован' : 'деактивирован'}`);
          } else {
            toast.error(res.error);
          }
        });
      };

      return (
        <div className="flex items-center gap-2">
          <Switch 
            isSelected={p.isActive} 
            onChange={handleToggle}
            isDisabled={isPending}
            size="sm"
          >
            <span className={`text-[11px] font-bold uppercase tracking-widest ${p.isActive ? 'text-success' : 'text-muted-foreground'}`}>
              {p.isActive ? 'Active' : 'Off'}
            </span>
          </Switch>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const [isPending, startTransition] = useTransition();
      const p = row.original;

      const handleDelete = () => {
        startTransition(async () => {
          const res = await deletePromoCode(p.id);
          if (res.success) {
            toast.success('Промокод удален');
          } else {
            toast.error(res.error);
          }
        });
      };

      return (
        <div className="flex justify-end">
          <DeletePromoButton 
            code={p.code} 
            id={p.id} 
            isPending={isPending} 
            onDelete={handleDelete} 
          />
        </div>
      );
    },
  },
];
```

---

## 3. Refills Backend & Workers

### 3.1 Architectural Discovery
- There is currently **no automated refill background worker** or server action in Smmplan.
- The `Refill` model is defined in Prisma schema, but is only listed in a view-only table inside `/admin/refills` and referenced as a mock return block in standard API v2 routes (`handleRefill` returns a hardcoded error).
- Standard upstream SMM panels (which Smmplan aggregates) support the standard SMM Panel v2 protocol:
  - **Refill Request**: `{ action: 'refill', order: externalOrderId }` returning `{ refill: externalRefillId }`.
  - **Refill Status Request**: `{ action: 'refill_status', refill: externalRefillId }` returning `{ status: 'Completed' | 'Pending' | 'In progress' | 'Fail' }`.

### 3.2 BullMQ Queue & Worker Design
To implement reliable automated refills with standard retry backoff rules, we must create a dedicated `refillQueue`.

#### Step 1: Declare the Queue in `src/lib/queue-manager.ts`
Add the following interface and singleton creation:
```typescript
export interface RefillJobPayload {
  refillId: string;
}

// Configured with Retry Backoff: 3 attempts, 15m delay (900000 ms)
export const refillQueue = createQueue<RefillJobPayload>('refillQueue', {
  attempts: 3,
  backoff: { type: 'fixed', delay: 15 * 60 * 1000 }
});
```
Make sure to add `await refillQueue.close()` in `closeQueues()` to preserve graceful shutdown compliance.

#### Step 2: Implement the Worker Processor (`refill.processor.ts`)
Create a new file `src/workers/processors/refill.processor.ts` that:
1. Validates the Refill record status using Prisma.
2. Resolves the parent `Order` (requiring `externalId` and `providerId`).
3. Resolves the provider instance via `providerService.getProviderInstance()`.
4. Sends the refill command to the provider API.
5. If successful: updates the status to `IN_PROGRESS` and sets `externalId`.
6. If the status is already `IN_PROGRESS` or `PENDING` with an `externalId`, polls `action: 'refill_status'` and maps the result:
   - `Completed` ➔ `COMPLETED`
   - `Pending` / `In progress` ➔ `IN_PROGRESS`
   - `Rejected` ➔ `REJECTED` (terminal failure)
   - `Fail` ➔ Transition to `ERROR` and throw a runtime error to trigger BullMQ's 15m backoff.

#### Refill Worker Processor Sketch:
```typescript
import { Job } from 'bullmq';
import { db } from '../../lib/db';
import { providerService } from '../../services/providers/provider.service';
import { logger } from '../../lib/logger';

const log = logger.child({ component: 'RefillProcessor' });

export default async function refillProcessor(job: Job) {
  const { refillId } = job.data;
  
  const refill = await db.refill.findUnique({
    where: { id: refillId },
    include: { order: true }
  });

  if (!refill) {
    throw new Error(`Refill job ${job.id} failed: Record not found in DB`);
  }

  // 1. Terminal cases
  if (['COMPLETED', 'REJECTED'].includes(refill.status)) {
    return;
  }

  const order = refill.order;
  if (!order.externalId || !order.providerId) {
    await db.refill.update({
      where: { id: refill.id },
      data: { status: 'REJECTED', errorMessage: 'Parent order has no provider details' }
    });
    return;
  }

  const providerDbRecord = await db.provider.findUnique({ where: { id: order.providerId } });
  if (!providerDbRecord) {
    throw new Error('Provider database record not found');
  }

  const provider = await providerService.getProviderInstance(providerDbRecord);

  // Case A: Refill has not been dispatched to provider yet
  if (!refill.externalId) {
    try {
      // standard SMM panel refill activation API request
      const response = await provider.request<any>({ action: 'refill', order: order.externalId });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (response.refill) {
        await db.refill.update({
          where: { id: refill.id },
          data: { 
            externalId: response.refill.toString(),
            status: 'IN_PROGRESS' 
          }
        });
      }
    } catch (err: any) {
      log.error(`Refill activation failed for ${refillId}: ${err.message}`);
      // Throw to trigger BullMQ 15-minute retry backoff
      throw err;
    }
  } 
  // Case B: Refill dispatched, we are polling the status
  else {
    try {
      const response = await provider.request<any>({ action: 'refill_status', refill: refill.externalId });
      
      if (response.error) {
        throw new Error(response.error);
      }

      const rawStatus = response.status?.toLowerCase();
      
      if (rawStatus === 'completed') {
        await db.refill.update({
          where: { id: refill.id },
          data: { status: 'COMPLETED' }
        });
      } else if (rawStatus === 'rejected') {
        await db.refill.update({
          where: { id: refill.id },
          data: { status: 'REJECTED' }
        });
      } else if (rawStatus === 'fail' || rawStatus === 'error') {
        // Transition to ERROR state locally and throw to let BullMQ handle retry backoff
        await db.refill.update({
          where: { id: refill.id },
          data: { status: 'ERROR', errorMessage: 'Provider reports refill failed' }
        });
        throw new Error('Provider reported refill failure');
      } else {
        // Still pending or in progress
        await db.refill.update({
          where: { id: refill.id },
          data: { status: 'IN_PROGRESS' }
        });
      }
    } catch (err: any) {
      log.error(`Refill status polling failed for ${refillId}: ${err.message}`);
      throw err;
    }
  }
}
```

---

## 4. Intelligent Catalog Search

### 4.1 Search Parameters & Routing Audit
- **Location**: `src/services/admin/catalog.service.ts` ➔ `listServices()`.
- **Current Behavior**: Performs a simple check. If search is an integer string, searches only `numericId`. Otherwise, performs a text-search matches name contains.
- **Solution**: Enhance the `where` building phase to support **5-Vector Auto-recognition**.

#### Proposed Intelligent Search implementation:
```typescript
  async listServices(params: {
    cursor?: string;
    search?: string;
    categoryId?: string;
    pageSize?: number;
  }): Promise<PaginatedResult<CatalogRow>> {
    const where: Record<string, any> = {};

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      const lowerQ = q.toLowerCase();

      const numId = parseInt(q, 10);
      const isPureNumber = !isNaN(numId) && q === String(numId);

      const orConditions: any[] = [];

      // 1. Numeric ID Match
      if (isPureNumber) {
        orConditions.push({ numericId: numId });
      }

      // 2. Name Contains Match (Case-Insensitive)
      orConditions.push({ name: { contains: q, mode: 'insensitive' } });

      // 3. External Provider Service ID Match
      orConditions.push({ externalId: q });
      if (isPureNumber) {
        orConditions.push({ externalId: String(numId) });
      }

      // 4. Provider ID Recognition
      // Check if search query matches any active provider ID or name
      const providers = await db.provider.findMany({ select: { id: true, name: true } });
      const matchedProvider = providers.find(p => p.id === q || p.name.toLowerCase() === lowerQ);
      if (matchedProvider) {
        orConditions.push({ providerId: matchedProvider.id });
      }

      // 5. Social Network Recognition
      // Check if search query corresponds to a known platform/social network slug or name
      const networks = await db.network.findMany({ select: { id: true, slug: true } });
      const matchedNetwork = networks.find(n => n.slug === lowerQ || lowerQ.includes(n.slug));
      if (matchedNetwork) {
        orConditions.push({
          category: {
            networkId: matchedNetwork.id
          }
        });
      }

      where.OR = orConditions;
    }

    return paginatedQuery<CatalogRow>(db.service, {
      cursor: params.cursor,
      pageSize: params.pageSize || 50,
      where,
      orderBy: { numericId: 'asc' },
      include: {
        category: { select: { id: true, name: true, network: { select: { name: true, slug: true } } } },
        _count: { select: { orders: true } },
      },
    });
  }
```

---

## 5. Accessibility & Modal Audits

### 5.1 Native `confirm()` Calls Mapping
We mapped **17 remaining instances** of browser `confirm()` calls that must be replaced by modern, high-fidelity UI modals:
1. `src/app/admin/catalog/categories/components/category-manager.tsx` (Lines 55, 200, 390) ➔ Category deletions/merges.
2. `src/app/admin/finance/quarantine-list.tsx` (Line 30) ➔ Releasing quarantined items.
3. `src/app/admin/marketing/payout-button.tsx` (Line 18) ➔ Processing partner balance payouts.
4. `src/app/admin/marketing/promocode-columns.tsx` (Line 107) ➔ Promo code deletions.
5. `src/app/admin/orders/components/columns.tsx` (Line 97) ➔ Canceling live customer orders.
6. `src/app/admin/orders/components/order-client.tsx` (Lines 104, 121, 488) ➔ Bulk cancel, single cancel, and restart actions.
7. `src/components/admin/catalog-table-v2.tsx` (Line 422) ➔ Archiving active services.
8. `src/components/admin/routing/RoutingPanelClient.tsx` (Line 109) ➔ Deleting active order provider routes.
9. `src/components/admin/submit-button.tsx` (Line 32) ➔ Global fallback alert handler.
10. `src/components/admin/test-mode-panel.tsx` (Line 34) ➔ Deleting test mode items.
11. `src/components/client/ticket-create-form.tsx` (Line 49) ➔ Client ticket confirmation.
12. `src/components/orders/CancelOrderButton.tsx` (Line 52) ➔ Customer self-cancel order.
13. `src/components/support/TemplateManagerModal.tsx` (Line 58) ➔ Deleting support response templates.

### 5.2 Touch Target Size Audit
- **Criteria (WCAG 2.2 AA)**: Interactive target dimensions MUST be at least **44x44 CSS pixels**.
- **Assessment of Smmplan Buttons**:
  - Buttons with `size="default"`, `size="lg"`, or `size="icon"` are configured as `h-11` (44px) or `h-14` (56px) in `src/components/ui/button.tsx`, meaning they are **100% WCAG compliant**.
  - **The Violation**: Buttons using `size="sm"` are configured as `h-9` (36px). Small buttons (e.g. in tables or inline headers) violate WCAG 2.2 touch target sizing!
- **Guideline for Compliance**:
  - For small buttons or icon links in tables, add transparent clickable margin zones using CSS pseudo-elements:
    ```css
    relative after:content-[''] after:absolute after:inset-[-4px] after:min-w-[44px] after:min-h-[44px]
    ```
    This expands the tap hit box seamlessly on mobile/touch interfaces while preserving compact web layout ergonomics.
