# 🔬 АУДИТ МАГИСТРАЛИ `main` — архитектура, производительность, тенанты, визуал, код

**Дата:** 2026-09-23 · **Объект аудита:** `main` @ `c691e8b2` (не baseline `54b8a77f` — см. ре-базовую сверку)
**Метод:** статический анализ в изолированном worktree (`/tmp/main-wt`), прогон собственных линтеров проекта, разбор `prisma/schema.prisma`, анализ CI-прогонов GitHub Actions
**⚠️ Сначала прочитать:** [`audit/evidence/CORRECTION-2026-09-23.md`](audit/evidence/CORRECTION-2026-09-23.md) — часть выводов предыдущего аудита **отозвана** (денежный блок оказался артефактом окружения; CI подтверждает, что `tsc` на `main` проходит).
**Ограничения:** нет БД/Redis/браузера и нет движков Prisma → динамические замеры и визуальная съёмка не выполнялись; всё, что помечено 🟨, требует подтверждения на stage.

---

## 1. Главное в одном экране

| # | Находка | Приоритет | Доказательство |
|---|---|---|---|
| 1 | **CI на `main` красный 4 прогона подряд**: падает Vitest, из-за чего шаг сборки (`npm run build`) **никогда не выполняется** (skipped) | 🟥 P0 | Actions run `35757056292` и 3 предыдущих: `Run Vitest Suite → failure`, `Next.js Production Build Verification → skipped` |
| 2 | **ESLint-гейт отключён**: `npx eslint src/ --max-warnings=0 \|\| true` — линтер никогда не блокирует мерж, ошибки копятся (в тестах уже есть `prefer-const`, `no-empty` и др.) | 🟥 P0 | `.github/workflows/ci.yml:67`, аннотации check-runs по `c691e8b2` |
| 3 | **E2E не запускается в CI**, хотя в репозитории **68 спек-файлов** (`e2e/01…10` + остальное) | 🟥 P0 | `.github/workflows/ci.yml` содержит только vitest; `find e2e -name '*.spec.ts' → 68` |
| 4 | **81 из 115 страниц — `force-dynamic`** (70%): нет статики/ISR, каждый заход = серверный рендер + запросы к БД | 🟥 P0 (перф) | подсчёт по `page.tsx` на `main` |
| 5 | **46 из 87 моделей Prisma без `tenantId`**, из них **16 высокорисковых** (ссылаются на `User`/`Order`/`Payment`/`Ticket`) | 🟥 P0 (тенанты) | разбор `prisma/schema.prisma` |
| 6 | **33 вызова raw SQL (`$queryRaw`/`$executeRaw`) обходят tenant-enforcer** (Prisma-extension) — в т.ч. в финансовых сервисах | 🟥 P0 (тенанты) | grep по `src`; `src/lib/db.ts:118` подключает `createTenantEnforcerExtension()` |
| 7 | **347 предупреждений** собственного tenant-линтера на `main` (не «PASS»), в т.ч. `payment.update/ findUnique`, `ticket.findUnique`, `service.update` без `tenantId` | 🟥 P1 | `node scripts/lint-tenant-isolation.ts` → 347 `[WARNING]` |
| 8 | **Кэш `getCachedProviders` без tenant-скоупа** + модель `Provider` вообще не имеет `tenantId`: админ одного тенанта видит провайдеров всех | 🟥 P1 | `src/app/admin/orders/page.tsx:77-88` (ключ `['admin_orders_providers_list']`) |
| 9 | **`User.telegramId` без индекса**, хотя фильтруется в коде 22 раза (бот-сценарии) → seq scan на самой большой таблице | 🟥 P1 (перф) | schema: `telegramId String?` без `@@index`; подсчёт фильтраций |
| 10 | **Модель `Provider` не имеет ни одного индекса** | 🟠 P2 (перф) | schema: у `Provider` нет `@@index` |
| 11 | **253 `findMany` без `take`/`cursor`** — неограниченные выборки (растёт вместе с данными) | 🟠 P1 (перф) | статический подсчёт по `src` |
| 12 | **31 файл с `await db.` внутри цикла** (N+1-риск) | 🟠 P1 (перф) | статический подсчёт |
| 13 | **`/api/media`: JWT + `db.user.findUnique` на каждое изображение**; при этом `next/image` не используется нигде (0 импортов) при 24 тегах `<img>` → нет кэша и оптимизации | 🟠 P1 (перф/визуал) | `src/app/api/media/[...path]/route.ts`, grep по `<img>`/`next/image` |
| 14 | **Визуальные «доказательства» устарели**: `visual_audit_assets` (2026-06-11), `.planning/screenshots` (2026-08-21) старше последних рефакторингов `main` (2026-09-22) | 🟠 P1 (процесс) | `git log -1 -- visual_audit_assets` |
| 15 | **Обход дизайн-системы на `main`**: 1080 «сырых» HEX, 4363 произвольных Tailwind-значения, 93 inline-стиля | 🟠 P2 (визуал) | подсчёт по `src/**/*.tsx` |
| 16 | **39 тестов проверяют текст исходников** (`readFileSync` + `toContain`) — не ловят регрессии поведения | 🟠 P2 | grep по `src/__tests__`, `test/` |
| 17 | Тёмная тема: `secondary-foreground` на `secondary` = **4.42:1** (чуть ниже AA 4.5 для мелкого текста) | 🟡 P3 | расчёт контраста по токенам `.dark` |
| 18 | Godfiles остались: `academy-client.tsx` 2134, `bot/index.ts` 1680, `staff-schedule-tab.tsx` 1281, `plan-views.tsx` 1279 | 🟠 P2 | `wc -l` |

**Важное позитивное:** декомпозиция в `main` выполнена (годфайлы каталога/чекаута разрезаны: 2330→181, 1437→167), есть tenant-enforcer на уровне Prisma-extension, есть guardrails против безусловных `deleteMany` и запрет правки/удаления `LedgerEntry`, `tsc` в CI зелёный. То есть архитектурный каркас — рабочий; проблемы ниже — в покрытии, гейтах и точечных местах.

---

## 2. Почему «страницы и услуги стали долго подгружаться» — гипотезы с доказательствами

Жалоба подтверждается структурно: почти все страницы динамические, а на каждый запрос навешиваются дополнительные операции. Ниже — по убыванию вероятного вклада.

| ID | Причина | Доказательство | Как проверить на stage |
|---|---|---|---|
| **PERF-01** | **Нет кэша страниц.** 81/115 маршрутов `force-dynamic`; `export const revalidate` встречается лишь 6 раз, `revalidate=0` — 5 раз | подсчёт по `src/app/**/page.tsx` | `curl -w '%{time_total}'` по ключевым маршрутам; счётчик запросов к БД на рендер |
| **PERF-02** | **Каталог грузится тяжёлыми запросами с жёстким лимитом 500** (`CATEGORY_SERVICES_HARD_LIMIT = 500`) и `unstable_cache` c `revalidate` — при превышении лимита услуги «пропадают»/догружаются клиентом | `src/actions/order/catalog.ts:100-115` | замер P95 `/dashboard/new-order`, размер ответа, факт усечения каталога |
| **PERF-03** | **Медиа через API с проверкой прав на каждый файл**: JWT-верификация + запрос пользователя в БД, без `next/image` (0 импортов) и, вероятно, без длинного `Cache-Control` | `src/app/api/media/[...path]/route.ts:23-28`; 24 `<img>`, 9 обращений к `/api/media` | DevTools Network: время и кэш-заголовки картинок; число запросов к БД при загрузке галереи |
| **PERF-04** | **Отсутствующие индексы на горячих фильтрах**: `User.telegramId` (22 фильтрации), `Provider` (0 индексов при 19 фильтрациях `isActive`) | schema + подсчёт фильтраций в коде | `EXPLAIN ANALYZE` соответствующих запросов; `pg_stat_statements` |
| **PERF-05** | **N+1 (31 файл)** и **253 неограниченных `findMany`** — время растёт с объёмом данных | статический подсчёт | SQL-лог Prisma (`log: ['query']`) на 3-5 тяжёлых маршрутах |
| **PERF-06** | **Middleware 756 строк** с 5 динамическими импортами и Redis-проверками на запрос (honeypot/token-bucket) | `src/proxy.ts:358-394`, Redis-вызовы | замер латентности middleware (Server-Timing), сравнение с отключённым щитом на stage |
| **PERF-07** | **595 клиентских компонентов**, 58 из них тянут `framer-motion`; 0 динамических импортов (`dynamic(() =>` встречается 1 раз) → крупные бандлы на каждую страницу | подсчёт по `src/**/*.tsx` | размер First Load JS по маршрутам (билд-таблица Next), Lighthouse |
| **PERF-08** | **`<Suspense>` всего 19 раз на 115 страниц**, `loading.tsx` — 27 → нет стриминга тяжёлых блоков | подсчёт | визуальный замер TTFB/LCP с throttling |

**Рекомендация по приоритету:** сначала PERF-01 (ISR/revalidate для лендинга и каталога), PERF-04 (индексы), PERF-03 (кэш медиа), затем PERF-05/07. PERF-06 требует замеров, менять «на глаз» опасно (там защита от DDoS).

---

## 3. Изоляция тенантов (SMMplan / SMMflux)

**Как устроено сейчас (хорошо):** `src/lib/db.ts` создаёт клиент через `. $extends(createTenantEnforcerExtension())` — расширение автоматически добавляет `tenantId` в `where` и блокирует кросс-тенантные запросы (`SECURITY_TENANT_MISMATCH`), `findUnique` конвертируется в `findFirst` с тенантом.

**Три подтверждённые дыры:**

1. **TEN-01. Raw SQL обходит enforcer.** 33 вызова `$queryRaw`/`$executeRaw`/`$queryRawUnsafe` в `src` (без тестов), в том числе: `src/services/financial/accounting.service.ts`, `ledger-reconciliation.service.ts`, `liquidity-monitor.service.ts`, `src/services/admin/escrow.service.ts`, `src/actions/admin/analytics.action.ts`, `src/bot/scenes/owner-hub.wizard.ts`. Расширение Prisma не видит сырые запросы — изоляция там зависит только от ручного `tenantId` в SQL.
   *Что делать:* инвентаризировать каждый вызов, ввести обязательный `tenantId` в SQL-параметры и AST-правило «raw SQL без `tenant_id` → блокер».

2. **TEN-02. Кэш без тенант-ключа.** `src/app/admin/orders/page.tsx:77` — `unstable_cache(..., ['admin_orders_providers_list'], { tags: ['providers'] })`, в `where` только `isActive`. Модель `Provider` вообще без `tenantId` (46 моделей без него). Итог: список провайдеров общий для всех тенантов и кэшируется глобально.
   *Что делать:* либо `tenantId` в `Provider` + ключ/тег кэша, либо явное решение «провайдеры — глобальная сущность» с фильтрацией на уровне связей и отдельным правилом для админ-видимости.

3. **TEN-03. 46 моделей без `tenantId`, 16 — высокорисковые.** `ApiConfig, Session, Provider, Refill, Invoice, SystemSettings, TicketMessage, AuditLog, Commission, SmartCampaign, PromoCodeUsage, UserNote, StaffShift, LedgerPeriod, OrderRecoveryIncident, CxApologyCompensation`.
   Особо: `Refill`, `Invoice`, `PromoCodeUsage`, `TicketMessage`, `AuditLog`, `UserNote`, `StaffShift`, `PiiAccessLog` — персональные/финансовые данные, изоляция которых держится только на связях и на коде.

**Плюс:** собственный линтер `lint-tenant-isolation.ts` **работает и показывает 347 предупреждений** на `main` (инвентарь — 437 файлов). Проблема лишь в том, что гейт не блокирует и вердикт формулируется как «некритические предупреждения». Точечные примеры: `src/actions/admin/balance-adjustments.ts` (`user.findUnique`, `ticket.findUnique`, `payment.findUnique`, `payment.update` без тенанта), `src/actions/admin/catalog/batch.ts:124` (`service.update` без тенанта), `src/actions/admin/ai-manual/*`.

---

## 4. Визуал и UX

| ID | Находка | Статус | Комментарий |
|---|---|---|---|
| VIS-01 | Обход дизайн-системы: 1080 raw HEX, 4363 arbitrary-значений, 93 inline-стиля на `main` | 🟥 подтверждено | Есть токены в `globals.css` (light + `.dark` + tenant-темы `smmflux`), но код их обходит → расхождения между экранами и «плывущая» тёмная тема |
| VIS-02 | Тёмная тема: `--color-secondary-foreground #38bdf8` на `--color-secondary #0c4a6e` = **4.42:1** | 🟥 подтверждено расчётом | Ниже AA (4.5:1) для обычного текста; для крупного — проходит |
| VIS-03 | Токен `--color-content3 #2d3a4e` на фоне `#0f172a` = 1.55:1 | ⚪ не дефект | Это фон-поверхность; **если** используется как цвет текста — дефект, нужна проверка |
| VIS-04 | Медиа без `next/image` (0 импортов, 24 `<img>`) + отдача через API с проверкой прав | 🟥 подтверждено | Влияет на LCP и на количество запросов; нет responsive-картинок |
| VIS-05 | Визуальные доказательства устарели (скриншоты июня/августа против `main` от 22.09) | 🟥 подтверждено | Отчёт `STAGE_VISUAL_AUDIT_REPORT.md` («6/6 PASS») описывает 6 экранов и старую ревизию |
| VIS-06 | 701 использование `dark:` при 1080 «сырых» HEX | 🟨 требует проверки | Покрытие тёмной темы есть, но обход токенов делает проверку на реальных экранах обязательной |
| VIS-07 | Живая визуальная проверка не выполнялась | 🟨 | В песочнице нет браузера; нужен прогон Playwright/Puppeteer на stage 3005 по матрице 20 экранов × 5 брейкпоинтов |

---

## 5. Архитектура и код

**Что стало явно лучше на `main`:** каталог и чекаут разрезаны (`catalog.service.ts` 2330→181, `checkout.ts` 1437→167, `useOrderEngine` 1000→372), варианты чекаута сведены к одному, `FluxDashboardOrderWizard` 1377→150, гигиен-тест зелёный, `ignoreBuildErrors: false`.

**Что осталось:**

| ID | Находка | Доказательство |
|---|---|---|
| ARCH-01 | Godfiles: `academy-client.tsx` 2134, `bot/index.ts` 1680, `staff-schedule-tab.tsx` 1281, `plan-views.tsx` 1279, `dashboards.tsx` 1078, `role-handlers.ts` 1074, `flux-views.tsx` 1065, `actions/admin/users.ts` 1049 | `wc -l` по `main` |
| ARCH-02 | 345 файлов > 200 строк (контракт проекта — ≤200) | подсчёт |
| ARCH-03 | Дубли доменных операций: 4 × `normalizeTenantId`, 2 × `cancelOrderAction`/`restartOrderAction` (разные контракты ответа), 3 × журнал транзакций | grep по экспортам |
| ARCH-04 | 595 клиентских компонентов на 115 страниц; 1 динамический импорт на весь проект | подсчёт |
| ARCH-05 | 39 тестов-снапшотов по тексту исходников — «зелёные», но не защищают поведение | grep |
| ARCH-06 | 87 диагностик `tsc` при типовом стабе, из них подавляющее большинство — артефакты стаба (`_count` в include, отсутствующие члены `Prisma.*`, DI-швы); в CI `tsc` зелёный | см. `docs`-раздел ниже, требуют ручной сверки лишь 3-4 места |
| ARCH-07 | `User.telegramId`, `Provider` без индексов; 253 неограниченных `findMany`; 31 N+1 | статический подсчёт + schema |

**Кандидаты в реальные дефекты кода (нужна ручная сверка, приоритет средний):**
1. `src/app/admin/marketing/promocode-columns.tsx:219,232,272` — расчёт LTV/ROMI: в тип попадает `number | bigint`; если в клиент приходит `BigInt`, выражение `sum + revenueCents` на рантайме бросит `TypeError: Cannot mix BigInt and other types` (админ-страница маркетинга). Проверять на сервере: как маппятся `usages` перед передачей в таблицу.
2. `src/actions/knowledge.ts:386` — push объекта из 4 полей в массив статей (со стабом ошибка; с реальным клиентом зависит от `select`).
3. `src/actions/admin/users.ts:129` — `policyCheck.allowed` при объявленном `| null`.
4. `src/services/admin/ticket.service.ts:426,439` — передача `TicketMessageModel` в функцию с ожидаемым `Record<string, unknown> & {...}`.

---

## 6. CI/CD — почему проблемы доезжают до `main`

| ID | Находка | Доказательство |
|---|---|---|
| CI-01 | **Vitest красный 4 прогона подряд**; из-за этого `npm run build` (Next) в CI **никогда не проверяется** | run `35757056292` + 3 предыдущих |
| CI-02 | **ESLint отключён от гейта**: `npx eslint src/ --max-warnings=0 \|\| true` | `ci.yml:67` |
| CI-03 | **`npm audit ... \|\| true`** — аудит зависимостей не блокирует | `ci.yml:58` |
| CI-04 | **E2E (68 спек-файлов) не запускается в CI вообще** | `ci.yml` |
| CI-05 | Deploy-workflow (`deploy-server.yml`) собирает на хосте и деплоит; последние прогоны — `queued`/`cancelled` → фактический релиз не подтверждён зелёным пайплайном | `gh run list --branch main` |
| CI-06 | В CI нет замеров производительности/бюджетов (Lighthouse/размер бандла/время ответа) | `ci.yml` |
| CI-07 | Историю Git в клоне проекта иногда обрезают (был shallow — 2 grafted-коммита) → дифф-анализ регрессий ломается | `.git/shallow` в baseline-ветке |

---

## 7. План действий (после согласования; по фазам)

### Фаза A — восстановить сигналы (1–2 дня, без изменения продуктовой логики)
1. **Починить Vitest** — это блокирует всё остальное: `Build & Verify Test Suite` должен стать зелёным, и только тогда включится проверка сборки. Начать с получения списка падений (лог CI недоступен из песочницы — прогнать сьют на stage/локально с реальным Prisma Client и Postgres).
2. **Убрать `|| true` из ESLint-гейта** (сначала для новых/изменённых файлов, чтобы не получить красный CI на всём объёме).
3. **Включить e2e-smoke в CI** (минимальный набор: заказ с лендинга, дашборд-заказ, оплата+вебхук, отмена/возврат).
4. **Включить проверку сборки** независимо от тестов (или хотя бы `next build` в отдельной джобе), чтобы `build`-регрессии не проходили молча.

### Фаза B — производительность (3–5 дней)
5. `PERF-01`: ISR/`revalidate` для лендинга, категорий и SEO-страниц; вынести динамику только туда, где нужен пользовательский контекст.
6. `PERF-04`: индексы `User.telegramId`, `Provider.isActive` (+ проверить `Service.cooldownUntil`, `Payment.gateway`, `ContentItem.isPublished`); миграция Expand/Contract + `CREATE INDEX CONCURRENTLY`.
7. `PERF-03`: кэш-заголовки и `next/image` (или ресайз на выдаче) для медиа; убрать обязательный DB-запрос из горячего пути картинок.
8. `PERF-05`: устранить N+1 и добавить `take`/keyset-пагинацию в неограниченные выборки (начать с 31 файла N+1 и sitemap).
9. **Замерная база:** `pg_stat_statements` top-20, P95 ключевых маршрутов, размер First Load JS, Lighthouse mobile — до/после.

### Фаза C — тенант-изоляция (3–5 дней)
10. `TEN-01`: инвентарь 33 raw-SQL мест → обязательный `tenant_id` в параметрах + AST-правило «raw SQL без tenant → блокер».
11. `TEN-02`: `Provider` и кэш провайдеров — либо tenant-скоуп, либо явная политика «глобальный справочник» + отдельный тест на видимость.
12. `TEN-03`: матрица «46 моделей → стратегия изоляции»; для высокорисковых — миграция Expand/Contract (добавить `tenantId`, бэкфилл из связей, индексы, затем фильтр).
13. Сделать tenant-линтер блокирующим для изменяемых файлов; публиковать число подавлений в отчёте.

### Фаза D — визуал/UX (2–4 дня)
14. Матрица 20 экранов × 5 брейкпоинтов на stage (Playwright), включая обе темы и оба тенанта; обязательные проверки: горизонтальный скролл, наложения, контраст ≥4.5:1, тач-таргеты ≥44px.
15. Починить `secondary-foreground` в тёмной теме (4.42:1).
16. Токенизация: запрет новых «сырых» HEX/arbitrary-значений в изменяемых файлах (ESLint-правило), отдельный бэклог на расчистку.

### Фаза E — архитектура и код (параллельно, по одному модулю)
17. Дубли: единый `normalizeTenantId`, единый контракт cancel/restart, единый журнал транзакций.
18. Годфайлы: `academy-client.tsx`, `bot/index.ts`, `staff-schedule-tab.tsx` — резать по одному, с поведенческими тестами (это же лекарство от прежнего отката).
19. Снапшот-тесты (39) → ESLint/ast-grep правила + поведенческие тесты.

---

## 8. Что нужно для подтверждения (stage / CI, где есть движки и БД)

```bash
# 1. Тесты и сборка (главный блокер)
npm ci --legacy-peer-deps && npx prisma generate
npx vitest run --reporter=verbose        # получить список падений CI
npm run build                             # проверить, что прод-сборка проходит

# 2. E2E
npm run test:e2e                          # 68 спек-файлов: прогнать хотя бы 01,03,04,06,08

# 3. Перформанс
curl -w '%{time_total} %{time_starttransfer}\n' -o /dev/null -s https://<stage>/ , /dashboard, /dashboard/new-order
psql -c "SELECT query, total_exec_time, calls FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;"
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "User" WHERE "telegramId" = '...';   -- доказать seq scan
# DevTools: размер First Load JS, заголовки /api/media, LCP на мобильном профиле

# 4. Тенанты
node scripts/lint-tenant-isolation.ts | grep -c WARNING        # сейчас 347
grep -rn '\$queryRaw\|\$executeRaw' src --include=*.ts | grep -v __tests__   # 33 места — сверить tenant_id

# 5. Визуал
npx playwright test e2e/01-customer-order-flow.spec.ts          # + скриншоты по матрице
```

---

## 9. Артефакты этого аудита

| Файл | Что внутри |
|---|---|
| `audit/evidence/CORRECTION-2026-09-23.md` | Отзыв ошибочных находок (денежный блок) и методологический урок |
| `audit/evidence/rebaseline-vs-main-2026-09-23.md` | Сверка baseline ↔ `main`: что исправлено, что живо |
| `audit/evidence/tsc-structural-errors-main-2026-09-23.md` | 43 диагностики `main` без стаба (для сравнения) |
| `audit/evidence/findings-main-2026-09-23.json` | Реестр находок этого аудита (машиночитаемый) |
| `audit/tools/prisma-type-stub.py` | Генератор типового стаба из `schema.prisma` (только для аудита) |
| `audit/tools/prisma-runtime-stub.js` | Рантайм-стаб `PrismaClient` для импорта модулей без движков (только для аудита) |
