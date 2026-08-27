# AGENTS.md — Smmplan AI Developer Contract (v4.1)
# Этот файл — единый источник правды для ЛЮБОГО AI-ассистента (Cursor, Claude Code, Gemini, Antigravity).
# Все генерируемые изменения ОБЯЗАНЫ строго соблюдать эти правила.

## 0. ⛔ SESSION INIT — ОБЯЗАТЕЛЬНЫЙ ПЕРВЫЙ ШАГ (BLOCKING)

> ❌ **ЗАПРЕЩЕНО** начинать любую работу без выполнения этого раздела.
> Это не рекомендация — это блокирующее требование контракта.

### При каждом старте сессии в этом проекте:

1. **Прочитай файл-якорь** → `d:\SMM_plan_2\CURRENT_STATE.md`
   - Убедись, что знаешь текущую активную вкладку и список завершённых экранов
   - Выведи 1-строчное резюме: "Активная задача: X. Завершено: A, B, C."

2. **Запроси RAG-память** (для нетривиальных задач) → `http://localhost:8100/api/search`
   ```bash
   npx tsx scripts/memory-client.ts searchContext "<тема задачи>"
   ```
   Или через curl: `POST http://localhost:8100/api/search` с `{"query": "...", "collections": ["architecture_decisions","business_rules"], "top_k": 5}`

3. **После завершения задачи — немедленно обнови:**
   - `d:\SMM_plan_2\CURRENT_STATE.md` — статус текущего экрана
   - `d:\SMM_plan_2\MEMORY.md` — раздел 2, если задача существенная
   - GraphRAG: `POST http://localhost:8100/api/decision` — если принято архитектурное решение

---


## 1. Стек и окружение
- **Framework**: Next.js 16.x (App Router, Turbopack)
- **UI**: React 19.x
- **Styling**: Tailwind CSS 4.0.0 (`@theme` в `src/app/globals.css`, CSS-first config)
- **Component Library**: HeroUI v3 (dot notation API: `<Table.Header>`, `<Table.Column>`)
- **ORM**: Prisma 5 (PostgreSQL)
- **Language**: TypeScript 5.7+ (strict mode)
- **AI Models**: `gemini-3-flash` или `gemini-3-flash-preview`
- **Linting & Testing**: ESLint 10 (Flat Config — `eslint.config.mjs`) | Vitest 4

---

## 2. Архитектурные границы и безопасность (CRITICAL)

### Server/Client Boundary & Error Handling
- **Server Components** по умолчанию. `'use client'` только при наличии React hooks или Browser APIs.
- **Server Actions** строго в `src/actions/` с обязательным guard `requireAdmin()` или `requireStaffPermission()`.
- ❌ **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** ставить `"use server"` в Page Components (`page.tsx`) — вызывает краш приложения.
- ❌ **ЗАПРЕЩЕНО** выбрасывать необработанные `throw new Error(...)` внутри Server Actions (Next.js в production маскирует их в `"An unexpected response was received from the server."`).
- ✅ Все Server Actions обязаны возвращать типизированный результат: `return { success: false, error: 'Понятное сообщение' }`.
- ❌ **ЗАПРЕЩЕНО** добавлять стандартные библиотеки (`ioredis`, `sanitize-html`, `bullmq`) в `serverExternalPackages` в `next.config.mjs` (вызывает сбой поиска хэшированных модулей в standalone).
- ✅ **Standalone Сборка:** Для сборки продакшен-бандла использовать `next build --webpack`. Перед перезапуском Docker (`docker-compose up -d --build web`) всегда запускать `npm run build` на хосте.

### Multi-Tenant Rules & SMMpanel 1.0
- Проект обслуживает СТРОГО 2 бренда: **SMMplan** (`smmplan.pro`) и **SMMflux** (`smmflux.ru`).
- ❌ **Брендов Lovable и SMMboost НЕ существует.** Запрещено добавлять фантомные бренды в код, конфиги или макеты. Алиас `normalizeTenantId('lovable')` -> `'flux'` сохранен для обратной совместимости.
- ✅ **Админ-панель называется строго SMMpanel 1.0** (в сайдбаре, заголовках и шапке).
- ✅ **Глобальный переключатель сайтов в Header:** Переключение между сайтами (`SMMplan` / `SMMflux`) осуществляется **ГЛОБАЛЬНО в верхней панели (Header/Navbar)** через `<GlobalSiteSwitcher />` с сохранением в куке `x_admin_tenant` и параметре `?tenant=...`.
- ❌ **ЗАПРЕЩЕНО** хардкодить хосты (`smmplan.pro`, `smmflux.ru`) в коде. Использовать `getTenantHost(tenantId)`.
- ✅ **Canonical URLs** обязаны быть абсолютными через `absoluteCanonical(tenantId, path)`.
- ✅ Кэш-ключи в `unstable_cache` обязаны включать `tenantId` (например, `catalog-${tenantId}`).

### Cloudflare Tunnel & Network Binding Invariants
- ❌ **ЗАПРЕЩЕНО** использовать сторонние туннели (SSH reverse tunnels, ngrok, localtunnel).
- ✅ **ВСЕГДА** использовать официальный Cloudflare Tunnel (`cloudflared.exe tunnel`) через скрипт `scripts/start-tunnel.ps1` для домена `test.smmplan.pro`.
- ✅ **Сетевой биндинг:** Сервер Next.js обязан запускаться с `HOSTNAME="0.0.0.0"` и `PORT="3000"`, обеспечивая доступ для Docker-коннектора с `host.docker.internal:3000` без ошибки 502 Bad Gateway.

### Финансовая безопасность (Trust Boundary) & Ledger Invariants
- ❌ **ЗАПРЕЩЕНО** менять `User.balance` напрямую или доверять ценам из клиентского UI.
- ✅ Все операции с балансом — ТОЛЬКО через `WalletOps.credit()`, `WalletOps.debit()`, `WalletOps.refund()`, `WalletOps.charge()`, `WalletOps.adminAdjust()`.
- ❌ **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** Transaction Escape: использовать глобальный инстанс `db.*` (PrismaClient) внутри методов, принимающих `tx: PrismaTx`. Все вызовы и catch-блоки обязаны использовать `tx.*`.
- ✅ **Ledger-First Principle:** Запись в `tx.ledgerEntry.create()` ОБЯЗАНА создаваться ДО мутации `tx.user.update({ balance: ... })`.
- ✅ **Multi-Tenant Fallback:** В финансовых операциях tenantId обязан разрешаться строго через цепочку: `tenantId || user?.tenantId || 'smmplan'`.
- ✅ Все денежные суммы — строго в `BigInt` (копейки). Все финансовые логи — через `await auditAdminAwaitable()`.
- ✅ Каждая финансовая транзакция обязана содержать уникальный `idempotencyKey`.

### Безопасность секретов и Вебхуков (Fail-Closed & Timing-Safe)
- ❌ **ЗАПРЕЩЕНО** писать Fail-Open проверки вебхуков вида `if (secret && signature) { verify() }`.
- ✅ **Fail-Closed:** Если секрет вебхука не настроен — немедленный 500 error; если подпись отсутствует или не совпадает — немедленный 401/403 с алертом в `SecurityAlertService`.
- ✅ Сравнение любых токенов, HMAC-подписей и секретов — СТРОГО через `crypto.timingSafeEqual`.
- ❌ **ЗАПРЕЩЕНО** использовать fallback-секреты для `NEXT_PUBLIC_*` (`process.env.NEXT_PUBLIC_SECRET || 'fallback'`). Секреты не должны попадать в клиентский бандл.

### Zero-Trust, RBAC & Lifecycle Boundaries (CRITICAL INVARIANTS)
- ❌ **ЗАПРЕЩЕНО** писать проверки IDOR вида `if (sessionUser && item.userId !== sessionUser.id)` без обработки гостевого контекста.
- ✅ **Guest-Proof IDOR:** Если сущность принадлежит пользователю (`item.userId`), доступ разрешается СТРОГО при `if (item.userId && (!sessionUser || item.userId !== sessionUser.id)) { return { error: 'Access denied' }; }`.
- ❌ **ЗАПРЕЩЕНО** включать статусы неоплаченных заказов (`AWAITING_PAYMENT`, `PENDING`) в фильтры поиска вебхуков провайдеров (`src/app/api/webhooks/provider/`). Провайдерские вебхуки могут модифицировать СТРОГО заказы со статусами `IN_PROGRESS` или `PENDING_CHECK`.
- ❌ **ЗАПРЕЩЕНО** интерполировать переменные в Cypher-запросы Neo4j без проверки по белому списку `VALID_LABELS = {'class', 'module', 'function', 'file'}`.
- ❌ **ЗАПРЕЩЕНО** позволять сотрудникам назначать роли самим себе (`admin.id === targetUserId`) или выдавать права, превышающие их собственный набор полномочий (`Grant Ceiling`).
- ❌ **ЗАПРЕЩЕНО** переименовывать `src/proxy.ts` в `src/middleware.ts` — в Next.js 16 App Router для платформы зафиксирован `src/proxy.ts`.

### Каталог и провайдеры (Shadow Catalog)
- ❌ **ЗАПРЕЩЕНО** импортировать сырые каталоги провайдеров (5000+ позиций) напрямую в PostgreSQL `Service`.
- ✅ Все каталоги провайдеров буферизуются в Redis (`provider:{id}:catalog`). В БД попадают только одобренные админом услуги (Cherry-Pick).
- ✅ **Ценообразование в UI:** пользователь ВСЕГДА видит розничную цену за 1 штуку (`pricePerUnitRub`), подпись строго: `₽ / шт`. Запрещено писать `/ 1000 шт` или умножать цену на 1000 на клиенте.

---

## 3. Стандарты верстки, UX и Дизайн-Системы (CRITICAL)

### Dual-Brand Design System Tokens & UI Forge Harness
- ❌ **НИКОГДА** не используй inline-цвета и сырые стили: `text-white`, `bg-black`, `text-blue-500`, `border-[1px]`, `rounded-[17px]`.
- ❌ **ЗАПРЕЩЕНО** писать сырые `<button>` и `<input>` в пользовательском UI.
- ✅ **ВСЕГДА** используй компоненты UI Арсенала из `@/components/ui`:
  - **SMMflux (Radiant Aurora):** `<FluxButton>`, `<FluxInput>`, `<FluxCard>`, `<FluxBadge>`, `<NumberTicker>`, `<BorderBeam>`, `<TiltCard>`, `<Marquee>`, `<Confetti>`.
  - **SMMplan (Classic B2B):** `<PlanButton>`, `<PlanCard>`, `<PlanBadge>`, `<PlanTable>`, `<PlanTableHeader>`, `<PlanTableRow>`, `<PlanTableCell>`.
- ⚡ **UI Forge Harness CLI:** Агенты обязаны использовать харнес для автоматизации:
  - `npx tsx scripts/harness/ui-forge.ts list` — просмотр доступных компонентов
  - `npx tsx scripts/harness/ui-forge.ts validate` — проверка токенов кодовой базы
  - `npx tsx scripts/harness/ui-forge.ts scaffold --brand=smmplan <slug>` — генерация B2B-страницы для SMMplan
  - `npx tsx scripts/harness/ui-forge.ts scaffold --brand=flux <slug>` — генерация страницы для SMMflux
- ✅ **ВСЕГДА** используй семантические токены из `globals.css`: `text-foreground`, `bg-background`, `bg-card`, `text-primary`, `text-muted-foreground`, `border-border`.
- Все интерактивные элементы обязаны иметь `transition-all duration-200`. Компоненты декомпозируются (до 150–200 строк).

### UX форм и валидации
- ❌ **ЗАПРЕЩЕНО** делать кнопки отправки (Submit / Оплатить / Сохранить) неактивными (`disabled`) при невалидных полях.
- ✅ Главные кнопки **ВСЕГДА активны**. При невалидной форме клик перехватывается (`e.preventDefault()`), вызывается `animate-shake` (с уникальным ключом `key={Date.now()}`) и плавный скролл (`scrollIntoView`) к первому ошибочному полю.
- ✅ Общие серверные ошибки отображаются **непосредственно над кнопкой Submit** в фокусе внимания пользователя.

### Пошаговый мастер заказа (Order Wizard) & Drip-Feed Invariant (CRITICAL)
- Заказ проходит строгие шаги: **1. Соцсеть** → **2. Категория** → **3. Услуга** → **4. Checkout** (Количество, Ссылка, Email).
- Поле «Количество» автоматически инициализируется минимальным значением (`service.minQty`).
- ❌ **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** допускать оформление Drip-Feed заказов с объемом на один запуск меньше `service.minQty` ($\lfloor \text{quantity} / \text{runs} \rfloor < \text{service.minQty}$).
- ✅ **Drip-Feed Floor Invariant:** При активации Drip-Feed ($N$ запусков) или Smart Drip ($D$ дней) нижняя граница допустимого количества (`min`) и текущее значение в UI **ОБЯЗАНЫ автоматически масштабироваться** минимум до $\text{service.minQty} \times N$. Степперы и валидаторы форм обязаны запрещать декремент ниже этого значения.
- ✅ **Fail-Closed Backend Check:** `checkoutAction` обязан строго валидировать `Math.floor(totalQuantity / runs) >= service.minQty` и отклонять невалидные запросы с понятной ошибкой до списания средств.

### Таблицы и компоновка данных (No Horizontal Scroll & Zero Column Clipping Rule)
- ❌ **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** допускать появление горизонтального скролла в таблицах данных и административных интерфейсах.
- ❌ **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** обрезать столбцы или скрывать правые колонки (действия, цены, статусы) за пределами видимой области экрана.
- ✅ **Интерфейс ОБЯЗАН на 100% умещаться по ширине в видимый экран (Viewport 100% Width Fit):**
  1. **Приоритезация и лимит колонок:** в основной таблице отображаются только критически важные для оператора данные (до 7–9 емких колонок). Вторичные технические поля (дата создания, ID провайдера, хэши данных) переносятся во всплывающие подсказки (Tooltips) или модальные окна деталей (`OrderDetailsModal`, `AdminPricingIntelligenceModal`).
  2. **Компактная плотность ячеек:** отступы ячеек строго `px-2 py-1.5` / `px-2.5 py-2`, размер шрифта `text-xs` и `text-[11px]`.
  3. **Контроль ширины текстовых блоков:** длинные названия услуг и категорий ограничиваются (`max-w-[180px]`, `truncate`) с атрибутом `title="..."` для полного просмотра при наведении.
  4. **Компактные управляющие элементы:** поля ввода наценок и цен — фиксированные `w-14` / `w-18`, кнопки действий — компактные `h-7 w-7` / `h-8 w-8`.
  5. **Адаптивность:** таблица должна автоматически растягиваться на 100% доступной ширины родителя (`w-full`) без фиксированных раздутых `min-w-[1400px]`.

### Модальные окна, Viewport Density и Realtime/Optimistic UI (CRITICAL)
- ❌ **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** рендерить `<Modal>` или `<Dialog>` внутри `DropdownMenuContent`, `Popover` или `Tooltip` (приводит к Context Clamping или анмаунту при закрытии дропдауна).
- ✅ **Modal Hoisting:** Состояние открытия модалов объявляется строго на уровне экрана/страницы (`unified-workspace.tsx`), а дочерние кнопки в дропдаунах передают колбэки (`onOpenModal`).
- ❌ **ЗАПРЕЩЕНО** размещать более 3 фиксированных элементов с `w-max` в flex-шапках без `min-w-0` и адаптивного сворачивания в меню на экранах `< 1536px`.
- ✅ **Idempotent Telegram Daemon:** Запуск `bot.launch()` ОБЯЗАН сбрасывать вебхуки через `await bot.telegram.deleteWebhook({ drop_pending_updates: true })` для предотвращения ошибки `409 Conflict`.
- ✅ **Optimistic UI Hygiene:** Любое оптимистичное сообщение/мутация с `temp-id` ОБЯЗАНА иметь 10-12s TTL таймер авто-очистки и немедленный откат стейта с возвратом текста при ошибке `{ success: false }`.

---

## 4. Качество кода и чистота (Linting & Hygiene)

- ❌ **Strict Types:** Запрещено использовать `any` (`@typescript-eslint/no-explicit-any`). Используйте `unknown` с проверкой типов.
- ❌ **Clean Scope:** Удаляйте неиспользуемые импорты и переменные (`@typescript-eslint/no-unused-vars`).
- ❌ **No Useless Wrappers:** Запрещено писать `try { ... } catch (e) { throw e; }`.
- ❌ **React 19:** Запрещен `useFormState` (используется `useActionState`).
- ✅ **Синтаксис батч-замен:** При использовании `multi_replace_file_content` всегда проверяйте баланс фигурных скобок `{}`.

---

## 5. Протокол работы с памятью и субагентами (4-Tier Memory & ACE Triad)

1. **RAG & Память перед стартом (Curator):**
   - Перед сложными задачами выполните поиск по векторной памяти: `npx tsx scripts/memory-client.ts` или `npx tsx scripts/query-rag.ts "<контекст>"`.
   - Проверьте выученные уроки в [`MEMORY.md`](file:///d:/SMM_plan_2/MEMORY.md).
2. **Логирование ошибок и эпизодов (Reflector):**
   - При сбоях тестов или регрессиях логируйте пару `(action, observation, reflection)` через `SmmplanMemoryClient.logEpisode()`.
3. **Обязательная верификация перед сдачей:**
   ```bash
   npx tsx scripts/check-design-system.ts # 0 нарушений токенов
   npx tsc --noEmit                       # 0 ошибок типизации
   npm run test                           # 100% прохождение всех Vitest тестов
   npm run audit:swarm                    # Состязательный аудит Red Team -> Blue Team -> CTO
   ```
4. **Фиксация опыта (Semantic Consolidation):** При решении сложных багов или принятии архитектурных решений сделайте короткую запись в [`MEMORY.md`](file:///d:/SMM_plan_2/MEMORY.md) и отправьте решение через `SmmplanMemoryClient.recordDecision()`.

---

## 6. Автоматический Состязательный Аудит (Adversarial Red Team & Pre-Mortem Gate)

> 🛡️ **BLOCKING QUALITY GATE.** Любые архитектурные изменения финансовой логики (`WalletOps`, `pricing`), калькулятора заказов (`Drip-Feed`), маршрутизации (`src/proxy.ts`, `auth`) или очередей (`BullMQ`, `Redis`) ОБЯЗАНЫ проходить состязательную проверку:

1. **Обязательный Pre-Mortem в Planning Mode:**
   - Перед написанием кода агент формулирует минимум 3 сценария гипотетических отказов (Premortem Failure Modes): краевые расчеты, аномалии микро-цен, блокировки очередей и фишинг.
2. **Запуск Состязательного Роя (Adversarial Swarm):**
   ```bash
   npm run audit:swarm
   ```
   - **Раунд 1 (Red Team / GLM-5.2):** Агрессивная атака и выявление 3–5 векторов отказа.
   - **Раунд 2 (Blue Team / Nemotron 550B):** Оценка реальности рисков и отсечение YAGNI.
   - **Раунд 3 (CTO Arbiter / Inkling Small):** Финальный вердикт. Запрещено объявлять задачу завершенной при наличии нерешенных `P0_BLOCKING` или `P1_REQUIRED` замечаний.
3. **Финансовая точность (ExactMath Invariant):**
   - Все расчеты сумм заказов обязаны использовать `ExactMath.calculateOrderCostKopecks()` с округлением Banker's Rounding (Half-Even) и защитным полом $\ge 1$ коп.

---

## 7. Иерархия верификации источников (Zero-Hallucination 3-Tier Hierarchy)

> 🔍 **CRITICAL ANTI-HALLUCINATION PROTOCOL.** Агентам КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО проектировать или писать код интеграций с внешними системами (платежные шлюзы, бухгалтерские системы, внешние API, налоговые протоколы 54-ФЗ), опираясь исключительно на память модели:

1. **Уровень 1 (Официальная документация):**
   - Первичная проверка по официальным источникам вендора (`read_url_content`, API Reference `yookassa.ru/developers`, `docs.robokassa.ru`, портал ФНС).
2. **Уровень 2 (Поисковая верификация):**
   - Если документация недоступна — обязательный поиск в интернете (`search_web`) актуальных протоколов (2025/2026 гг.) и выявление устаревших методов (SOAP/XML vs REST/JSON).
3. **Уровень 3 (Память модели — строго с пометкой гипотезы):**
   - Внутренняя память агента используется ТОЛЬКО как гипотеза с обязательным предупреждением пользователю: `[ГИПОТЕЗА: Требуется валидация документацией]`. Запрещено внедрять предположения без последующей проверки.



