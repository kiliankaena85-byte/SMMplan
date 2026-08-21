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

### Server/Client Boundary
- **Server Components** по умолчанию. `'use client'` только при наличии React hooks или Browser APIs.
- **Server Actions** строго в `src/actions/` с обязательным guard `requireAdmin()` или `requireStaffPermission()`.
- ❌ **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** ставить `"use server"` в Page Components (`page.tsx`) — вызывает краш приложения.

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

### Финансовая безопасность (Trust Boundary)
- ❌ **ЗАПРЕЩЕНО** менять `User.balance` напрямую или доверять ценам из клиентского UI.
- ✅ Все операции с балансом — ТОЛЬКО через `WalletOps.credit()`, `WalletOps.debit()`, `WalletOps.refund()`.
- ✅ Все денежные суммы — строго в `BigInt` (копейки). Все финансовые логи — через `await auditAdminAwaitable()`.
- ✅ Каждая финансовая транзакция обязана содержать уникальный `idempotencyKey`.

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

### Пошаговый мастер заказа (Order Wizard)
- Заказ проходит строгие шаги: **1. Соцсеть** → **2. Категория** → **3. Услуга** → **4. Checkout** (Количество, Ссылка, Email).
- Поле «Количество» автоматически инициализируется минимальным значением (`service.minQty`).

### Таблицы и компоновка данных (No Horizontal Scroll & Zero Column Clipping Rule)
- ❌ **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** допускать появление горизонтального скролла в таблицах данных и административных интерфейсах.
- ❌ **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** обрезать столбцы или скрывать правые колонки (действия, цены, статусы) за пределами видимой области экрана.
- ✅ **Интерфейс ОБЯЗАН на 100% умещаться по ширине в видимый экран (Viewport 100% Width Fit):**
  1. **Приоритезация и лимит колонок:** в основной таблице отображаются только критически важные для оператора данные (до 7–9 емких колонок). Вторичные технические поля (дата создания, ID провайдера, хэши данных) переносятся во всплывающие подсказки (Tooltips) или модальные окна деталей (`OrderDetailsModal`, `AdminPricingIntelligenceModal`).
  2. **Компактная плотность ячеек:** отступы ячеек строго `px-2 py-1.5` / `px-2.5 py-2`, размер шрифта `text-xs` и `text-[11px]`.
  3. **Контроль ширины текстовых блоков:** длинные названия услуг и категорий ограничиваются (`max-w-[180px]`, `truncate`) с атрибутом `title="..."` для полного просмотра при наведении.
  4. **Компактные управляющие элементы:** поля ввода наценок и цен — фиксированные `w-14` / `w-18`, кнопки действий — компактные `h-7 w-7` / `h-8 w-8`.
  5. **Адаптивность:** таблица должна автоматически растягиваться на 100% доступной ширины родителя (`w-full`) без фиксированных раздутых `min-w-[1400px]`.

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
   npm run build                          # Успешная сборка Next.js
   npx vitest run                         # Прохождение юнит-тестов
   ```
4. **Фиксация опыта (Semantic Consolidation):** При решении сложных багов или принятии архитектурных решений сделайте короткую запись в [`MEMORY.md`](file:///d:/SMM_plan_2/MEMORY.md) и отправьте решение через `SmmplanMemoryClient.recordDecision()`.

