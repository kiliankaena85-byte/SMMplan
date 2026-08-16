# AGENTS.md — Smmplan AI Developer Contract (v4.0)
# Этот файл — единый источник правды для ЛЮБОГО AI-ассистента (Cursor, Claude Code, Gemini, Antigravity).
# Все генерируемые изменения ОБЯЗАНЫ строго соблюдать эти правила.

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

### Multi-Tenant Rules
- Проект обслуживает 2 бренда: **SMMplan** (`smmplan.pro`) и **SMMflux** (`smmflux.ru`).
- ❌ **Бренда Lovable НЕ существует.** Алиас `normalizeTenantId('lovable')` -> `'flux'` сохранен для обратной совместимости.
- ❌ **ЗАПРЕЩЕНО** хардкодить хосты (`smmplan.pro`, `smmflux.ru`) в коде. Использовать `getTenantHost(tenantId)`.
- ✅ **Canonical URLs** обязаны быть абсолютными через `absoluteCanonical(tenantId, path)`.
- ✅ Кэш-ключи в `unstable_cache` обязаны включать `tenantId` (например, `catalog-${tenantId}`).

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

## 3. Стандарты верстки, UX и взаимодействия (CRITICAL)

### Design System Tokens
- ❌ **НИКОГДА** не используй inline-цвета: `text-white`, `bg-black`, `text-blue-500`, `border-[1px]`.
- ✅ **ВСЕГДА** используй семантические токены из `globals.css`: `text-foreground`, `bg-background`, `bg-card`, `text-primary`, `text-muted-foreground`.
- Все интерактивные элементы обязаны иметь `transition-all duration-200`. Компоненты декомпозируются (до 150–200 строк).

### UX форм и валидации
- ❌ **ЗАПРЕЩЕНО** делать кнопки отправки (Submit / Оплатить / Сохранить) неактивными (`disabled`) при невалидных полях.
- ✅ Главные кнопки **ВСЕГДА активны**. При невалидной форме клик перехватывается (`e.preventDefault()`), вызывается `animate-shake` (с уникальным ключом `key={Date.now()}`) и плавный скролл (`scrollIntoView`) к первому ошибочному полю.
- ✅ Общие серверные ошибки отображаются **непосредственно над кнопкой Submit** в фокусе внимания пользователя.

### Пошаговый мастер заказа (Order Wizard)
- Заказ проходит строгие шаги: **1. Соцсеть** → **2. Категория** → **3. Услуга** → **4. Checkout** (Количество, Ссылка, Email).
- Поле «Количество» автоматически инициализируется минимальным значением (`service.minQty`).

---

## 4. Качество кода и чистота (Linting & Hygiene)

- ❌ **Strict Types:** Запрещено использовать `any` (`@typescript-eslint/no-explicit-any`). Используйте `unknown` с проверкой типов.
- ❌ **Clean Scope:** Удаляйте неиспользуемые импорты и переменные (`@typescript-eslint/no-unused-vars`).
- ❌ **No Useless Wrappers:** Запрещено писать `try { ... } catch (e) { throw e; }`.
- ❌ **React 19:** Запрещен `forwardRef` (используется прямой `ref`) и `useFormState` (используется `useActionState`).
- ✅ **Синтаксис батч-замен:** При использовании `multi_replace_file_content` всегда проверяйте баланс фигурных скобок `{}`.

---

## 5. Протокол работы с памятью и субагентами (Maker-Checker Loop)

1. **RAG & Память перед стартом:**
   - Перед сложными задачами выполните поиск по векторной памяти: `npx tsx scripts/query-rag.ts "<контекст>"`.
   - Проверьте выученные уроки в [`MEMORY.md`](file:///d:/SMM_plan_2/MEMORY.md).
2. **Закольцованный цикл (Skills > Agents):**
   - Для выполнения задач используйте регламент из `.agents/skills/iterative-loop-orchestrator/SKILL.md` (Orchestrator → Generator → QA Auditor).
   - Текущее состояние и замечания цикла фиксируются в `.planning/task_state.md`.
3. **Обязательная верификация перед сдачей:**
   ```bash
   npx tsc --noEmit           # 0 ошибок типизации
   npm run build              # Успешная сборка Next.js
   npx vitest run             # Прохождение юнит-тестов
   ```
4. **Фиксация опыта:** При решении сложных багов или принятии архитектурных решений сделайте короткую запись в [`MEMORY.md`](file:///d:/SMM_plan_2/MEMORY.md).
