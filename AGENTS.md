# AGENTS.md — Smmplan Lite AI Developer Contract
# Этот файл — единый источник правды для ЛЮБОГО AI-ассистента (Cursor, Claude Code, Gemini, Copilot).
# Все AI-генерируемые изменения ОБЯЗАНЫ соблюдать эти правила.

## Stack
- **Framework**: Next.js 16.2.6 (App Router, Turbopack)
- **UI**: React 19.2.6
- **Styling**: Tailwind CSS 4.0.0 (`@theme` directive в `globals.css`, CSS-first config)
- **Component Library**: HeroUI v3 (dot notation API: `<Table.Header>`, `<Table.Column>`)
- **ORM**: Prisma 5 (PostgreSQL)
- **Language**: TypeScript 5.7+ (strict mode)
- **AI Model**: `gemini-3.5-flash` (ТОЛЬКО эта модель как наиболее актуальная)
- **Linting**: ESLint 10 (Flat Config — `eslint.config.mjs`)
- **Testing**: Vitest 4

## Architecture Rules

### Zero-Defect Execution Protocol (TRIPLE-AGENT STRATEGY)
**🔴 ОБЯЗАТЕЛЬНО для всех AI-агентов при обработке любого запроса:**

1. **Phase 1: Analyst (`gsd-prompt-engineer`) & Double-Pass Planner**:
   - ПЕРЕД любой работой задай уточняющие вопросы (3-5 шт).
   - Сформируй четкое ТЗ (UI-SPEC/API-SPEC).
   - Не начинай кодить, пока не будет "High-Definition" понимания задачи.
   - **🔴 Двухпроходное планирование (Double-Pass Planning)**: сразу после составления первого черновика плана (`implementation_plan.md`) принудительно перечитай его и переоцени с точки зрения 5 векторов надежности.

2. **Phase 2: Researcher (`gsd-research-autopsy`) & Pre-Mortem Auditor**:
   - Проведи глубокий поиск (EN/RU).
   - Найди 3 подтверждения для каждой гипотезы.
   - **🔴 5 Векторов Надежности**: проанализируй и оцени план по 5 векторам:
     - *Архитектурный стык* (Server/Client границы, hooks, реактивные зависимости, ререндеринг).
     - *Хаос и пустота* (Синдром пустой БД/Cold Start, сбой транзакционности в Prisma, битые входные данные).
     - *Visual & UX Density* (адаптивность от 320px до 4K, отсутствие интерфейсного гигантизма, семантика Tailwind 4).
     - *Доступность WCAG 2.2 AA* (мишени touch targets >= 44px, цветовой контраст >= 4.5:1).
     - *Security & Trust* (Trust Boundary / серверная проверка цен, наличие безопасных платежных логотипов МИР/СБП).
   - **🔴 Премортем-анализ (Failure Simulation)**: заполни в `implementation_plan.md` обязательную таблицу рисков — минимум 3 сценария гипотетического отказа системы в продакшене с конкретными программными механизмами защиты. План без заполненного премортема невалиден!
   - Сформируй Risk Matrix (P×I) и список Edge-Cases.

3. **Phase 3: Surgeon (`gsd-surgeon`)**:
   - Реализуй код строго по ТЗ и данным из исследования.
   - Соблюдай границы Server/Client и защиту от утечек данных.
   - Проверь типы (`npx tsc --noEmit`) перед сдачей.

### Server/Client Boundary
- Server Components по умолчанию. `'use client'` только при необходимости (hooks, browser APIs).
- Server Actions в `src/actions/` с обязательным `requireAdmin()` guard.
- НИКОГДА не ставить `"use server"` в Page Components — это вызывает crash.

### Design System (CRITICAL)
- **НИКОГДА** не используй inline цвета: `text-white`, `bg-black`, `text-blue-500`.
- **ВСЕГДА** используй semantic tokens из `globals.css`: `text-foreground`, `bg-background`, `bg-card`, `text-primary`, `text-muted-foreground`.
- **НИКОГДА** не добавляй `1px solid` borders между строками таблиц. Используй тональный контраст.
- Все цвета определены в `@theme` блоке `src/app/globals.css`.
- Компоненты максимум 150 строк. Декомпозируй на sub-components.
- Все интерактивные элементы: `transition-all duration-200`.

### Code Editing
- **ПРЕДПОЧИТАЙ** `search-replace` (`multi_replace_file_content`) вместо полной перезаписи файлов.
- **НИКОГДА** не переписывай файл целиком, если нужно изменить < 20 строк.
- Batch независимые операции в параллельные tool calls.

### Debugging
- **СНАЧАЛА** читай ошибки build/runtime, **ПОТОМ** правь код.
- Не гадай — проверяй логи и типы.

### Deployment & Background Workers (CRITICAL)
- **НЕОБХОДИМОСТЬ:** Архитектура Smmplan разделена на веб-сервер (`next start`) и фоновые процессы (`BullMQ`, `Cron`). 
- **ДЕПЛОЙ:** На production (Ubuntu/Docker) веб-сервер и воркеры обязаны запускаться параллельно! Если веб-сервер запущен, а команда `npm run worker` (запускающая `tsx src/workers/index.ts`) нет, то заказы будут навечно "зависать" в Redis в статусе "PENDING", а Telegram/VK отложенные посты не будут публиковаться.
- Всегда включайте воркера в `docker-compose.yml` или `PM2` экосистему отдельными процессами.

### Provider Synchronization (Cherry-Pick Architecture)
**🔴 ОБЯЗАТЕЛЬНАЯ архитектура работы с провайдерами (Anti-Mass-Sync):**
1. **Shadow Catalog (Теневой буфер):** КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать сырые каталоги провайдеров (5000+ услуг) в таблицу `Service` PostgreSQL. Все `fetch` к провайдерам должны сохраняться во временный Redis-кэш (`provider:{id}:catalog`).
2. **Cherry-Pick Import:** Админ работает с витриной из Redis. В БД `Service` попадают ТОЛЬКО те услуги, которые админ выбрал вручную (с применением ИИ-маппинга категорий).
3. **Auto-Pricing Engine:** Запрещено вычислять маржу без учета кросс-курса ЦБ РФ (USD/RUB). Margin Worker должен не просто блокировать услугу при подорожании у провайдера, а **пересчитывать розничную цену** для сохранения процента маржи.
4. **Zombie Eraser:** Ночная синхронизация обязана помечать услуги как `isActive = false`, если провайдер удалил их из своего API.

### Pricing Model (CRITICAL)
**🔴 ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ по ценообразованию:**
1. **Провайдеры** хранят `rate` в **USD за 1000 штук** (индустриальный стандарт SMM-панелей).
2. **Каталог** (`src/actions/order/catalog.ts`) вычисляет два поля:
   - `pricePer1kRub` = `rate × markup × usdToRub` — **розничная цена за 1000 шт в рублях** (используется ТОЛЬКО для внутренних расчётов итоговой суммы).
   - `pricePerUnitRub` = `pricePer1kRub / 1000` — **цена за 1 штуку** (используется в UI).
3. **В UI пользователь ВСЕГДА видит цену за 1 штуку** (`pricePerUnitRub`), подпись: `₽ / шт`.
4. ❌ **ЗАПРЕЩЕНО** писать в UI `/ 1000 шт` или показывать `pricePer1kRub` напрямую пользователю.
5. ❌ **ЗАПРЕЩЕНО** вручную делить `pricePer1kRub / 1000` в компонентах — использовать `pricePerUnitRub`.

### Base UI Select (@base-ui/react) — ОБЯЗАТЕЛЬНЫЙ ПАТТЕРН
**🔴 `label` prop на `SelectItem` работает ТОЛЬКО для клавиатурного typeahead, НЕ для отображения текста в триггере.**
Для отображения человекочитаемого текста вместо raw CUID-значений используй **children-функцию** на `SelectValue`:
```tsx
<SelectValue placeholder="-- Выберите --">
  {(value: string) => {
    if (!value) return null;
    return items.find(item => item.id === value)?.name ?? value;
  }}
</SelectValue>
```
- ❌ **ЗАПРЕЩЕНО**: `<SelectValue />` (self-closing) при CUID-значениях — покажет raw ID.
- ❌ **ЗАПРЕЩЕНО**: полагаться на `label` prop для отображения в триггере.
- ✅ **ОБЯЗАТЕЛЬНО**: children-функция `{(value) => resolveLabel(value)}`.

### Link Analyzer targetType (CRITICAL)
**🔴 ОБЯЗАТЕЛЬНАЯ маппировка `targetType` для услуг:**
1. **`targetType`** определяет, какой тип ссылки ожидается от пользователя (канал, пост, профиль).
2. **Маппинг категория → targetType** (единственный источник правды — `src/utils/target-type.ts`):
   - `Подписчики / Участники / Бусты / Группы / Друзья` → `CHANNEL` (ссылка на канал/профиль)
   - `Лайки / Просмотры / Комментарии / Реакции / Репосты` → `POST` (ссылка на пост)
   - `Stories` → `STORY` (ссылка на профиль)
   - `Звёзды` → `CUSTOM`
3. ❌ **ЗАПРЕЩЕНО** писать `service.targetType || 'POST'` — это вызывает баг, при котором ссылки на каналы отклоняются для услуг Подписчиков.
4. ✅ **ОБЯЗАТЕЛЬНО** использовать `inferTargetTypeFromCategory(categoryName)` из `src/utils/target-type.ts` как fallback.
5. ❌ **ЗАПРЕЩЕНО** создавать услуги (seed, import, admin) без явного `targetType`. Prisma `@default("POST")` — аварийный дефолт, а не рабочий.

### File Structure
```
src/
├── actions/       # Server Actions (requireAdmin guard)
├── app/           # Pages & Layouts (App Router)
├── bot/           # Telegram Bot infrastructure (Telegraf, Scenes)
├── components/    # React Components
│   ├── admin/     # Admin panel components
│   └── landing/   # Client-facing and landing components
├── data/          # Static data or mocks
├── hooks/         # Custom React hooks
├── lib/           # Shared utilities (prisma client, auth, SMTP, Redis)
├── services/      # Business logic services (eta, financial, admin)
├── types/         # TypeScript type definitions
├── utils/         # Pure utility functions
├── validators/    # Zod schemas for forms and API validation
├── workers/       # BullMQ Background Workers (orders, tg_posts, etc.)
└── proxy.ts       # Proxy configurations
```

### Component Conventions
- HeroUI v3 dot notation: `<Table.Header>`, `<Dropdown.Menu>`, `<Modal.Content>`
- Кнопки: используй `variant` prop — не inline стили
- Таблицы: `<Table aria-label="...">` — aria-label обязателен
- Формы: `useActionState()` (React 19) вместо устаревшего `useFormState`

### Import Aliases
- `@/` → `src/`
- Пример: `import { prisma } from '@/lib/prisma'`

## Forbidden Patterns
- ❌ `"use server"` в файлах страниц (`page.tsx`)
- ❌ `forwardRef` (удалён в React 19 — используй прямой `ref` prop)
- ❌ `useFormState` (заменён на `useActionState`)
- ❌ `text-black`, `bg-white` как inline значения
- ❌ Файлы > 300 строк без декомпозиции
- ❌ `any` тип без обоснования в комментарии
- ❌ `console.log` в production коде (используй `console.error` для ошибок)
- ❌ Интеграция SMS-шлюзов или сбор/хранение номеров телефонов пользователей (включая request_contact в Telegram боте)

