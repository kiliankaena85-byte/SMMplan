# 📐 Layout Overflow Sentry — Отчет проверки вёрстки

**Дата проведения:** 20.09.2026, 15:22:02  
**Вердикт:** **🔴 DEFECTS_DETECTED**  

---

### 📊 Статистика верстки
- **Всего замечаний:** 431
- **🔴 Высокий приоритет (High):** 49
- **🟡 Средний приоритет (Medium):** 382
- **🟢 Низкий приоритет (Low):** 0

---

### 📋 Список найденных участков


#### #1 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/dashboard/balance/BalanceDisplay.tsx:38
- **Код:** `<span className="text-[11px] sm:text-xs font-black font-mono tabular-nums tracking-tight sm:tracking-wide truncate max-w-[95px] sm:max-w-none" title={balance}>{balance}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #2 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/dashboard/classic/ClassicDashboardHome.tsx:188
- **Код:** `<span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #3 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/dashboard/classic/ClassicDashboardHome.tsx:221
- **Код:** `<span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #4 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/dashboard/classic/ClassicDashboardHome.tsx:269
- **Код:** `<span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #5 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/dashboard/classic/ClassicDashboardHome.tsx:309
- **Код:** `<span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #6 [SQUASHED_ELEMENT] src/components/dashboard/settings/api/ApiDashboardClient.tsx:62
- **Код:** `<Key className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #7 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/dashboard/settings/ProfileSummaryCard.tsx:47
- **Код:** `<p className="font-bold text-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-none" title={email}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #8 [SQUASHED_ELEMENT] src/components/dashboard/settings/ProfileSummaryCard.tsx:65
- **Код:** `<CreditCard className="w-3 h-3 text-primary" /> Баланс`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #9 [SQUASHED_ELEMENT] src/components/dashboard/settings/ProfileSummaryCard.tsx:71
- **Код:** `<TrendingUp className="w-3 h-3 text-emerald-500" /> Заказов`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #10 [SQUASHED_ELEMENT] src/components/dashboard/settings/ProfileSummaryCard.tsx:77
- **Код:** `<Star className="w-3 h-3 text-amber-500" /> Рефералов`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #11 [SQUASHED_ELEMENT] src/components/dashboard/settings/SettingsTabsClient.tsx:123
- **Код:** `<Key className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #12 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/dashboard/transactions/TransactionsClient.tsx:611
- **Код:** `<span className="truncate max-w-[170px]" title={item.reason}>{item.reason}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #13 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/orders/DesktopOrderCards.tsx:128
- **Код:** `className="text-primary hover:underline truncate max-w-[220px] font-medium"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #14 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/orders/DesktopOrderTable.tsx:146
- **Код:** `className="text-primary hover:underline text-xs max-w-[180px] truncate font-medium"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #15 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/landing/order-engine/wizard-steps/MobileCheckoutOrderSummary.tsx:81
- **Код:** `<span className="truncate flex items-center gap-2">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #16 [SQUASHED_ELEMENT] src/components/auth/FluxLoginHero.tsx:10
- **Код:** `<Sparkles className="w-6 h-6 animate-pulse" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #17 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/admin-profile-dropdown.tsx:110
- **Код:** `<span className="text-xs font-bold text-foreground leading-tight max-w-[120px] truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #18 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/admin-profile-dropdown.tsx:130
- **Код:** `<div className="text-xs font-bold text-foreground truncate" title={userEmail}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #19 [SQUASHED_ELEMENT] src/components/admin/admin-profile-dropdown.tsx:157
- **Код:** `<Keyboard className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #20 [SQUASHED_ELEMENT] src/components/admin/admin-profile-dropdown.tsx:189
- **Код:** `<LayoutGrid className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #21 [SQUASHED_ELEMENT] src/components/admin/ai-manual/sub/ManualChatMessages.tsx:36
- **Код:** `<Bot className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #22 [SQUASHED_ELEMENT] src/components/admin/ai-manual/sub/ManualChatMessages.tsx:106
- **Код:** `<User className="w-4 h-4 text-secondary-foreground" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #23 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/ai-manual/sub/ManualChatTab.tsx:141
- **Код:** `<div className="flex items-center gap-1.5 truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #24 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/ai-manual/sub/ManualChatTab.tsx:144
- **Код:** `<span className="font-mono text-foreground truncate">{pathname}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #25 [SQUASHED_ELEMENT] src/components/admin/ai-manual/sub/ManualConnectionStatus.tsx:20
- **Код:** `<Database className="w-3 h-3 animate-spin" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #26 [SQUASHED_ELEMENT] src/components/admin/ai-manual/sub/ManualFloatingTrigger.tsx:27
- **Код:** `<BookOpen className="w-3 h-3 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #27 [SQUASHED_ELEMENT] src/components/admin/ai-manual/sub/ManualGuidesTab.tsx:99
- **Код:** `<Sparkles className="w-4 h-4 animate-spin mr-2 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #28 [SQUASHED_ELEMENT] src/components/admin/ai-manual/sub/ManualGuidesTab.tsx:138
- **Код:** `<Clock className="w-3 h-3" /> ~{item.estimatedMinutes} мин`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #29 [SQUASHED_ELEMENT] src/components/admin/ai-manual/sub/ManualGuidesTab.tsx:158
- **Код:** `<BookOpen className="w-3 h-3" /> Шагов: {item.steps.length}`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #30 [SQUASHED_ELEMENT] src/components/admin/ai-manual/sub/ManualInspectorTab.tsx:125
- **Код:** `{item.category === 'ADR' && <Layers className="w-3 h-3" />}`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #31 [SQUASHED_ELEMENT] src/components/admin/ai-manual/sub/ManualInspectorTab.tsx:137
- **Код:** `<FileCode className="w-3 h-3" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #32 [SQUASHED_ELEMENT] src/components/admin/bulk-actions/BulkActionsPanel.tsx:213
- **Код:** `<ShieldAlert className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #33 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/catalog/catalog-mobile-card.tsx:83
- **Код:** `<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground truncate max-w-[120px]">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #34 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/catalog/catalog-mobile-card.tsx:166
- **Код:** `<div className="flex items-center gap-2 truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #35 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/catalog/catalog-mobile-card.tsx:167
- **Код:** `<span className="font-medium truncate max-w-[120px]" title={providerName}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #36 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/catalog/provider-service-search-modal.tsx:131
- **Код:** `<span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #37 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/catalog-table-v2.tsx:461
- **Код:** `<span className="font-semibold text-xs text-foreground truncate block" title={s.name}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #38 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/catalog-table-v2.tsx:484
- **Код:** `<span className="truncate max-w-[80px]">{networkName || '—'}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #39 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/catalog-table-v2.tsx:490
- **Код:** `<div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium truncate max-w-[120px]" title={cleanCategoryName}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #40 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/catalog-table-v2.tsx:492
- **Код:** `<span className="truncate">{cleanCategoryName}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #41 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/catalog-table-v2.tsx:499
- **Код:** `<span className="text-xs font-semibold text-foreground truncate" title={providerName}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #42 [SQUASHED_ELEMENT] src/components/admin/cms/DynamicEditor.tsx:12
- **Код:** `<Skeleton className="h-6 w-3/4 rounded-lg" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #43 [SQUASHED_ELEMENT] src/components/admin/command-palette.tsx:69
- **Код:** `<Search className="w-5 h-5 text-primary mr-3 animate-pulse" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #44 [SQUASHED_ELEMENT] src/components/admin/dashboard/executive-ai-digest-card.tsx:147
- **Код:** `<RefreshCw className="w-4 h-4 animate-spin text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #45 [SQUASHED_ELEMENT] src/components/admin/EnvironmentModeSwitcher.tsx:194
- **Код:** `<Icon className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #46 [SQUASHED_ELEMENT] src/components/admin/finance/manual-payment-approval-modal.tsx:101
- **Код:** `<ShieldCheck className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #47 [SQUASHED_ELEMENT] src/components/admin/finance/treasury/accounting-causality-feed.tsx:16
- **Код:** `<FileText className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #48 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/finance/treasury/liquidity-waterfall-bar.tsx:72
- **Код:** `<span className="text-muted-foreground truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #49 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/finance/treasury/liquidity-waterfall-bar.tsx:78
- **Код:** `<span className="text-muted-foreground truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #50 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/finance/treasury/liquidity-waterfall-bar.tsx:84
- **Код:** `<span className="text-muted-foreground truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #51 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/finance/treasury/liquidity-waterfall-bar.tsx:90
- **Код:** `<span className="text-muted-foreground truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #52 [SQUASHED_ELEMENT] src/components/admin/finance/treasury/reconciliation-controller.tsx:29
- **Код:** `<SlidersHorizontal className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #53 [SQUASHED_ELEMENT] src/components/admin/finance/treasury/safe-owner-draw-hero.tsx:43
- **Код:** `{isSolvent && <ShieldCheck className="w-4 h-4 text-emerald-500" />}`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #54 [SQUASHED_ELEMENT] src/components/admin/finance/treasury/safe-owner-draw-hero.tsx:95
- **Код:** `<ShieldCheck className="w-4 h-4 text-emerald-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #55 [DOM_NESTING_VIOLATION] src/components/admin/icon-picker/IconPicker.tsx:167
- **Код:** `<button
              type="button"
              onClick={handleClear}
              className="`
- **Рекомендация:** Invalid DOM Nesting: <button> inside <button>. Use asChild or separate action buttons.


#### #56 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/icon-picker/IconPicker.tsx:132
- **Код:** `<span className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #57 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/icon-picker/IconPicker.tsx:158
- **Код:** `<span className="text-xs font-medium text-foreground truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #58 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/icon-picker/IconPicker.tsx:161
- **Код:** `<span className="text-[11px] text-muted-foreground truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #59 [SQUASHED_ELEMENT] src/components/admin/icon-picker/IconPicker.tsx:206
- **Код:** `<Sparkles className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #60 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/manual/interactive-textbook/InteractiveCallout.tsx:114
- **Код:** `<code className="text-[11px] font-mono text-foreground truncate select-all">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #61 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveDiagram.tsx:19
- **Код:** `<Cpu className="w-4 h-4 text-blue-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #62 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveDiagram.tsx:56
- **Код:** `<Zap className="w-4 h-4 text-emerald-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #63 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveDiagram.tsx:95
- **Код:** `<Database className="w-4 h-4 text-teal-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #64 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveDiagram.tsx:136
- **Код:** `<Headphones className="w-4 h-4 text-violet-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #65 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveDiagram.tsx:185
- **Код:** `<Send className="w-3 h-3" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #66 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveDiagram.tsx:198
- **Код:** `<Settings className="w-4 h-4 text-slate-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #67 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveDiagram.tsx:206
- **Код:** `<div className="flex justify-center"><Lock className="w-4 h-4 text-slate-500" /></div>`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #68 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveDiagram.tsx:212
- **Код:** `<div className="flex justify-center"><Send className="w-4 h-4 text-sky-500" /></div>`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #69 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveDiagram.tsx:218
- **Код:** `<div className="flex justify-center"><ShieldCheck className="w-4 h-4 text-purple-500" /></div>`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #70 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveDiagram.tsx:224
- **Код:** `<div className="flex justify-center"><AlertTriangle className="w-4 h-4 text-rose-500" /></div>`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #71 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveDiagram.tsx:239
- **Код:** `<AlertTriangle className="w-4 h-4 text-rose-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #72 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveErrorCodeLookup.tsx:411
- **Код:** `<HelpCircle className="w-5 h-5 text-indigo-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #73 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveRegexLookup.tsx:122
- **Код:** `<ShieldCheck className="w-5 h-5 text-emerald-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #74 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/manual/interactive-textbook/InteractiveScreenshotViewer.tsx:116
- **Код:** `<span className="text-xs font-bold truncate pr-4">{screenshot.caption}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #75 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/InteractiveTextbook.tsx:247
- **Код:** `<Clock className="w-3 h-3" /> {ch.readTimeMinutes}м`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #76 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/manual/interactive-textbook/InteractiveTextbook.tsx:250
- **Код:** `<div className="text-xs font-bold text-foreground truncate">{ch.title}</div>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #77 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/manual/interactive-textbook/InteractiveTextbook.tsx:251
- **Код:** `<p className="text-[11px] text-muted-foreground truncate mt-0.5">{ch.subtitle}</p>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #78 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/TextbookChapterViewer.tsx:150
- **Код:** `<BookOpen className="w-4 h-4 text-primary" /> 1. Область применения и назначение`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #79 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/TextbookChapterViewer.tsx:160
- **Код:** `<Layers className="w-4 h-4 text-indigo-500" /> 2. Термины и определения`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #80 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/TextbookChapterViewer.tsx:175
- **Код:** `<ShieldCheck className="w-4 h-4 text-blue-500" /> 3. Архитектура и системные связи`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #81 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/TextbookChapterViewer.tsx:222
- **Код:** `<ShieldCheck className="w-4 h-4 text-emerald-500" /> 5. Нестандартные и защитные функции`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #82 [SQUASHED_ELEMENT] src/components/admin/manual/interactive-textbook/TextbookChapterViewer.tsx:239
- **Код:** `<AlertOctagon className="w-4 h-4 text-rose-500" /> 6. Диагностика сбоев и план восстановления`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #83 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/mobile-nav-drawer.tsx:159
- **Код:** `<span className="flex-1 truncate">{item.label}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #84 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/order-details/OrderDetailsHeader.tsx:36
- **Код:** `<h2 className="text-base font-extrabold text-foreground tracking-tight truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #85 [SQUASHED_ELEMENT] src/components/admin/order-details/OrderFailoverSection.tsx:44
- **Код:** `<Zap className="w-4 h-4 text-amber-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #86 [SQUASHED_ELEMENT] src/components/admin/OrderDetailsModal.tsx:376
- **Код:** `<ShieldAlert className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #87 [SQUASHED_ELEMENT] src/components/admin/settings/audit-logs-tab.tsx:124
- **Код:** `<Terminal className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #88 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/settings/onboarding-readiness-bar.tsx:198
- **Код:** `<span className="text-xs font-bold text-foreground truncate">{step.title}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #89 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/settings/settings-cluster-tabs.tsx:67
- **Код:** `<span className="text-xs uppercase tracking-wider truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #90 [SQUASHED_ELEMENT] src/components/admin/settings/system-health-overview.tsx:139
- **Код:** `<AlertTriangle className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #91 [SQUASHED_ELEMENT] src/components/admin/settings/system-health-overview.tsx:144
- **Код:** `<HelpCircle className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #92 [SQUASHED_ELEMENT] src/components/admin/settings/system-health-overview.tsx:149
- **Код:** `<ShieldCheck className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #93 [SQUASHED_ELEMENT] src/components/admin/settings/system-health-overview.tsx:162
- **Код:** `<CreditCard className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #94 [SQUASHED_ELEMENT] src/components/admin/settings/system-health-overview.tsx:201
- **Код:** `<Mail className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #95 [SQUASHED_ELEMENT] src/components/admin/settings/system-health-overview.tsx:232
- **Код:** `<Bot className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #96 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/settings/system-health-overview.tsx:252
- **Код:** `<span className="text-foreground font-bold truncate max-w-[100px]" title={settings.geminiProxy || 'Прямое / Clash'}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #97 [SQUASHED_ELEMENT] src/components/admin/settings/system-health-overview.tsx:263
- **Код:** `<RefreshCw className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #98 [SQUASHED_ELEMENT] src/components/admin/settings/system-health-overview.tsx:338
- **Код:** `<AlertTriangle className="w-3 h-3" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #99 [SQUASHED_ELEMENT] src/components/admin/shortcuts-modal.tsx:45
- **Код:** `<Keyboard className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #100 [SQUASHED_ELEMENT] src/components/admin/shortcuts-modal.tsx:69
- **Код:** `<Sliders className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #101 [FIXED_WIDTH_HAZARD] src/components/admin/sidebar.tsx:120
- **Код:** `collapsed ? "w-16" : "w-[280px]"`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #102 [SQUASHED_ELEMENT] src/components/admin/sidebar.tsx:173
- **Код:** `<Star className="w-3 h-3 fill-warning/20" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #103 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/sidebar.tsx:200
- **Код:** `{!collapsed && <span className="tracking-wide flex-1 truncate">{tab.label}</span>}`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #104 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/sidebar.tsx:266
- **Код:** `{!collapsed && <span className="tracking-wide flex-1 truncate">{tab.label}</span>}`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #105 [SQUASHED_ELEMENT] src/components/admin/submit-button.tsx:58
- **Код:** `<svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #106 [SQUASHED_ELEMENT] src/components/admin/SupportReviewDashboard.tsx:103
- **Код:** `<Filter className="w-4 h-4 text-muted-foreground" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #107 [FIXED_WIDTH_HAZARD] src/components/admin/tenant-selector.tsx:38
- **Код:** `<SelectTrigger size="sm" className="w-[180px] bg-background/60 backdrop-blur-md border-border/40 font-semibold shadow-sm transition-all duration-200">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #108 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/tenant-switcher.tsx:161
- **Код:** `<span className="font-black text-foreground tracking-tight max-w-[85px] sm:max-w-none truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #109 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/components/admin/tenant-switcher.tsx:211
- **Код:** `<span className="text-xs font-extrabold truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #110 [SQUASHED_ELEMENT] src/components/admin/tenant-switcher.tsx:223
- **Код:** `<Check className="w-3 h-3 stroke-[3]" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #111 [SQUASHED_ELEMENT] src/app/admin/analytics/ai-funnel-advisor.tsx:83
- **Код:** `<Sparkles className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #112 [SQUASHED_ELEMENT] src/app/admin/analytics/ai-funnel-advisor.tsx:183
- **Код:** `<HelpCircle className="w-3 h-3" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #113 [SQUASHED_ELEMENT] src/app/admin/analytics/ltv-charts.tsx:50
- **Код:** `<TrendingUp className="w-3 h-3 text-success" /> Доля топ 10%`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #114 [SQUASHED_ELEMENT] src/app/admin/catalog/categories/components/sub/CategoryMergeModal.tsx:80
- **Код:** `<GitMerge className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #115 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/catalog/categories/components/sub/CategoryMobileCard.tsx:34
- **Код:** `<span className="font-bold text-foreground text-xs truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #116 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/catalog/categories/components/sub/CategoryMobileCard.tsx:37
- **Код:** `<span className="text-[10px] text-muted-foreground font-mono truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #117 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/catalog/categories/components/sub/CategoryTable.tsx:117
- **Код:** `<span className="font-bold text-foreground text-xs truncate">{cleanCategoryName(c.name)}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #118 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/catalog/categories/components/sub/CategoryTable.tsx:119
- **Код:** `<span className="text-[10px] text-amber-500 font-medium truncate max-w-xs" title={c.warningMessage || ''}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #119 [SQUASHED_ELEMENT] src/app/admin/catalog/categories/components/sub/NetworkEditModal.tsx:100
- **Код:** `<Globe className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #120 [SQUASHED_ELEMENT] src/app/admin/catalog/components/service-edit-form.tsx:344
- **Код:** `<Layers className="w-4 h-4 text-primary" /> Основные параметры`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #121 [SQUASHED_ELEMENT] src/app/admin/catalog/components/service-edit-form.tsx:374
- **Код:** `<Plus className="w-3 h-3" /> Создать категорию`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #122 [SQUASHED_ELEMENT] src/app/admin/catalog/components/service-edit-form.tsx:461
- **Код:** `<ShieldCheck className="w-4 h-4 text-primary" /> Лимиты и опции`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #123 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/catalog/networks/components/NetworkMobileCard.tsx:45
- **Код:** `<span className="text-sm font-bold text-foreground truncate">{network.name}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #124 [SQUASHED_ELEMENT] src/app/admin/catalog/networks/networks-client.tsx:136
- **Код:** `<Globe className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #125 [SQUASHED_ELEMENT] src/app/admin/catalog/patterns/patterns-client.tsx:251
- **Код:** `<Filter className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #126 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/catalog/patterns/patterns-client.tsx:314
- **Код:** `<td className="px-4 py-3 font-mono text-[11px] text-foreground max-w-md truncate" title={pattern.pattern}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #127 [SQUASHED_ELEMENT] src/app/admin/catalog/patterns/patterns-client.tsx:438
- **Код:** `<Sparkles className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #128 [SQUASHED_ELEMENT] src/app/admin/catalog/patterns/patterns-client.tsx:498
- **Код:** `<XCircle className="w-4 h-4" /> Ссылка не соответствует паттерну`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #129 [SQUASHED_ELEMENT] src/app/admin/catalog/patterns/patterns-client.tsx:556
- **Код:** `<AlertTriangle className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #130 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/components/client-quick-sort.tsx:131
- **Код:** `<span className="font-bold truncate max-w-[160px]">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #131 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/components/columns.tsx:49
- **Код:** `<div className="flex items-center gap-1.5 truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #132 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/components/columns.tsx:52
- **Код:** `className="text-primary hover:text-primary/80 font-mono font-bold text-[13px] transition-colors hover:underline underline-offset-4 truncate"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #133 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/components/columns.tsx:66
- **Код:** `<span className="inline-flex items-center gap-0.5 text-[10px] text-primary/80 shrink-0 truncate max-w-[90px]" title={u.telegramId}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #134 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/components/columns.tsx:71
- **Код:** `<span className="text-[10px] text-foreground font-medium truncate max-w-[100px]" title={u.companyName}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #135 [SQUASHED_ELEMENT] src/app/admin/clients/loading.tsx:53
- **Код:** `<Skeleton className="h-4 w-32 rounded-md" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #136 [SQUASHED_ELEMENT] src/app/admin/clients/loading.tsx:64
- **Код:** `<Skeleton className="h-4 w-36 rounded-md" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #137 [SQUASHED_ELEMENT] src/app/admin/clients/loading.tsx:78
- **Код:** `<Skeleton className="h-4 w-36 rounded-md" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #138 [SQUASHED_ELEMENT] src/app/admin/clients/page.tsx:168
- **Код:** `<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #139 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/[id]/client-orders-table.tsx:100
- **Код:** `<span className="text-[11px] text-muted-foreground block truncate max-w-[200px]" title={o.service.name}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #140 [SQUASHED_ELEMENT] src/app/admin/clients/[id]/components/client-ledger-modal.tsx:68
- **Код:** `<BookOpen className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #141 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/[id]/components/client-ledger-table.tsx:223
- **Код:** `className="px-1.5 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/50 text-[10px] font-bold truncate max-w-[120px] inline-block select-all"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #142 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/[id]/components/client-ledger-table.tsx:258
- **Код:** `<td className="py-2.5 px-3 text-foreground text-xs font-medium max-w-[280px] truncate" title={item.reason}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #143 [SQUASHED_ELEMENT] src/app/admin/clients/[id]/components/client-notes-manager.tsx:133
- **Код:** `<Clock className="w-3 h-3" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #144 [SQUASHED_ELEMENT] src/app/admin/clients/[id]/components/client-notes-manager.tsx:157
- **Код:** `<User className="w-3 h-3" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #145 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/[id]/components/client-notes-manager.tsx:159
- **Код:** `<span className="text-[11px] font-bold text-foreground truncate max-w-[130px]" title={item.authorEmail || 'Оператор'}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #146 [SQUASHED_ELEMENT] src/app/admin/clients/[id]/components/client-payments-modal.tsx:79
- **Код:** `<CreditCard className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #147 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/[id]/components/client-payments-modal.tsx:158
- **Код:** `<td className="px-3.5 py-2.5 font-mono text-[11px] text-muted-foreground truncate max-w-[160px]" title={p.gatewayId || p.id}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #148 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/[id]/page.tsx:330
- **Код:** `<span className="text-foreground font-medium truncate max-w-[300px]">{user.email}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #149 [SQUASHED_ELEMENT] src/app/admin/clients/[id]/support-command-center.tsx:247
- **Код:** `<Percent className="w-3 h-3" /> Персональная скидка`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #150 [SQUASHED_ELEMENT] src/app/admin/clients/[id]/support-command-center.tsx:299
- **Код:** `<Globe className="w-3 h-3" /> {lastLog.ipAddress}`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #151 [SQUASHED_ELEMENT] src/app/admin/clients/[id]/support-command-center.tsx:324
- **Код:** `<KeyRound className="w-3 h-3" /> Новый пароль`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #152 [SQUASHED_ELEMENT] src/app/admin/clients/[id]/support-command-center.tsx:328
- **Код:** `<Sparkles className="w-3 h-3" /> Сгенерировать`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #153 [SQUASHED_ELEMENT] src/app/admin/clients/[id]/support-command-center.tsx:370
- **Код:** `<ShoppingBag className="w-3 h-3" /> Последние заказы`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #154 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/[id]/support-command-center.tsx:375
- **Код:** `<div className="text-xs font-medium text-foreground truncate max-w-[155px]">#{o.numericId} {o.serviceName}</div>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #155 [SQUASHED_ELEMENT] src/app/admin/clients/[id]/support-command-center.tsx:386
- **Код:** `<TrendingUp className="w-3 h-3" /> Все {user.ordersCount} заказов →`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #156 [SQUASHED_ELEMENT] src/app/admin/clients/[id]/tabs/balance-equation-card.tsx:70
- **Код:** `<AlertTriangle className="w-4 h-4" /> Внимание: списание превышает`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #157 [SQUASHED_ELEMENT] src/app/admin/clients/[id]/tabs/balance-snapshot-panel.tsx:39
- **Код:** `<CreditCard className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #158 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/clients/[id]/tabs/payments-refund-modal.tsx:105
- **Код:** `<span className="font-bold text-foreground truncate max-w-[180px]">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #159 [SQUASHED_ELEMENT] src/app/admin/dashboard/FinancialEscalationWidget.tsx:23
- **Код:** `<ShieldCheck className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #160 [SQUASHED_ELEMENT] src/app/admin/dashboard/loading.tsx:30
- **Код:** `<Skeleton className="h-5 w-64 rounded-md" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #161 [FIXED_WIDTH_HAZARD] src/app/admin/dashboard/orders-chart.tsx:226
- **Код:** `<div className="bg-card text-card-foreground border border-border/80 rounded-lg p-3 shadow-xl text-xs space-y-1.5 min-w-[170px] select-none font-sans">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #162 [SQUASHED_ELEMENT] src/app/admin/dashboard/PeriodSelector.tsx:43
- **Код:** `<Calendar className="w-4 h-4 text-muted-foreground" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #163 [SQUASHED_ELEMENT] src/app/admin/dashboard/ProviderLiquidityWidget.tsx:122
- **Код:** `<TrendingDown className="w-3 h-3" /> Требует пополнения`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #164 [SQUASHED_ELEMENT] src/app/admin/dashboard/ProviderLiquidityWidget.tsx:126
- **Код:** `<TrendingUp className="w-3 h-3" /> В норме`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #165 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/dashboard/RecentOrdersFeedWidget.tsx:113
- **Код:** `<div className="text-[10px] text-muted-foreground flex items-center gap-1.5 truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #166 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/dashboard/RecentOrdersFeedWidget.tsx:118
- **Код:** `<span className="truncate">{o.user.email}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #167 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/dashboard/RefundMonitorWidget.tsx:82
- **Код:** `<span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #168 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/dashboard/RefundMonitorWidget.tsx:93
- **Код:** `<span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #169 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/dashboard/RefundMonitorWidget.tsx:104
- **Код:** `<span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #170 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/dashboard/RefundMonitorWidget.tsx:107
- **Код:** `<span className="font-mono font-extrabold text-foreground text-sm sm:text-base mt-1 tabular-nums truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #171 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/dashboard/RefundMonitorWidget.tsx:140
- **Код:** `<span className="font-semibold text-foreground truncate block text-[11px]" title={fs.name}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #172 [SQUASHED_ELEMENT] src/app/admin/dashboard/StormRadarWidget.tsx:62
- **Код:** `<ShieldCheck className="w-3 h-3 text-emerald-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #173 [SQUASHED_ELEMENT] src/app/admin/dashboard/StormRadarWidget.tsx:96
- **Код:** `<ShieldCheck className="w-4 h-4 text-emerald-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #174 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/dashboard/TopServicesWidget.tsx:66
- **Код:** `<div className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-[260px]" title={s.name}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #175 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/dashboard/TopSpendersWidget.tsx:70
- **Код:** `className="font-semibold text-foreground hover:text-primary transition-colors truncate max-w-[180px] sm:max-w-[220px]"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #176 [SQUASHED_ELEMENT] src/app/admin/dashboard/WebhookLatencyWidget.tsx:29
- **Код:** `<CreditCard className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #177 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/dashboard/WebhookLatencyWidget.tsx:50
- **Код:** `<div className="font-semibold text-foreground truncate text-[11px]">{gw.name}</div>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #178 [SQUASHED_ELEMENT] src/app/admin/docs/order-statuses/page.tsx:192
- **Код:** `<XCircle className="w-4 h-4 text-rose-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #179 [SQUASHED_ELEMENT] src/app/admin/docs/order-statuses/page.tsx:229
- **Код:** `<AlertOctagon className="w-4 h-4 text-red-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #180 [SQUASHED_ELEMENT] src/app/admin/docs/order-statuses/page.tsx:265
- **Код:** `<Zap className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #181 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:342
- **Код:** `<th className="py-3 px-4 w-[160px]">Статус</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #182 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:343
- **Код:** `<th className="py-3 px-4 w-[140px]">Кто выставляет</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #183 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:344
- **Код:** `<th className="py-3 px-4 w-[130px]">Баланс клиента</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #184 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:345
- **Код:** `<th className="py-3 px-4 min-w-[240px]">Техническое описание</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #185 [FIXED_WIDTH_HAZARD] src/app/admin/docs/order-statuses/page.tsx:346
- **Код:** `<th className="py-3 px-4 min-w-[260px]">Что отвечать клиенту</th>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #186 [SQUASHED_ELEMENT] src/app/admin/docs/order-statuses/page.tsx:408
- **Код:** `<ShieldAlert className="w-4 h-4 text-rose-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #187 [SQUASHED_ELEMENT] src/app/admin/economics/recommendations/recommendations-client.tsx:173
- **Код:** `<TrendingUp className="w-4 h-4 text-emerald-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #188 [SQUASHED_ELEMENT] src/app/admin/economics/recommendations/recommendations-client.tsx:186
- **Код:** `<AlertTriangle className="w-4 h-4 text-amber-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #189 [SQUASHED_ELEMENT] src/app/admin/economics/recommendations/recommendations-client.tsx:199
- **Код:** `<ShieldCheck className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #190 [SQUASHED_ELEMENT] src/app/admin/economics/recommendations/recommendations-client.tsx:215
- **Код:** `<CheckCheck className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #191 [SQUASHED_ELEMENT] src/app/admin/economics/recommendations/recommendations-client.tsx:313
- **Код:** `<Clock className="w-3 h-3" /> Ожидает`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #192 [SQUASHED_ELEMENT] src/app/admin/economics/recommendations/recommendations-client.tsx:318
- **Код:** `<Check className="w-3 h-3" /> Принято`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #193 [SQUASHED_ELEMENT] src/app/admin/economics/recommendations/recommendations-client.tsx:365
- **Код:** `<AlertTriangle className="w-4 h-4 text-destructive" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #194 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:201
- **Код:** `<SelectTrigger className="w-[160px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #195 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:222
- **Код:** `<SelectTrigger className="w-[150px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #196 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:258
- **Код:** `<PlanTableHeadCell className="w-[105px]">ID / Дата</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #197 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:262
- **Код:** `<PlanTableHeadCell className="w-[110px] text-right">Сумма</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #198 [FIXED_WIDTH_HAZARD] src/app/admin/finance/balance-requests/balance-requests-client.tsx:264
- **Код:** `<PlanTableHeadCell className="w-[115px]">Статус</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #199 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/balance-requests/balance-requests-client.tsx:329
- **Код:** `<span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1 truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #200 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/balance-requests/balance-requests-client.tsx:333
- **Код:** `<span className={`text-xs font-bold font-mono truncate ${isCredit ? 'text-success' : 'text-destructive'}`}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #201 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/components/finance-helpers.tsx:114
- **Код:** `<div className="text-xs font-bold font-mono truncate">{item.userEmail}</div>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #202 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/components/finance-helpers.tsx:116
- **Код:** `<span className="text-[10px] text-muted-foreground font-mono truncate max-w-[130px]" title={displayId}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #203 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/components/finance-helpers.tsx:176
- **Код:** `<div className="text-xs font-bold font-mono truncate">{item.userEmail}</div>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #204 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/components/finance-helpers.tsx:178
- **Код:** `<span className="text-[10px] text-muted-foreground font-mono truncate max-w-[130px]" title={item.id}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #205 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/finance-ledger-tab.tsx:244
- **Код:** `<SelectTrigger className="w-[180px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #206 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/finance-ledger-tab.tsx:260
- **Код:** `<SelectTrigger className="w-[130px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #207 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/finance-ledger-tab.tsx:276
- **Код:** `<SelectTrigger className="w-[140px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #208 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/finance-payments-tab.tsx:165
- **Код:** `<SelectTrigger className="w-[130px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #209 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/finance-payments-tab.tsx:181
- **Код:** `<SelectTrigger className="w-[140px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #210 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/finance-payments-tab.tsx:197
- **Код:** `<SelectTrigger className="w-[130px] h-9 text-xs" size="sm">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #211 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/components/ledger-audit-drawer.tsx:143
- **Код:** `<h2 id="audit-drawer-title" className="text-lg font-bold text-foreground truncate tracking-tight">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #212 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/components/ledger-audit-drawer.tsx:157
- **Код:** `<span className="font-mono font-medium text-foreground truncate">{user.email}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #213 [SQUASHED_ELEMENT] src/app/admin/finance/components/reconciliation-tab.tsx:212
- **Код:** `<Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #214 [FIXED_WIDTH_HAZARD] src/app/admin/finance/components/reconciliation-tab.tsx:302
- **Код:** `<PlanTableHeadCell className="w-[100px]">Статус</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #215 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/components/reconciliation-tab.tsx:332
- **Код:** `className="text-primary hover:text-primary/80 hover:underline font-mono text-xs font-semibold truncate block w-full transition-colors"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #216 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/components/reconciliation-tab.tsx:341
- **Код:** `className="text-[10px] text-muted-foreground font-mono truncate"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #217 [SQUASHED_ELEMENT] src/app/admin/finance/finance-client.tsx:75
- **Код:** `<Landmark className="w-5 h-5 text-red-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #218 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/finance-client.tsx:84
- **Код:** `<p className="text-[11px] text-muted-foreground mt-0.5 truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #219 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/ledger-columns.tsx:78
- **Код:** `className="text-primary hover:text-primary/80 hover:underline font-mono text-xs font-semibold truncate block transition-colors"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #220 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/ledger-columns.tsx:85
- **Код:** `className="text-[10px] text-muted-foreground font-mono truncate"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #221 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/ledger-columns.tsx:134
- **Код:** `<span className="text-xs text-foreground font-medium truncate block w-full leading-relaxed" title={row.original.reason}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #222 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/ledger-columns.tsx:137
- **Код:** `<span className="text-[10px] text-muted-foreground font-medium truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #223 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/payment-columns.tsx:73
- **Код:** `className="text-primary hover:text-primary/80 hover:underline font-mono text-xs font-semibold truncate block transition-colors"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #224 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/finance/payment-columns.tsx:80
- **Код:** `className="text-[10px] text-muted-foreground font-mono truncate"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #225 [FIXED_WIDTH_HAZARD] src/app/admin/finance/payments/[id]/dispute-pack/page.tsx:326
- **Код:** `<div className="w-full lg:w-[400px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-border/60 p-8 flex flex-col justify-between shrink-0 no-print z-20">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #226 [SQUASHED_ELEMENT] src/app/admin/finance/payments/[id]/dispute-pack/page.tsx:341
- **Код:** `<ShieldCheck className="w-6 h-6" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #227 [SQUASHED_ELEMENT] src/app/admin/finance/payments/[id]/dispute-pack/page.tsx:357
- **Код:** `<HelpCircle className="w-4 h-4 text-sky-400" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #228 [SQUASHED_ELEMENT] src/app/admin/fraud-monitor/fraud-monitor-client.tsx:265
- **Код:** `<Terminal className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #229 [SQUASHED_ELEMENT] src/app/admin/fraud-monitor/fraud-monitor-client.tsx:393
- **Код:** `<Lock className="w-4 h-4 text-amber-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #230 [SQUASHED_ELEMENT] src/app/admin/fraud-monitor/fraud-monitor-client.tsx:413
- **Код:** `<Terminal className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #231 [SQUASHED_ELEMENT] src/app/admin/knowledge/ArticleForm.tsx:398
- **Код:** `<CheckCircle className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #232 [SQUASHED_ELEMENT] src/app/admin/manual/academy-client.tsx:317
- **Код:** `<Award className="w-4 h-4 text-amber-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #233 [SQUASHED_ELEMENT] src/app/admin/manual/academy-client.tsx:336
- **Код:** `<AlertTriangle className="w-4 h-4 text-rose-500" /> 🚨 SOS-Памятка Новичка: Первый день на смене (3 минуты)`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #234 [SQUASHED_ELEMENT] src/app/admin/manual/academy-client.tsx:390
- **Код:** `<Sparkles className="w-4 h-4 text-primary" /> Экспресс-Гид: Как работать с Академией`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #235 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/manual/academy-client.tsx:731
- **Код:** `<span className="text-xs font-bold truncate text-foreground">{sc.title}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #236 [SQUASHED_ELEMENT] src/app/admin/manual/academy-client.tsx:867
- **Код:** `{opt.isCorrect ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #237 [SQUASHED_ELEMENT] src/app/admin/manual/academy-client.tsx:904
- **Код:** `<Check className="w-4 h-4" /> Эталонный ответ клиенту (Legal & Marketing Symbiosis):`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #238 [SQUASHED_ELEMENT] src/app/admin/manual/academy-client.tsx:960
- **Код:** `<Compass className="w-5 h-5 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #239 [SQUASHED_ELEMENT] src/app/admin/manual/academy-client.tsx:972
- **Код:** `<UserCheck className="w-4 h-4 text-primary" /> 1. Сегмент клиента (LTV)`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #240 [SQUASHED_ELEMENT] src/app/admin/manual/academy-client.tsx:1000
- **Код:** `<ShieldCheck className="w-4 h-4 text-primary" /> 2. Тариф услуги`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #241 [SQUASHED_ELEMENT] src/app/admin/manual/academy-client.tsx:1026
- **Код:** `<AlertTriangle className="w-4 h-4 text-primary" /> 3. Суть обращения`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #242 [SQUASHED_ELEMENT] src/app/admin/manual/academy-client.tsx:1099
- **Код:** `<Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #243 [SQUASHED_ELEMENT] src/app/admin/manual/academy-client.tsx:1125
- **Код:** `<Zap className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #244 [SQUASHED_ELEMENT] src/app/admin/marketing/create-promo-form.tsx:192
- **Код:** `<Plus className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #245 [SQUASHED_ELEMENT] src/app/admin/marketing/loading.tsx:30
- **Код:** `<Skeleton className="h-4 w-40 rounded-md" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #246 [SQUASHED_ELEMENT] src/app/admin/marketing/loading.tsx:52
- **Код:** `<Skeleton className="h-4 w-32 rounded-md" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #247 [SQUASHED_ELEMENT] src/app/admin/marketing/page.tsx:123
- **Код:** `<TrendingUp className="w-4 h-4 text-success" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #248 [SQUASHED_ELEMENT] src/app/admin/marketing/page.tsx:135
- **Код:** `<Users className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #249 [FIXED_WIDTH_HAZARD] src/app/admin/marketing/promocode-table.tsx:29
- **Код:** `<div className="flex flex-col gap-1.5 min-w-[150px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #250 [FIXED_WIDTH_HAZARD] src/app/admin/marketing/promocode-table.tsx:55
- **Код:** `<div className="flex flex-col gap-1.5 min-w-[150px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #251 [FIXED_WIDTH_HAZARD] src/app/admin/marketing/promocode-table.tsx:89
- **Код:** `<div className="flex flex-col gap-1.5 min-w-[150px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #252 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/columns.tsx:192
- **Код:** `<div className="p-2.5 space-y-2 min-w-[180px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #253 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/columns.tsx:436
- **Код:** `<div className="flex flex-col text-xs leading-normal py-1 space-y-1 min-w-[130px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #254 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/columns.tsx:531
- **Код:** `<div className="flex flex-col gap-1 py-1 whitespace-nowrap min-w-[110px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #255 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/columns.tsx:556
- **Код:** `<div className="bg-card border border-border/80 rounded-lg shadow-xl p-2.5 min-w-[190px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #256 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/orders/components/filter-dropdown.tsx:73
- **Код:** `<span className="truncate flex items-center gap-1.5 text-foreground">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #257 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/orders/components/filter-dropdown.tsx:75
- **Код:** `<span className="truncate">{displayLabel}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #258 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/orders/components/filter-dropdown.tsx:105
- **Код:** `<span className="truncate">{opt.label}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #259 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/orders/components/flux-orders-grid.tsx:83
- **Код:** `<span className="text-[10px] font-bold text-muted-foreground truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #260 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/orders/components/flux-orders-grid.tsx:121
- **Код:** `className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors truncate max-w-[150px]"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #261 [SQUASHED_ELEMENT] src/app/admin/orders/components/flux-orders-kanban.tsx:41
- **Код:** `<Filter className="w-4 h-4 text-muted-foreground" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #262 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/flux-orders-kanban.tsx:71
- **Код:** `<div className="w-[320px] flex flex-col bg-muted/20 border border-border/30 rounded-3xl p-3">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #263 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:467
- **Код:** `<th scope="col" className="py-2 px-3 w-[125px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #264 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:470
- **Код:** `<th scope="col" className="py-2 px-3 w-[160px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #265 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:474
- **Код:** `<th scope="col" className="py-2 px-3 w-[130px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #266 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:477
- **Код:** `<th scope="col" className="py-2 px-3 w-[100px] text-right">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #267 [FIXED_WIDTH_HAZARD] src/app/admin/orders/components/order-client.tsx:480
- **Код:** `<th scope="col" className="py-2 px-3 w-[120px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #268 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/orders/components/order-client.tsx:686
- **Код:** `className="font-semibold text-primary hover:underline truncate max-w-[200px]"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #269 [SQUASHED_ELEMENT] src/app/admin/orders/loading.tsx:52
- **Код:** `<Skeleton className="h-5 w-44 rounded-md" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #270 [FIXED_WIDTH_HAZARD] src/app/admin/orders/loading.tsx:58
- **Код:** `<div className="flex items-center gap-3 w-[180px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #271 [SQUASHED_ELEMENT] src/app/admin/orders/[id]/order-standalone-view.tsx:322
- **Код:** `<Zap className="w-4 h-4 text-amber-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #272 [SQUASHED_ELEMENT] src/app/admin/orders/[id]/order-standalone-view.tsx:447
- **Код:** `<User className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #273 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/orders/[id]/order-standalone-view.tsx:466
- **Код:** `className="font-mono text-xs text-primary hover:underline break-all truncate font-semibold"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #274 [SQUASHED_ELEMENT] src/app/admin/orders/[id]/order-standalone-view.tsx:507
- **Код:** `<TrendingUp className="w-4 h-4 text-emerald-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #275 [SQUASHED_ELEMENT] src/app/admin/orders/[id]/order-standalone-view.tsx:551
- **Код:** `<Layers className="w-4 h-4 text-sky-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #276 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/orders/[id]/order-standalone-view.tsx:571
- **Код:** `<span className="text-[11px] text-muted-foreground truncate block">Для оператора поддержки</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #277 [SQUASHED_ELEMENT] src/app/admin/providers/components/sub/ProviderCatalogPreviewModal.tsx:43
- **Код:** `<Layers className="w-5 h-5 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #278 [SQUASHED_ELEMENT] src/app/admin/providers/components/sub/ProviderCredentialsSection.tsx:150
- **Код:** `{probeResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #279 [SQUASHED_ELEMENT] src/app/admin/providers/components/sync-provider-button.tsx:44
- **Код:** `<RefreshCw className="h-3 w-3 animate-spin" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #280 [SQUASHED_ELEMENT] src/app/admin/providers/components/sync-provider-button.tsx:49
- **Код:** `<RefreshCw className="h-3 w-3" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #281 [SQUASHED_ELEMENT] src/app/admin/providers/components/table/providers-table-empty.tsx:24
- **Код:** `<SlidersHorizontal className="w-6 h-6" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #282 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/providers/components/table/providers-table-mobile-card.tsx:38
- **Код:** `<span className="font-bold text-foreground text-sm truncate" title={provider.name}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #283 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/providers/components/table/providers-table-mobile-card.tsx:54
- **Код:** `<span className="text-muted-foreground/70 font-mono text-[10px] truncate max-w-[200px]" title={provider.apiUrl}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #284 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/providers/components/table/providers-table-row.tsx:42
- **Код:** `<span className="font-semibold text-foreground group-hover:text-primary transition-colors text-xs truncate max-w-[220px]" title={provider.name}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #285 [SQUASHED_ELEMENT] src/app/admin/providers/components/table/providers-table-row.tsx:47
- **Код:** `<LifeBuoy className="w-3 h-3 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #286 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/providers/components/table/providers-table-row.tsx:52
- **Код:** `<span className="text-muted-foreground/70 font-mono text-[10px] truncate max-w-[180px]" title={provider.apiUrl}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #287 [SQUASHED_ELEMENT] src/app/admin/providers/components/table/providers-table-row.tsx:56
- **Код:** `{copiedId === provider.id ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #288 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/providers/import/components/services-table-mobile-card.tsx:71
- **Код:** `<span className="text-[10px] text-muted-foreground truncate">{s.name}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #289 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/providers/import/components/services-table-row.tsx:95
- **Код:** `<span className="text-xs font-semibold text-foreground truncate" title={s.cleanName || s.name}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #290 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/providers/import/components/services-table-row.tsx:100
- **Код:** `<span className="text-[10px] text-muted-foreground truncate" title={s.name}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #291 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/providers/import/components/services-table-row.tsx:113
- **Код:** `<span className="truncate max-w-[70px]">{p.name}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #292 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/providers/import/components/services-table-row.tsx:128
- **Код:** `<span className="text-muted-foreground font-medium text-[10px] truncate block tabular-nums">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #293 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/providers/import/components/services-table-row.tsx:137
- **Код:** `<span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 select-none bg-muted px-2 py-1 rounded-md border border-border w-fit truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #294 [SQUASHED_ELEMENT] src/app/admin/providers/import/components/summary-dashboard.tsx:82
- **Код:** `<Package className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #295 [SQUASHED_ELEMENT] src/app/admin/providers/import/components/wizard/EmptyCacheCard.tsx:16
- **Код:** `<Download className="w-6 h-6 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #296 [FIXED_WIDTH_HAZARD] src/app/admin/providers/import/components/wizard/WizardBulkToolbar.tsx:123
- **Код:** `<SelectTrigger className="w-[200px] h-9 text-xs">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #297 [SQUASHED_ELEMENT] src/app/admin/providers/import/components/wizard/WizardProviderHeader.tsx:27
- **Код:** `<Package className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #298 [FIXED_WIDTH_HAZARD] src/app/admin/providers/import/components/wizard/WizardProviderHeader.tsx:40
- **Код:** `<SelectTrigger className="w-[260px] h-10 text-sm font-semibold" aria-label="Выбор провайдера для импорта">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #299 [SQUASHED_ELEMENT] src/app/admin/refills/client-table.tsx:405
- **Код:** `<SlidersHorizontal className="w-6 h-6" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #300 [SQUASHED_ELEMENT] src/app/admin/refills/client-table.tsx:456
- **Код:** `<Clock className="w-3 h-3 text-muted-foreground" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #301 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/refills/client-table.tsx:490
- **Код:** `className="text-[11px] text-muted-foreground hover:text-foreground truncate max-w-[170px] inline-flex items-center gap-1"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #302 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/refills/client-table.tsx:494
- **Код:** `<span className="truncate">{r.order.link}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #303 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/refills/client-table.tsx:514
- **Код:** `className="text-xs font-mono text-foreground hover:text-primary transition-colors flex items-center gap-1.5 truncate max-w-[160px]"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #304 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/refills/client-table.tsx:518
- **Код:** `<span className="truncate">{r.order.user.email}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #305 [SQUASHED_ELEMENT] src/app/admin/refills/loading.tsx:34
- **Код:** `<Skeleton className="h-4 w-48 rounded-md" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #306 [SQUASHED_ELEMENT] src/app/admin/services/loading.tsx:31
- **Код:** `<Skeleton className="h-5 w-64" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #307 [FIXED_WIDTH_HAZARD] src/app/admin/settings/balance-policies/page.tsx:205
- **Код:** `<PlanTableHeadCell className="w-[110px]">Область</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #308 [FIXED_WIDTH_HAZARD] src/app/admin/settings/balance-policies/page.tsx:207
- **Код:** `<PlanTableHeadCell className="w-[140px]">Права</PlanTableHeadCell>`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #309 [SQUASHED_ELEMENT] src/app/admin/settings/catalog-settings.tsx:216
- **Код:** `<Calculator className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #310 [SQUASHED_ELEMENT] src/app/admin/settings/components/general/GeneralLegalFiscalSection.tsx:233
- **Код:** `<Eye className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #311 [SQUASHED_ELEMENT] src/app/admin/settings/components/general/GeneralMaintenanceSection.tsx:89
- **Код:** `<AlertTriangle className="w-6 h-6" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #312 [SQUASHED_ELEMENT] src/app/admin/settings/components/general/GeneralTelegramBotSection.tsx:104
- **Код:** `<AlertTriangle className="w-6 h-6" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #313 [SQUASHED_ELEMENT] src/app/admin/settings/integrations-settings.tsx:986
- **Код:** `<Mail className="w-6 h-6" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #314 [SQUASHED_ELEMENT] src/app/admin/settings/network-routing-tab.tsx:195
- **Код:** `<RefreshCw className="h-6 w-6 animate-spin mr-2" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #315 [SQUASHED_ELEMENT] src/app/admin/settings/network-routing-tab.tsx:208
- **Код:** `<Zap className="h-4 w-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #316 [SQUASHED_ELEMENT] src/app/admin/settings/network-routing-tab.tsx:224
- **Код:** `<Sparkles className="h-4 w-4 text-amber-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #317 [SQUASHED_ELEMENT] src/app/admin/settings/network-routing-tab.tsx:261
- **Код:** `<ShoppingCart className="h-4 w-4 text-blue-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #318 [SQUASHED_ELEMENT] src/app/admin/settings/network-routing-tab.tsx:290
- **Код:** `<RefreshCw className="h-4 w-4 text-emerald-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #319 [SQUASHED_ELEMENT] src/app/admin/settings/network-routing-tab.tsx:319
- **Код:** `<CreditCard className="h-4 w-4 text-emerald-600" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #320 [SQUASHED_ELEMENT] src/app/admin/settings/network-routing-tab.tsx:350
- **Код:** `<Globe className="h-4 w-4 text-indigo-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #321 [SQUASHED_ELEMENT] src/app/admin/settings/network-routing-tab.tsx:379
- **Код:** `<Send className="h-4 w-4 text-sky-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #322 [SQUASHED_ELEMENT] src/app/admin/settings/network-routing-tab.tsx:410
- **Код:** `<Search className="h-4 w-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #323 [SQUASHED_ELEMENT] src/app/admin/settings/network-routing-tab.tsx:485
- **Код:** `<Shield className="h-4 w-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #324 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/settings/proxy/ProxyCardItem.tsx:155
- **Код:** `<span className="font-semibold truncate mr-2">{prov.name}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #325 [SQUASHED_ELEMENT] src/app/admin/settings/proxy/ProxyDeleteDialog.tsx:29
- **Код:** `<AlertTriangle className="w-6 h-6" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #326 [SQUASHED_ELEMENT] src/app/admin/settings/proxy/ProxyImportRawListModal.tsx:40
- **Код:** `<FileText className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #327 [SQUASHED_ELEMENT] src/app/admin/settings/proxy/ProxyImportSubscriptionModal.tsx:40
- **Код:** `<Download className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #328 [SQUASHED_ELEMENT] src/app/admin/settings/roles/roles-client.tsx:300
- **Код:** `<ShieldCheck className="w-5 h-5 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #329 [SQUASHED_ELEMENT] src/app/admin/settings/roles/roles-client.tsx:364
- **Код:** `<Eye className="w-3 h-3 text-sky-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #330 [SQUASHED_ELEMENT] src/app/admin/settings/roles/roles-client.tsx:457
- **Код:** `<Lock className="w-3 h-3" /> Системное название роли заблокировано от изменений`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #331 [SQUASHED_ELEMENT] src/app/admin/settings/roles/roles-client.tsx:593
- **Код:** `<Copy className="w-5 h-5 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #332 [SQUASHED_ELEMENT] src/app/admin/settings/roles/roles-client.tsx:638
- **Код:** `<AlertTriangle className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #333 [SQUASHED_ELEMENT] src/app/admin/settings/storefront-keys/storefront-key-create-modal.tsx:79
- **Код:** `<KeyRound className="w-5 h-5 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #334 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/settings/storefront-keys/storefront-key-row.tsx:51
- **Код:** `<span className="font-medium text-sm text-foreground truncate max-w-[240px]">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #335 [SQUASHED_ELEMENT] src/app/admin/settings/storefront-keys/storefront-key-row.tsx:82
- **Код:** `<Clock className="w-3 h-3" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #336 [SQUASHED_ELEMENT] src/app/admin/settings/storefront-keys/storefront-keys-settings.tsx:97
- **Код:** `<KeyRound className="w-5 h-5 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #337 [SQUASHED_ELEMENT] src/app/admin/settings/storefront-keys/storefront-keys-settings.tsx:116
- **Код:** `<Globe className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #338 [SQUASHED_ELEMENT] src/app/admin/settings/support-templates.tsx:158
- **Код:** `<AlertTriangle className="w-6 h-6" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #339 [SQUASHED_ELEMENT] src/app/admin/settings/support-templates.tsx:193
- **Код:** `<Zap className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #340 [SQUASHED_ELEMENT] src/app/admin/settings/support-templates.tsx:297
- **Код:** `<Eye className="w-3 h-3 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #341 [SQUASHED_ELEMENT] src/app/admin/settings/support-templates.tsx:346
- **Код:** `<Tag className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #342 [SQUASHED_ELEMENT] src/app/admin/settings/team/modals/DeleteRoleModal.tsx:33
- **Код:** `<AlertTriangle className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #343 [SQUASHED_ELEMENT] src/app/admin/settings/team/modals/DemoteStaffModal.tsx:33
- **Код:** `<UserMinus className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #344 [SQUASHED_ELEMENT] src/app/admin/settings/team/modals/EditStaffModal.tsx:148
- **Код:** `<Key className="w-3 h-3" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #345 [SQUASHED_ELEMENT] src/app/admin/settings/team/modals/EditStaffModal.tsx:168
- **Код:** `<DollarSign className="w-3 h-3" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #346 [FIXED_WIDTH_HAZARD] src/app/admin/settings/team/modals/EditStaffModal.tsx:208
- **Код:** `className="font-bold gap-1.5 min-w-[110px]"`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #347 [FIXED_WIDTH_HAZARD] src/app/admin/settings/team/modals/RolePermissionsModal.tsx:230
- **Код:** `className="font-bold gap-1.5 min-w-[120px]"`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #348 [SQUASHED_ELEMENT] src/app/admin/settings/team/sections/PromoteUserSection.tsx:61
- **Код:** `<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #349 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/settings/team/sections/PromoteUserSection.tsx:96
- **Код:** `<span className="font-mono text-xs text-foreground truncate" title={u.email}>{u.email}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #350 [SQUASHED_ELEMENT] src/app/admin/settings/team/sections/StaffTableSection.tsx:77
- **Код:** `<Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #351 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/settings/team/sections/StaffTableSection.tsx:148
- **Код:** `<span className="font-mono text-xs text-foreground truncate" title={u.email}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #352 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/settings/team/sections/StaffTableSection.tsx:162
- **Код:** `<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/8 text-primary border border-primary/20 truncate max-w-full" title={u.staffRole.name}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #353 [SQUASHED_ELEMENT] src/app/admin/settings/team/sections/StaffTableSection.tsx:174
- **Код:** `<Package className="w-3 h-3" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #354 [SQUASHED_ELEMENT] src/app/admin/settings/team/sections/StaffTableSection.tsx:178
- **Код:** `<Users className="w-3 h-3" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #355 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/bot-constructor-tab.tsx:236
- **Код:** `<Bot className="w-5 h-5 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #356 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/bot-flow-builder.tsx:86
- **Код:** `<Play className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #357 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/settings/telegram/bot-flow-builder.tsx:138
- **Код:** `<span className="truncate">{step.title}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #358 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/button-manager.tsx:205
- **Код:** `<button type="button" onClick={() => moveButton(btn, 'up')} disabled={idx === 0} className="p-0.5 hover:text-primary disabled:opacity-20 cursor-pointer"><ArrowUp className="w-3 h-3" /></button>`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #359 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/settings/telegram/button-manager.tsx:212
- **Код:** `<span className="text-xs font-bold text-foreground truncate">{btn.label}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #360 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/connection-panel.tsx:88
- **Код:** `<AlertTriangle className="w-6 h-6" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #361 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/connection-panel.tsx:184
- **Код:** `<CheckCircle className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #362 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/connection-panel.tsx:221
- **Код:** `<Server className="w-3 h-3 text-blue-400" /> Daemon`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #363 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/connection-panel.tsx:233
- **Код:** `<Key className="w-3 h-3 text-amber-400" /> Proxy`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #364 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/error-tracker.tsx:188
- **Код:** `<span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(err.lastSeenAt).toLocaleString('ru-RU')}</span>`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #365 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/error-tracker.tsx:189
- **Код:** `{err.userId && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {err.userId.substring(0, 8)}...</span>}`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #366 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/error-tracker.tsx:190
- **Код:** `{err.chatId && <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {err.chatId}</span>}`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #367 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/telegram-csat-tab.tsx:108
- **Код:** `<Star className="w-4 h-4 text-amber-400 fill-amber-400" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #368 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/telegram-csat-tab.tsx:149
- **Код:** `<ThumbsDown className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #369 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/telegram-csat-tab.tsx:205
- **Код:** `<Meh className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #370 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/telegram-csat-tab.tsx:261
- **Код:** `<ThumbsUp className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #371 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/settings/telegram/telegram-feedback-list-tab.tsx:222
- **Код:** `className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1 truncate max-w-[280px]"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #372 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/telegram-live-preview.tsx:190
- **Код:** `<Bot className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #373 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/settings/telegram/telegram-live-preview.tsx:193
- **Код:** `<div className="text-xs font-bold truncate leading-tight">{siteName || 'SMMplan'} Support</div>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #374 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/telegram-menu-tab.tsx:164
- **Код:** `<Smartphone className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #375 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/telegram-menu-tab.tsx:244
- **Код:** `<Icon className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #376 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/telegram-simulator.tsx:62
- **Код:** `<Smartphone className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #377 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/telegram-templates-tab.tsx:146
- **Код:** `<MessageSquare className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #378 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/telegram-templates-tab.tsx:189
- **Код:** `<Icon className="w-4 h-4" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #379 [SQUASHED_ELEMENT] src/app/admin/settings/telegram/welcome-editor.tsx:185
- **Код:** `<MessageSquare className="w-4 h-4 text-primary" /> Предпросмотр`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #380 [MODAL_CLIPPING] src/app/admin/settings/telegram-bot-settings.tsx:232
- **Код:** `<Dialog open={isResetWebhookModalOpen} onOpenChange={setIsResetWebhookModalOpen}>`
- **Рекомендация:** Modal Hoisting Violation: Popup rendered inside overflow-hidden parent. Hoist via Portal.


#### #381 [SQUASHED_ELEMENT] src/app/admin/settings/telegram-bot-settings.tsx:236
- **Код:** `<AlertTriangle className="w-6 h-6" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #382 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/smart/smart-client.tsx:620
- **Код:** `<div className="text-[10px] text-muted-foreground truncate max-w-[120px] mt-0.5">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #383 [SQUASHED_ELEMENT] src/app/admin/smart/smart-client.tsx:703
- **Код:** `<AlertTriangle className="w-4 h-4 text-warning animate-pulse" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #384 [SQUASHED_ELEMENT] src/app/admin/smart/smart-client.tsx:737
- **Код:** `<AlertCircle className="w-4 h-4" /> Когда использовать Kill-Switch:`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #385 [SQUASHED_ELEMENT] src/app/admin/smart/smart-client.tsx:755
- **Код:** `<Settings className="w-5 h-5 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #386 [SQUASHED_ELEMENT] src/app/admin/staff/components/staff-payroll-tab.tsx:135
- **Код:** `<DollarSign className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #387 [SQUASHED_ELEMENT] src/app/admin/staff/components/staff-payroll-tab.tsx:159
- **Код:** `<Award className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #388 [SQUASHED_ELEMENT] src/app/admin/staff/components/staff-payroll-tab.tsx:209
- **Код:** `<RefreshCw className="w-6 h-6 animate-spin text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #389 [SQUASHED_ELEMENT] src/app/admin/staff/components/staff-schedule-tab.tsx:483
- **Код:** `<Sun className="w-4 h-4 text-amber-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #390 [SQUASHED_ELEMENT] src/app/admin/staff/components/staff-schedule-tab.tsx:517
- **Код:** `<AlertTriangle className="w-5 h-5 text-amber-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #391 [SQUASHED_ELEMENT] src/app/admin/staff/components/staff-schedule-tab.tsx:552
- **Код:** `<UserCheck className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #392 [FIXED_WIDTH_HAZARD] src/app/admin/staff/components/staff-schedule-tab.tsx:650
- **Код:** `<div className="flex items-center gap-3 min-w-[170px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #393 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/staff/components/staff-schedule-tab.tsx:842
- **Код:** `className={`w-full text-left px-1.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer truncate flex items-center gap-1 shadow-2xs ${`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #394 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/staff/components/staff-schedule-tab.tsx:865
- **Код:** `className={`px-1 py-0.5 rounded text-[9px] font-medium border truncate flex items-center gap-0.5 cursor-pointer ${`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #395 [SQUASHED_ELEMENT] src/app/admin/staff/components/staff-schedule-tab.tsx:889
- **Код:** `<CalendarIcon className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #396 [SQUASHED_ELEMENT] src/app/admin/staff/components/staff-schedule-tab.tsx:1009
- **Код:** `<ArrowLeftRight className="w-4 h-4 text-blue-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #397 [SQUASHED_ELEMENT] src/app/admin/staff/components/staff-schedule-tab.tsx:1094
- **Код:** `<Palmtree className="w-4 h-4 text-emerald-500" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #398 [SQUASHED_ELEMENT] src/app/admin/staff/components/staff-schedule-tab.tsx:1195
- **Код:** `<SlidersHorizontal className="w-4 h-4 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #399 [SQUASHED_ELEMENT] src/app/admin/staff/staff-client.tsx:185
- **Код:** `<Users className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #400 [SQUASHED_ELEMENT] src/app/admin/staff/staff-client.tsx:196
- **Код:** `<UserCheck className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #401 [SQUASHED_ELEMENT] src/app/admin/staff/staff-client.tsx:207
- **Код:** `<MessageSquare className="w-5 h-5" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #402 [SQUASHED_ELEMENT] src/app/admin/staff/staff-client.tsx:234
- **Код:** `<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #403 [FIXED_WIDTH_HAZARD] src/app/admin/staff/staff-client.tsx:314
- **Код:** `<td className="px-4 py-3.5 align-middle min-w-[240px]">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #404 [SQUASHED_ELEMENT] src/app/admin/staff/staff-client.tsx:358
- **Код:** `<Clock className="w-3 h-3 text-muted-foreground" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #405 [SQUASHED_ELEMENT] src/app/admin/staff/staff-client.tsx:364
- **Код:** `<Coffee className="w-3 h-3 text-amber-500/80" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #406 [SQUASHED_ELEMENT] src/app/admin/staff/staff-client.tsx:445
- **Код:** `<Moon className="w-3 h-3" /> Ночные действия`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #407 [SQUASHED_ELEMENT] src/app/admin/staff/staff-client.tsx:466
- **Код:** `<RefreshCw className="w-6 h-6 animate-spin text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #408 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/tenants/tenants-manager.tsx:210
- **Код:** `<h3 className="text-base sm:text-lg font-black text-foreground truncate">{tenant.name}</h3>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #409 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/tenants/tenants-manager.tsx:235
- **Код:** `<span className="font-mono font-bold text-foreground truncate text-xs">{tenant.domain}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #410 [SQUASHED_ELEMENT] src/app/admin/tenants/tenants-manager.tsx:265
- **Код:** `<Radio className="w-3 h-3 text-emerald-500 animate-pulse" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #411 [FIXED_WIDTH_HAZARD] src/app/admin/tickets/components/tickets-sidebar.tsx:103
- **Код:** `className="w-full lg:w-[300px] xl:w-[340px] shrink-0 border-r border-border flex flex-col h-full overflow-hidden min-h-0 select-none bg-background min-w-0"`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #412 [SQUASHED_ELEMENT] src/app/admin/tickets/components/tickets-sidebar.tsx:109
- **Код:** `<Headphones className="w-5 h-5 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #413 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/tickets/components/tickets-sidebar.tsx:244
- **Код:** `<span className="text-[11px] font-bold text-foreground truncate max-w-[100px] sm:max-w-[145px]" title={ticket.user.email || "Аноним"}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #414 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/tickets/components/tickets-sidebar.tsx:266
- **Код:** `<p className="text-[11px] text-muted-foreground truncate leading-normal flex-1">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #415 [SQUASHED_ELEMENT] src/app/admin/tickets/components/tickets-sidebar.tsx:285
- **Код:** `<Headphones className="w-6 h-6 opacity-60 text-primary" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #416 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/tickets/components/unified-workspace.tsx:348
- **Код:** `<h2 className="font-black text-xs leading-tight truncate max-w-[180px] sm:max-w-xs text-foreground" title={activeTicket.subject}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #417 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/tickets/components/unified-workspace.tsx:360
- **Код:** `<span className="flex items-center gap-1 truncate max-w-[120px] sm:max-w-[160px] text-muted-foreground shrink-0" title={activeTicket.user.email}>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #418 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/tickets/components/unified-workspace.tsx:361
- **Код:** `<Mail className="w-3 h-3 shrink-0 text-muted-foreground" /> <span className="truncate text-muted-foreground">{activeTicket.user.email}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #419 [FIXED_WIDTH_HAZARD] src/app/admin/tickets/components/unified-workspace.tsx:563
- **Код:** `<div className="w-[280px] xl:w-[320px] shrink-0 border-l border-border/50 h-full min-h-0 bg-card/60 backdrop-blur-md overflow-hidden animate-in slide-in-from-right duration-300 min-w-0">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #420 [FIXED_WIDTH_HAZARD] src/app/admin/transactions/loading.tsx:40
- **Код:** `<Skeleton className="h-8 flex-1 min-w-[200px] rounded-lg" />`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #421 [SQUASHED_ELEMENT] src/app/admin/transactions/loading.tsx:58
- **Код:** `<Skeleton className="h-4 w-36 rounded-md" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #422 [SQUASHED_ELEMENT] src/app/admin/transactions/loading.tsx:91
- **Код:** `<Skeleton className="h-4 w-44 rounded-md" />`
- **Рекомендация:** Add "shrink-0" to icon to prevent element squashing on narrow viewports.


#### #423 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/transactions/transactions-client.tsx:293
- **Код:** `<div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1.5 truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #424 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/transactions/transactions-client.tsx:306
- **Код:** `<div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-1.5 truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #425 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/transactions/transactions-client.tsx:319
- **Код:** `<div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-1.5 truncate">`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #426 [FIXED_WIDTH_HAZARD] src/app/admin/transactions/transactions-client.tsx:331
- **Код:** `<form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] relative">`
- **Рекомендация:** Add "max-w-full" or move fixed width behind responsive prefix (e.g., "w-full sm:w-[...px]").


#### #427 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/transactions/transactions-client.tsx:628
- **Код:** `className="text-primary hover:underline font-mono text-xs font-bold truncate flex items-center gap-0.5"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #428 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/transactions/transactions-client.tsx:631
- **Код:** `<span className="truncate">{entry.userEmail}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #429 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/transactions/transactions-client.tsx:646
- **Код:** `className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground border border-border/50 text-[10px] font-bold truncate max-w-[110px] inline-block select-all"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #430 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/transactions/transactions-client.tsx:662
- **Код:** `className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold truncate max-w-[110px] inline-block select-all"`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.


#### #431 [TRUNCATE_WITHOUT_MIN_W_ZERO] src/app/admin/transactions/transactions-client.tsx:683
- **Код:** `<span className="truncate max-w-[90px]">{cfg.label}</span>`
- **Рекомендация:** Add "min-w-0" to element or flex-parent with "truncate" to allow text shrinkage.

