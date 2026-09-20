# 📐 Layout Overflow Sentry — Отчет проверки вёрстки

**Дата проведения:** 20.09.2026, 21:30:18  
**Вердикт:** **🔴 DEFECTS_DETECTED**  

---

### 📊 Статистика верстки
- **Всего замечаний:** 49
- **🔴 Высокий приоритет (High):** 48
- **🟡 Средний приоритет (Medium):** 1
- **🟢 Низкий приоритет (Low):** 0

---

### 📋 Список найденных участков


#### #1 [FIXED_WIDTH_HAZARD] src/components/admin/sidebar.tsx:120
- **Код:** `collapsed ? "w-16" : "w-[280px]"`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #2 [FIXED_WIDTH_HAZARD] src/components/admin/tenant-selector.tsx:38
- **Код:** `<SelectTrigger size="sm" className="w-[180px] bg-background/60 backdrop-blur-md border-border/40 font-semibold shadow-sm transition-all duration-200">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #3 [FIXED_WIDTH_HAZARD] src/app/admin/dashboard/orders-chart.tsx:226
- **Код:** `<div className="bg-card text-card-foreground border border-border/80 rounded-lg p-3 shadow-xl text-xs space-y-1.5 min-w-[170px] select-none font-sans">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #4 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:342
- **Код:** `<th className="py-3 px-4 w-[160px]">Статус</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #5 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:343
- **Код:** `<th className="py-3 px-4 w-[140px]">Кто выставляет</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #6 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:344
- **Код:** `<th className="py-3 px-4 w-[130px]">Баланс клиента</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #7 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:345
- **Код:** `<th className="py-3 px-4 min-w-[240px]">Техническое описание</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #8 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:346
- **Код:** `<th className="py-3 px-4 min-w-[260px]">Что отвечать клиенту</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #9 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:201
- **Код:** `<SelectTrigger className="w-[160px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #10 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:222
- **Код:** `<SelectTrigger className="w-[150px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #11 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:258
- **Код:** `<PlanTableHeadCell className="w-[105px]">ID / Дата</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #12 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:262
- **Код:** `<PlanTableHeadCell className="w-[110px] text-right">Сумма</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #13 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:264
- **Код:** `<PlanTableHeadCell className="w-[115px]">Статус</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #14 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/balance-requests/balance-requests-client.tsx:333
- **Код:** `<span className={`text-xs font-bold font-mono truncate ${isCredit ? 'text-success' : 'text-destructive'}`}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #15 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/finance-ledger-tab.tsx:244
- **Код:** `<SelectTrigger className="w-[180px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #16 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/finance-ledger-tab.tsx:260
- **Код:** `<SelectTrigger className="w-[130px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #17 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/finance-ledger-tab.tsx:276
- **Код:** `<SelectTrigger className="w-[140px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #18 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/finance-payments-tab.tsx:165
- **Код:** `<SelectTrigger className="w-[130px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #19 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/finance-payments-tab.tsx:181
- **Код:** `<SelectTrigger className="w-[140px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #20 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/finance-payments-tab.tsx:197
- **Код:** `<SelectTrigger className="w-[130px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #21 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/reconciliation-tab.tsx:302
- **Код:** `<PlanTableHeadCell className="w-[100px]">Статус</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #22 [FIXED_WIDTH_HAZARD] src/app/admin/finance/payments/[id]/dispute-pack/page.tsx:326
- **Код:** `<div className="w-full lg:w-[400px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-border/60 p-8 flex flex-col justify-between shrink-0 no-print z-20">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #23 [FIXED_WIDTH_HAZARD] src/app/admin/marketing/promocode-table.tsx:29
- **Код:** `<div className="flex flex-col gap-1.5 min-w-[150px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #24 [FIXED_WIDTH_HAZARD] src/app/admin/marketing/promocode-table.tsx:55
- **Код:** `<div className="flex flex-col gap-1.5 min-w-[150px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #25 [FIXED_WIDTH_HAZARD] src/app/admin/marketing/promocode-table.tsx:89
- **Код:** `<div className="flex flex-col gap-1.5 min-w-[150px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #26 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/columns.tsx:192
- **Код:** `<div className="p-2.5 space-y-2 min-w-[180px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #27 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/columns.tsx:436
- **Код:** `<div className="flex flex-col text-xs leading-normal py-1 space-y-1 min-w-[130px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #28 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/columns.tsx:531
- **Код:** `<div className="flex flex-col gap-1 py-1 whitespace-nowrap min-w-[110px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #29 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/columns.tsx:556
- **Код:** `<div className="bg-card border border-border/80 rounded-lg shadow-xl p-2.5 min-w-[190px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #30 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/flux-orders-kanban.tsx:71
- **Код:** `<div className="w-[320px] flex flex-col bg-muted/20 border border-border/30 rounded-3xl p-3">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #31 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:467
- **Код:** `<th scope="col" className="py-2 px-3 w-[125px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #32 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:470
- **Код:** `<th scope="col" className="py-2 px-3 w-[160px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #33 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:474
- **Код:** `<th scope="col" className="py-2 px-3 w-[130px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #34 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:477
- **Код:** `<th scope="col" className="py-2 px-3 w-[100px] text-right">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #35 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:480
- **Код:** `<th scope="col" className="py-2 px-3 w-[120px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #36 [FIXED_WIDTH_HAZARD] src/app/admin/orders/loading.tsx:58
- **Код:** `<div className="flex items-center gap-3 w-[180px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #37 [FIXED_WIDTH_HAZARD] src/app/admin/providers/import/components/wizard/WizardBulkToolbar.tsx:123
- **Код:** `<SelectTrigger className="w-[200px] h-9 text-xs">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #38 [FIXED_WIDTH_HAZARD] src/app/admin/providers/import/components/wizard/WizardProviderHeader.tsx:40
- **Код:** `<SelectTrigger className="w-[260px] h-10 text-sm font-semibold" aria-label="Выбор провайдера для импорта">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #39 [FIXED_WIDTH_HAZARD] src/app/admin/settings/balance-policies/page.tsx:205
- **Код:** `<PlanTableHeadCell className="w-[110px]">Область</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #40 [FIXED_WIDTH_HAZARD] src/app/admin/settings/balance-policies/page.tsx:207
- **Код:** `<PlanTableHeadCell className="w-[140px]">Права</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #41 [FIXED_WIDTH_HAZARD] src/app/admin/settings/team/modals/EditStaffModal.tsx:208
- **Код:** `className="font-bold gap-1.5 min-w-[110px]"`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #42 [FIXED_WIDTH_HAZARD] src/app/admin/settings/team/modals/RolePermissionsModal.tsx:230
- **Код:** `className="font-bold gap-1.5 min-w-[120px]"`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #43 [MODAL_CLIPPING] src/app/admin/settings/telegram-bot-settings.tsx:232
- **Код:** `<Dialog open={isResetWebhookModalOpen} onOpenChange={setIsResetWebhookModalOpen}>`
- **Рекомендация:** Modal Hoisting Violation: Popup rendered inside overflow-hidden parent. Hoist via Portal.


#### #44 [FIXED_WIDTH_HAZARD] src/app/admin/staff/components/staff-schedule-tab.tsx:650
- **Код:** `<div className="flex items-center gap-3 min-w-[170px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #45 [FIXED_WIDTH_HAZARD] src/app/admin/staff/staff-client.tsx:314
- **Код:** `<td className="px-4 py-3.5 align-middle min-w-[240px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #46 [FIXED_WIDTH_HAZARD] src/app/admin/tickets/components/tickets-sidebar.tsx:103
- **Код:** `className="w-full lg:w-[300px] xl:w-[340px] shrink-0 border-r border-border flex flex-col h-full overflow-hidden min-h-0 select-none bg-background min-w-0"`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #47 [FIXED_WIDTH_HAZARD] src/app/admin/tickets/components/unified-workspace.tsx:563
- **Код:** `<div className="w-[280px] xl:w-[320px] shrink-0 border-l border-border/50 h-full min-h-0 bg-card/60 backdrop-blur-md overflow-hidden animate-in slide-in-from-right duration-300 min-w-0">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #48 [FIXED_WIDTH_HAZARD] src/app/admin/transactions/loading.tsx:40
- **Код:** `<Skeleton className="h-8 flex-1 min-w-[200px] rounded-lg" />`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #49 [FIXED_WIDTH_HAZARD] src/app/admin/transactions/transactions-client.tsx:331
- **Код:** `<form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] relative">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").

