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
- **AI Model**: `gemini-3-flash-preview` или `gemini-3-flash` (ТОЛЬКО эти модели)
- **Linting**: ESLint 10 (Flat Config — `eslint.config.mjs`)
- **Testing**: Vitest 4

## Architecture Rules

### Zero-Defect Execution Protocol (TRIPLE-AGENT STRATEGY)
**🔴 ОБЯЗАТЕЛЬНО для всех AI-агентов при обработке любого запроса:**

1. **Phase 1: Analyst (`gsd-prompt-engineer`)**:
   - ПЕРЕД любой работой задай уточняющие вопросы (3-5 шт).
   - Сформируй четкое ТЗ (UI-SPEC/API-SPEC).
   - Не начинай кодить, пока не будет "High-Definition" понимания задачи.

2. **Phase 2: Researcher (`gsd-research-autopsy`)**:
   - Проведи глубокий поиск (EN/RU).
   - Найди 3 подтверждения для каждой гипотезы.
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
