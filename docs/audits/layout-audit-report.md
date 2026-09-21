# 📐 Layout Overflow Sentry — Отчет проверки вёрстки

**Дата проведения:** 21.09.2026, 08:22:20  
**Вердикт:** **🔴 DEFECTS_DETECTED**  

---

### 📊 Статистика верстки
- **Всего замечаний:** 22
- **🔴 Высокий приоритет (High):** 22
- **🟡 Средний приоритет (Medium):** 0
- **🟢 Низкий приоритет (Low):** 0

---

### 📋 Список найденных участков


#### #1 [FIXED_WIDTH_HAZARD] src/components/admin/sidebar.tsx:120
- **Код:** `collapsed ? "w-16" : "w-[280px]"`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #2 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:342
- **Код:** `<th className="py-3 px-4 w-[160px]">Статус</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #3 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:343
- **Код:** `<th className="py-3 px-4 w-[140px]">Кто выставляет</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #4 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:344
- **Код:** `<th className="py-3 px-4 w-[130px]">Баланс клиента</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #5 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:345
- **Код:** `<th className="py-3 px-4 min-w-[240px]">Техническое описание</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #6 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:346
- **Код:** `<th className="py-3 px-4 min-w-[260px]">Что отвечать клиенту</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #7 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:259
- **Код:** `<PlanTableHeadCell className="w-[105px]">ID / Дата</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #8 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:263
- **Код:** `<PlanTableHeadCell className="w-[110px] text-right">Сумма</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #9 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:265
- **Код:** `<PlanTableHeadCell className="w-[115px]">Статус</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #10 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/reconciliation-tab.tsx:303
- **Код:** `<PlanTableHeadCell className="w-[100px]">Статус</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #11 [FIXED_WIDTH_HAZARD] src/app/admin/finance/payments/[id]/dispute-pack/page.tsx:326
- **Код:** `<div className="w-full lg:w-[400px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-border/60 p-8 flex flex-col justify-between shrink-0 no-print z-20">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #12 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:467
- **Код:** `<th scope="col" className="py-2 px-3 w-[125px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #13 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:470
- **Код:** `<th scope="col" className="py-2 px-3 w-[160px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #14 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:474
- **Код:** `<th scope="col" className="py-2 px-3 w-[130px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #15 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:477
- **Код:** `<th scope="col" className="py-2 px-3 w-[100px] text-right">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #16 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:480
- **Код:** `<th scope="col" className="py-2 px-3 w-[120px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #17 [FIXED_WIDTH_HAZARD] src/app/admin/settings/balance-policies/page.tsx:206
- **Код:** `<PlanTableHeadCell className="w-[110px]">Область</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #18 [FIXED_WIDTH_HAZARD] src/app/admin/settings/balance-policies/page.tsx:208
- **Код:** `<PlanTableHeadCell className="w-[140px]">Права</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #19 [MODAL_CLIPPING] src/app/admin/settings/telegram-bot-settings.tsx:232
- **Код:** `<Dialog open={isResetWebhookModalOpen} onOpenChange={setIsResetWebhookModalOpen}>`
- **Рекомендация:** Modal Hoisting Violation: Popup rendered inside overflow-hidden parent. Hoist via Portal.


#### #20 [FIXED_WIDTH_HAZARD] src/app/admin/staff/staff-client.tsx:314
- **Код:** `<td className="px-4 py-3.5 align-middle min-w-[240px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #21 [FIXED_WIDTH_HAZARD] src/app/admin/tickets/components/tickets-sidebar.tsx:103
- **Код:** `className="w-full lg:w-[300px] xl:w-[340px] shrink-0 border-r border-border flex flex-col h-full overflow-hidden min-h-0 select-none bg-background min-w-0"`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #22 [FIXED_WIDTH_HAZARD] src/app/admin/tickets/components/unified-workspace.tsx:563
- **Код:** `<div className="w-[280px] xl:w-[320px] shrink-0 border-l border-border/50 h-full min-h-0 bg-card/60 backdrop-blur-md overflow-hidden animate-in slide-in-from-right duration-300 min-w-0">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").

