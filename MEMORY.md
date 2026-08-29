# MEMORY.md — Долгосрочная база знаний и выученные уроки Smmplan

Этот файл аккумулирует проверенные архитектурные решения, выученные уроки, специфику компонентов и решенные инциденты, чтобы агенты не повторяли прошлые ошибки.

---

## 1. 🏗️ Архитектурные решения (ADR)

- **PostgreSQL Serializable Isolation vs MutexManager:**
  - *Решение:* Отказ от распределенных Redis-блокировок (`MutexManager`) в финансовых операциях (`WalletOps`) в пользу нативной транзакционной изоляции PostgreSQL Serializable с автоматическим retry при serialization failure.
  - *Причина:* Предотвращение Race Conditions и дрейфа баланса без накладных расходов на Redis lock management.

- **SMMplan Order Modal UX/UI Transparency & Price Contract (Multi-AI Optimization):**
  - *Решение:*
    1. `DrawerQuantityCard`: базовый бэйдж цены отображает строго розничную цену за штуку (`selectedService.pricePerUnitRub ₽ / шт`). Если действует скидка за объем или промокод (`discountCents > 0`), экономия отображается выделенным бейджем `Скидка −X ₽`. В `handleInputBlur` внедрен автокламп с учетом Drip-Feed множителя.
    2. `DrawerFooter`: при наличии скидки выводится перечеркнутая базовая сумма и процент экономии (`−X%`). Кнопка подтверждения оплаты остается активной без блокирующего disabled стейта.
    3. `DrawerFormInputs`: в поле кастомных комментариев встроен живой счетчик строк и валидатор минимального объема (`linesCount` / `minQty`), а для опросов (`isPoll`) добавлена поясняющая подсказка.
  - *Причина:* Полная прозрачность ценообразования для клиентов, устранение когнитивного трения и соответствие дизайн-системе B2B/витрин 2026 года.

- **Security-by-Design, Pentest Immunity & OWASP Top 10:2025 Architecture:**
  - *Решение:*
    1. **Zero-Secrets in Client Bundles:** Категорический запрет любых переменных с секретами в клиентских компонентах Next.js (`NEXT_PUBLIC_*`). Все отладочные/QA флоу изолируются в Server Actions с валидацией через `crypto.timingSafeEqual`.
    2. **OWASP Top 10:2025 / PCI DSS 4.0 Standard:** Проект обязан проходить пентесты со 100% успехом: требование TLS 1.2/1.3, CSP без небезопасных wildcard (`wss:`), RFC 9116 (`/.well-known/security.txt`), RFC 9331 (заголовки RateLimit на публичных API).
    3. **Symmetric Cookie Sanitation:** При выходе или сбросе сессии кука `session_token` обязана очищаться с полным набором атрибутов: `Secure; HttpOnly; SameSite=Lax; MaxAge=0; Expires=0; Path=/`.
    4. **Information Disclosure Prevention:** Публичный `robots.txt` не должен содержать внутренние пути (`/dev`, `/test`, `/operator`, `/client-demo`). Скрытие приватных страниц реализуется через `X-Robots-Tag: noindex, nofollow`.
    5. **Granular RBAC Enforcement:** Разграничение прав ролей (`OWNER`, `ADMIN`, `MANAGER`, `SUPPORT`, `CASHIER`, `USER`) на уровне каждого Server Action через `requireStaffPermission()`.
  - *Причина:* Соответствие мировым стандартам кибербезопасности 2026 года и исключение любых замечаний на пентестах.

- **Ledger-First Transaction Integrity & Zero-Escape Security Invariants:**
  - *Решение:* 
    1. Исключены Transaction Escapes в `WalletOps` — все операции, включая catch-блоки duplicate key P2002, выполняются строго через `tx: PrismaTx`, никогда не переключаясь на глобальный `db`.
    2. Внедрен инвариант `Ledger-First` — запись в `LedgerEntry` создается ДО мутации баланса `User.balance`.
    3. Разрешение `tenantId` в финансовых операциях строго через цепочку: `tenantId || user?.tenantId || 'smmplan'`.
    4. Все вебхуки (YooKassa, Telegram, Provider) переведены в строгий `fail-closed` режим со сравнением секретов через `timingSafeEqual`.
    5. Исключены любые fallback-секреты для `NEXT_PUBLIC_*` переменных во избежание утечки в клиентские JS-бандлы.
    6. **Guest-Proof IDOR Shield:** При проверке прав доступа на объекты с `userId`, если объект принадлежит пользователю, неавторизованные гости безусловно отсекаются: `if (item.userId && (!sessionUser || item.userId !== sessionUser.id))`.
    7. **Provider Webhook State Boundary:** Вебхуки провайдеров имеют право обновлять только оплаченные заказы (`IN_PROGRESS`, `PENDING_CHECK`), исключая `AWAITING_PAYMENT` и `PENDING`.
    8. **Next.js 16 Routing Convention:** Использовать строго `src/proxy.ts`. Попытки вернуть `src/middleware.ts` блокируются как устаревшие для Next.js 16.
  - *Причина:* Гарантия финансовой консистентности, соблюдение OWASP Top 10 2026 и исключение возможности подделки вебхуков или дрейфа баланса.

- **Zero-Trust Provider Webhooks & Cryptographic Isolation:**
  - *Решение:* Вебхуки провайдеров (`/api/webhooks/vexboost`, `/api/webhooks/provider/[providerName]`) никогда не принимают статус заказа и параметры возврата средств на веру из входящего HTTP payload. Обработчик проверяет HMAC/секрет (`timingSafeEqual`) и свежесть `x-timestamp` (5 мин), после чего выполняет синхронный запрос к API провайдера (`getMultiOrderStatus`) и применяет статус в транзакции через `RefundPolicyService`.
  - *Причина:* Защита от фальсификации вебхуков, подделки возвратов и манипуляции балансом.
  - *IP Extraction:* Извлечение IP клиента (`src/utils/ip.ts`) нормализует IPv4-mapped IPv6, выбирает правый доверенный хоп из `x-forwarded-for` и использует `0.0.0.0` в качестве fallback.

- **Shadow Catalog (Cherry-Pick Architecture):**
  - *Решение:* Каталоги провайдеров (5000+ сырых услуг) буферизуются во временный Redis-кэш (`provider:{id}:catalog`). В таблицу `Service` PostgreSQL импортируются ТОЛЬКО вручную одобренные администратором услуги с авто-пересчетом маржи по кросс-курсу ЦБ РФ.
  - *Причина:* Защита базы данных от мусора и рассинхронизации.

- **Adaptive Relay Proxy Chaining & Latency Arbiter (Mihomo/Clash Dial-Proxy Style):**
  - *Решение:* Реализовано двухуровневое каскадное туннелирование SOCKS5-over-SOCKS5 (`ChainedProxyService`): `Сервер в РФ -> Hop 1 (Quattro VPN Europe) -> Hop 2 (Free Public USA/Global) -> Target Provider API / Telegram`.
  - *Причина:* Полный обход блокировок ТСПУ/РКН и доступ к зарубежным прокси/сервисам, недоступным напрямую из РФ, с расширением пула адресов до 5000+ бесплатных нод.
  - *Dynamic Latency Matrix:* `ProxyPingMatrixService` отслеживает пинг цепочек в Redis, блокирует деградировавшие узлы ($T > 350\text{ms}$) и реализует `Sticky Route Affinity` (5 мин) с мгновенным переключением при сбоях (Circuit Breaker).
  - *Chaos & Socket Safety:* 100% изоляция сокетов с обязательным `socket.destroy()` в `finally`, защита от утечек дескрипторов при 100 concurrent requests, строгая валидация TLS (`rejectUnauthorized: true`).

- **Dual-Brand Customer Funnel & Drip-Feed Allocation Armor:**
  - *Решение:* Полное разделение воронок оформления заказов для SMMplan (B2B оптовый портал) и SMMflux (Aurora 1-Click розничный UI) с сохранением сквозного ценообразования за единицу (`₽ / шт`) и финансовой защиты через `WalletOps.charge()` / `WalletOps.refund()`.
  - *Drip-Feed Allocation:* Алгоритм `SmartDripService.generateTaskDistribution` производит математическое квантование общего объёма на случайные чанки в границах `[minChunk, maxChunk]` с равномерно-случайным распределением по времени.
  - *Partial Refunds:* При досрочной отмене Drip-Feed кампании средства за невыполненные запуски автоматически возвращаются на баланс пользователя в копейках (`BigInt`) с уникальным `idempotencyKey`.

- **UI Pricing Contract:**
  - *Решение:* В UI всегда выводится цена за 1 штуку (`pricePerUnitRub` = `pricePer1kRub / 1000`), подпись строго: `₽ / шт`.
  - *Табу:* Никогда не писать `/ 1000 шт` и не умножать цену на 1000 на стороне клиента.

- **Multi-Tenant Routing & Равноправие брендов (No B2B Classification):**
  - *Решение:* В платформе OmniSMM 1.0 **нет деления на B2B и B2C**. Есть **два равноправных независимых тенанта**: **SMMplan** (`smmplan.pro`) и **SMMflux** (`smmflux.ru`). Бренда Lovable больше нет (алиас `lovable` мапится на `flux`).
  - *Инвариант:* Запрещено называть SMMplan «B2B-платформой», а SMMflux «B2C/розничной витриной». Это просто два разных тенанта со своей визуальной идентичностью и аудиторией на общем ядре OmniSMM.
  - *Бэклог:* Запланировано удаление устаревших упоминаний `b2b` из кода и документации (замена на Panel API / SMM API v2, `api-auth`, `apiRequestLog`).
  - *Правило:* Canonical URLs всегда абсолютные через `absoluteCanonical(tenantId, path)`. Хардкод хостов запрещен.

- **Cloudflare Tunnel (cloudflared) Exclusivity:**
  - *Решение:* Для проброса портов, удаленного доступа и веб-превью используется **СТРОГО И ИСКЛЮЧИТЕЛЬНО** официальный Cloudflare Tunnel (`cloudflared.exe tunnel --no-autoupdate run --token ...`). Скрипт быстрого запуска сохранен в `scripts/start-tunnel.ps1`. Домен стенда: `https://test.smmplan.pro`.
  - *Табу:* Категорически запрещено использовать сторонние туннели (SSH reverse tunnels, ngrok, localtunnel и прочее). Всегда запускать и проверять `cloudflared.exe`.

- **4-Level Taxonomy & Smart Provider Matcher:**
- **Automated Category Auto-Creation & Catch-All Taxonomy Protection:**
  - *Решение:*
    1. **Level 1 (Data Migration):** Скрипт `scripts/fix-catchall-categories.ts` разбивает catch-all категории на целевые по `activityType` (SUBSCRIBERS, LIKES, VIEWS, REACTIONS, BOOSTS, BOTS, etc.) на основе нормализованных данных `ShadowService` и JSON-поля `features.category`.
    2. **Level 2 (UI Shield):** В `ImportWizard` встроен детектор `detectMixedCategoryTypes`, который выявляет попытки импортировать разнородные типы услуг в одну категорию и отображает интерактивный предупреждающий баннер со структурой типов.
    3. **Level 3 (Backend Auto-Split):** В `catalog.service.ts` метод `ensureCategoryForActivityType` автоматически создает и связывает отдельные категории по типам активности для соцсети при импорте, предотвращая появление "свалок" услуг.
  - *Причина:* Исключение деградации UX в визарде заказа (`/dashboard/new-order`), когда при выборе соцсети отображается одна категория со всеми услугами вперемешку.
- **Modal Hoisting & Global Portal Boundary Rule:**
  - *Решение:* Модальные окна (`Modal`, `Dialog`) категорически запрещено рендерить внутри контекстных дропдаунов (`DropdownMenuContent`, `Popover`, `Tooltip`). Состояние открытия модалов всегда поднимается на уровень экрана (`State Lifting` в `unified-workspace.tsx` или через глобальный store), а кнопки дропдауна вызывают колбэки `onOpenModal={() => ...}`.
  - *Причина:* Закрытие `DropdownMenu` при клике немедленно анмаунтирует всё своё поддерево, приводя к крашу `Modal` или зажатию модалки в узких границах контейнера (`Context Clamping`).

- **Idempotent Telegram Daemon Polling:**
  - *Решение:* Запуск поллинга `bot.launch()` ВСЕГДА предваряется сбросом вебхуков: `await bot.telegram.deleteWebhook({ drop_pending_updates: true })` и запускается с `{ dropPendingUpdates: true }`.
  - *Причина:* Предотвращение зависания зомби-сессий и фатальной ошибки `409 Conflict: terminated by other getUpdates request` при перезапусках процессов.

- **Viewport Resiliency & Header Toolbar Density:**
  - *Решение:* Запрещено нанизывать более 3 фиксированных элементов с `w-max` / `min-w` в одной flex-строке без `min-w-0` и `truncate`. Все второстепенные статусы и действия на экранах `< 1536px` группируются в выпадающее меню «Меню ⌵».
  - *Причина:* Устранение перекрытий текста, кнопок и цен на экранах ноутбуков (1024–1440px) при открытых сайдбарах.

- **Telegram Daemon Architecture & Webhook Coexistence:**
  - *Решение:* Поддержка двойного режима Telegram: Long Polling демон в контейнере `bot` (`docker-compose.prod.yml` / `staging.yml`) с Redis heartbeat (`bot:heartbeat` каждые 30с) + резервный HTTP Webhook эндпоинт `/api/webhooks/telegram` с проверкой `x-telegram-bot-api-secret-token`. Токен бота хранится зашифрованным в `SystemSettings.telegramBotToken` (AES-256-GCM) с fallback на `.env`.
  - *Причина:* Полная автономность бота в продакшене без зависаний, отсутствие крашей из-за хардкодных путей Windows и возможность настройки токена прямо из UI.

- **E2E Test Suite Golden Standard Architecture (Blocks 1–6):**
  - *Решение:* Полная реорганизация сквозных тестов Playwright:
    1. 35+ устаревших spec-файлов изолированы в `e2e/_legacy/` с исключением из раннера (`testIgnore`).
    2. Реализована чистая модульная структура с 6 основными блоками:
       - `01-customer-order-flow.spec.ts`: Оформление гостем и авторизованным клиентом, списание баланса через `WalletOps`, Zero-Defect UX при нехватке средств.
       - `02-admin-services-lifecycle.spec.ts`: Добавление провайдера с шифрованием ключей Vault, поштучный импорт в черновики, diff-аудит, SSRF-защита ссылок, воркфлоу промоушена и B2B скидки.
       - `03-billing-and-payments.spec.ts`: UI-депозит, идемпотентность вебхуков YooKassa/CryptoBot, расчет НДС 2026 (22% / УСН без НДС `vat_code: 1`).
       - `04-orders-fulfillment-queue.spec.ts`: Очереди выполнения, 100% авто-возврат при `CANCELED`, пропорциональный возврат при `PARTIAL` (`remains / qty * charge`), модель резервных провайдеров.
       - `05-support-and-tickets.spec.ts`: Создание тикетов, треды сообщений USER ↔ STAFF, закрытие и строгая мульти-тенантная изоляция (`smmplan` vs `flux`).
       - `06-rbac-and-security.spec.ts`: Иерархия ролей RBAC, раундтрип шифрования AES-256-GCM Vault (`iv:authTag:ciphertext`), неизменяемый журнал `AdminAuditLog` со скраббингом ключей, изоляция границ данных.
    3. Все 26 тестов работают стабильно и проходят на 100% в изолированном тестовом окружении.

- **YooKassa Fail-Safe Security & Signature Verification:**
  - *Решение:* Запрет скрытого fallback на mock-payment в продакшене (выброс явного диагностического исключения). Fallback чтения ключей из `.env` при пустой БД. Расширение IP allowlist всеми 5 официальными подсетями YooKassa (`185.75.120.0/22`, `37.110.12.0/22`, `37.110.16.0/22`, `193.106.92.0/22`, `91.232.108.0/22`) и поддержка HMAC-SHA256 проверки вебхуков `x-content-signature`.

- **Full Security Remediation & Hardening (SMMPLAN_AUDIT_REPORT.md):**
  - *Решение:*
    1. Устранены все хардкоды API-ключей провайдеров и тестовых ключей эквайринга в пользу строгого чтения из `process.env` с `fail-closed` проверкой.
    2. Ликвидированы бэкдоры dev-эндпоинтов (`/api/dev/*`, `/api/debug`): в production-окружении возвращается 404/403, устранены `host.includes` обходы и дефолтные мастер-ключи.
    3. Вебхуки провайдеров (`/api/webhooks/provider/[providerName]`, `/api/webhooks/yookassa`, `/api/webhooks/inbound-email`) переведены в режим `fail-closed` с обязательной валидацией HMAC/SHA-256 подписей и `crypto.timingSafeEqual`.
    4. Шифрование (`encryption.ts`) переведено на fail-fast (выброс исключения при отсутствии мастер-ключа или повреждении ciphertext вместо возврата открытого текста). Удален fallback `smmplan_dev_salt_seed`: соль деривируется строго из ключа шифрования либо `DATA_SALT`. `encryptProviderSecret` и `decryptProviderSecret` строго валидируют непустые входные строки.
    5. Распределенный `MutexManager` переписан на безопасную модель Redlock с уникальным UUID-токеном владельца и Lua compare-and-delete релизом для исключения случайного снятия чужих блокировок после истечения TTL.
    6. В B2B API (`/api/v2`) внедрена проверка активного статуса пользователя (`isActive`, `!isDeleted`, role != BANNED) и per-IP rate-limiting на неудачные попытки авторизации с фиксацией `SecurityEvent`.
    7. Multi-stage Dockerfile дополнен таргетом `worker-runner`, исключающим скачивание пакетов на лету в проде.
    8. Сканер `verify-no-secrets.js` расширен для одновременного сканирования `.next/static` и `.next/server` с фильтрацией библиотечных сигнатур и проверкой реальных RSA/EC ключей. В вебхуке `/api/webhooks/provider` запрещен секрет в query params `?secret=`.

- **Next.js 16 Standalone Bundling & Webpack Reliability:**
  - *Решение:* Для standalone-образа в Docker используется сборка через Webpack (`next build --webpack`), а из `serverExternalPackages` в `next.config.mjs` исключены стандартные JS-библиотеки (`ioredis`, `sanitize-html`, `bullmq`).
  - *Причина:* Turbopack в Next.js 16 при наличии внешних зависимостей генерирует хэшированные имена модулей (`module-<hash>`), вызывая фатальный `500 Internal Server Error: Cannot find module` в изолированном контейнере.

- **Server Action Safe Error Response Contract:**
  - *Решение:* Запрет `throw new Error(...)` в Server Actions. Все экшены возвращают структурированный `{ success: false, error: '...' }`.
  - *Причина:* Next.js в production маскирует все необработанные исключения в `"An unexpected response was received from the server."`, скрывая полезный текст ошибки от пользователя и оператора.

- **Task & Polling Daemon Hygiene:**
  - *Решение:* Автоматический запуск бота перенесен внутрь Next.js рантайма через `instrumentation.ts` в контейнере `smmplan_web`. Локальные фоновые процессы бота на хосте принудительно останавливаются, чтобы не создавать конфликт поллинга `409 Conflict`. Все временные отладочные команды завершаются немедленно.

- **`middleware.ts` → `proxy.ts` Migration (Next.js 16, официальная документация):**
  - *Решение:* `middleware.ts` официально устарел в Next.js 16. Файл переименован в `proxy.ts`, функция — из `middleware()` в `proxy()`. Автоматическая миграция: `npx @next/codemod@latest middleware-to-proxy`.
  - *Правило:* В проекте SMMplan пока используется `middleware.ts` с deprecation-предупреждением. Миграцию выполнить при ближайшем удобном обновлении.

---

## 1.1 📰 Официальный дайджест знаний — август 2026

### Next.js 16.3 (вышел 3 августа 2026 г.)
| Новшество | Описание |
|---|---|
| **Cache Components + Partial Prefetching** | SPA-навигация при сохранении преимуществ Server Components. Немедленная реакция на переходы. |
| **Dev RAM −90%** | Длительные dev-сессии потребляют значительно меньше памяти. |
| **Repeat builds cache** | Повторные сборки читают артефакты из кэша — выраженное ускорение CI/CD. |
| **TypeScript 7 Support** | `next build` поддерживает TS 7 для ускоренного тайпчека. |
| **Root Params** | Параметры вида `[lang]` доступны в любом Server Component без дополнительной передачи через props. |
| **Custom Error Boundaries** | Приложение может восстанавливаться от серверных ошибок через повторный fetch. |
| **SSR +22% throughput** | Сервер обрабатывает на 22% больше запросов под нагрузкой. |

> ⚠️ **Критический патч безопасности Next.js 16.3.3 запланирован на 26 августа 2026 г.**
> Уязвимость высокого приоритета в Next.js 16.3 и Next.js 15.5. Версии: **16.3.3** и **15.5.24**.
> Обновить как только патч выйдет: `npm install next@16.3.3`.

### Официальные инварианты по сборке (Turbopack vs Webpack — август 2026)
- **Статус:** Turbopack — дефолтный компилятор в Next.js 16 для dev и prod. Однако standalone-сборка через Turbopack имеет **регрессию**: внешние зависимости в `serverExternalPackages` получают хэшированные имена (`module-<hash>`), которые не разрешаются в Docker-контейнере (Issue подтвержден Vercel).
- **Официальная рекомендация:** Использовать `next build --webpack` до исправления Turbopack в standalone-режиме.
- **Паттерн `package.json`:**
  ```json
  { "scripts": { "build": "next build --webpack" } }
  ```

### Официальный паттерн обработки ошибок в Server Actions (React 19 + Next.js 16)
- **Правило:** «Ожидаемые» ошибки (валидация, авторизация, ошибки БД) — всегда **возвращать** `{ success: false, error: '...' }`, а не `throw`.
- **Правило:** `throw` применяется только для неожиданных катастрофических сбоев, либо для `redirect()` / `notFound()` из `next/navigation` (они сами кидают исключения — это штатное поведение).
- **`useActionState`** (не `useFormState` — устарел в React 19!) — официальный хук для Server Action форм.
- **Причина:** `throw new Error(...)` в продакшене маскируется Next.js в `"An unexpected response was received from the server."`.

### Миграция `middleware.ts` → `proxy.ts`
```bash
# Автоматическая миграция (рекомендовано)
npx @next/codemod@latest middleware-to-proxy
```
- `middleware()` → `proxy()`; конфиг `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`
- `proxy.ts` работает в Node.js runtime (не Edge), что даёт больше гибкости и доступа к Node.js API.



## 2. 🗺️ Реестр статуса модулей и экранов (Episodic Progress State)

| Модуль / Экран | Маршрут | Статус | Что реализовано |
| :--- | :--- | :---: | :--- |
| **Заказы** | `/admin/orders` | 🟢 **ГОТОВО** | Табированные фильтры, быстрые статусы, модалка деталей заказа, отмена с авто-возвратом, перезапуск, фильтрация по провайдерам. |
| **Каталог & Студия** | `/admin/catalog`, `/admin/catalog/new`, `/admin/catalog/[id]`, `/admin/catalog/tree`, `/admin/catalog/categories` | 🟢 **ГОТОВО** | Ликвидированы шторки (Sheet), внедрена 2-колоночная студия (8+4 cols), живой калькулятор наценки, Live Storefront Preview, древовидный эксплорер и добавление соцсетей. |
| **Поддержка & Тикеты** | `/admin/tickets` | 🟢 **ГОТОВО** | 1-клик кнопки статусов, «Ответить и закрыть» (`Ctrl+Shift+Enter`), умные переменные (`{name}`, `{orderId}`), Web Audio chime и мигание вкладки. |
| **Бренды & Домены** | `/admin/tenants` | 🟢 **ГОТОВО** | Вкладки брендов (SMMplan / SMMflux), валидация каноникалов, управление хостами. |
| **Клиенты** | `/admin/clients`, `/admin/clients/[id]` | 🟢 **ГОТОВО** | Эталонная CRM-карточка: 'зеленый коридор' саппорта (Goodwill начисления без пресетов до копейки), 2-шаговый шлюз возврата на карту (ЮKassa Refund с мгновенным списанием), B2B-реквизиты (ИНН/КПП/Webhook), история пополнений с чеками 54-ФЗ, фильтры-пилюли (Все, B2B, С балансом, VIP, Забаненные). |
| **Академия & Помощник Саппорта** | `/admin/manual` | 🟢 **ГОТОВО** | 12 модулей Академии (от 115-ФЗ до Service Recovery Paradox), двухрежимная навигация (Shift/Learn), SOS-памятка первого дня (3 мин), 20 кейсов в тренажере, экзамен на допуск (90%+), 1-клик Dual-Core скрипты. |
| **Провайдеры** | `/admin/providers` | ⏳ *В очереди (СЛЕДУЮЩАЯ)* | Мониторинг балансов в $, API Healthcheck, Shadow Catalog буферизация, Failover маршрутизация. |
| **Докрутки** | `/admin/refills` | ⏳ *В очереди* | Очередь гарантийных докруток с контролем SLA. |
| **Финансы & Биллинг** | `/admin/finance` | ⏳ *В очереди* | Сверка платежей ЮKassa / Robokassa, фискализация 54-ФЗ. |
| **Настройки** | `/admin/settings` | ⏳ *В очереди* | Системные параметры, ключи API, курсы валют. |

---

## 3. 🛑 Специфика компонентов и решенные антипаттерны

| Компонент / Модуль | Проблема / Особенность | Правильное решение |
| :--- | :--- | :--- |
| **Base UI Select** (`@base-ui/react`) | `<SelectValue />` отображал raw CUID вместо имени | Для отображения текста использовать children-функцию: `<SelectValue>{(val) => items.find(i => i.id === val)?.name ?? val}</SelectValue>`. `label` на `SelectItem` работает только для typeahead! |
| **Link Analyzer** (`targetType`) | `service.targetType \|\| 'POST'` сбрасывал каналы в посты | Использовать строго `inferTargetTypeFromCategory(categoryName)` из `src/utils/target-type.ts`. Каналы/группы -> `CHANNEL`, посты/лайки -> `POST`, Stories -> `STORY`. |
| **Кнопки Submit в формах** | Серая (`disabled`) кнопка при невалидных полях сбивала пользователей | Кнопка **всегда активна**. Клик перехватывается (`e.preventDefault()`), запускается `animate-shake` (с уникальным `key={Date.now()}`) и `scrollIntoView({ behavior: 'smooth', block: 'center' })` к первому ошибочному полю. |
| **Ошибки форм (UX)** | Общие серверные ошибки в начале страницы не замечались | Общие ошибки сервера выводятся **непосредственно над кнопкой Submit** в зоне фокуса клика. |
| **FAQSection & Типы** | Несовпадение структуры пропсов | `FAQSection` ожидает массив `{ question: string; answer: string }` (НЕ `{ q, a }`). `PublicService.cooldownUntil` — это `string \| null` (ISO string). |
| **Парсинг в тестах** | `pg_terminate_backend` и `deleteMany` на таблицах с триггерами неизменяемости | Не использовать `pg_terminate_backend`. Для очистки таблиц типа `LedgerEntry` использовать `TRUNCATE CASCADE` в `setup.ts`. |
| **DropdownMenu + Modal** | Встраивание `<Modal>` внутрь дропдауна приводит к крашу при закрытии или сжатию в узкую полосу | Модалы объявляются на уровне родительского экрана (`UnifiedTicketsWorkspace`), дропдаун лишь передает событие `onOpenModal={() => ...}`. |
| **Telegram Polling Daemon** | Запуск `bot.launch()` падал с `409 Conflict: terminated by other getUpdates` | Всегда вызывать `deleteWebhook({ drop_pending_updates: true })` перед `bot.launch({ dropPendingUpdates: true })`. |
| **Optimistic Chat Messages** | Полупрозрачное сообщение (`temp-id`) зависало в стейте навсегда при сбое бэкенда | Добавлен 12s TTL таймер авто-очистки и немедленный возврат текста в input при ответе сервера `{ success: false }`. |

---

## 3. 🚀 Стандарты деплоя

1. **Full Hybrid Deploy (БД, зависимости, окружение):**
   - Команда: `powershell ./scripts/deploy-hybrid.ps1`
   - Применяется при изменении `schema.prisma`, `package.json`, `.env`. Локальная сборка Next.js -> Docker image -> gzip (`tar -czf`) -> SCP -> `docker load` -> `nginx -s reload`.

2. **Hot-Patching (Быстрый патч фронтенда/бизнес-логики):**
   - Команда: `npx tsx scripts/fast-patch.ts --prod`
   - Применяется для правок в `src/` без изменений схемы БД и npm-пакетов. Сборка -> `.next` архив -> `docker cp` -> мягкий рестарт (30 сек).

---

## 4. ⚖️ Финансовые и налоговые нормативы РФ (2026)

- **НДС:** Базовая ставка **22%** (п. 3 ст. 164 НК РФ, ФЗ № 425-ФЗ). Расчетная ставка авансов: **22/122**.
- **Порог УСН:** **20 000 000 ₽** (п. 1 ст. 145 НК РФ, ФЗ № 176-ФЗ / 425-ФЗ).
- **Чеки (ЮKassa / Robokassa):**
  - *ЮKassa:* До 20 млн ₽ в год — `vat_code: 1` (Без НДС), свыше 20 млн ₽ — `vat_code: 10` (НДС 22%).
  - *Robokassa:* До 20 млн ₽ в год — `tax: "none"`, свыше 20 млн ₽ — `tax: "vat22"` (п. 3 ст. 164 НК РФ, ФЗ № 425-ФЗ).
- **Платежные шлюзы:** Прямой API-запрос к ЮKassa/Robokassa выполняется всегда, если заданы ключи (в т.ч. тестовые). Локальный мок `/api/dev/mock-payment` допустим только при пустых ключах.
- **Dev Sandbox Trust Boundary:** Все симуляции пополнения баланса в `/api/dev/sandbox/` обязаны использовать `WalletOps.credit()` с созданием записи `LedgerEntry`.

---

## 5. 🎨 UI-система и Визуальный атлас

- **Атомарный компонент `Skeleton`:** Все мерцающие заполнители загрузки реализуются через `<Skeleton className="..." />` (`src/components/ui/skeleton.tsx`) на базе токена `bg-muted/60` и анимации `animate-pulse`.
- **Единый веб-атлас интерфейсов:** Канонический интерактивный визуальный атлас доступен в `public/ui-guide.html` (маршрут `/ui-guide.html`). Включает 18 концепций: 12 стилей веб-дизайна (Linear Dark, Apple Bento, Tactile Brutalism, Neobrutalism, Glassmorphism, Swiss и др.) и 6 интерактивных UI-состояний (Skeleton, Empty State, Stepper Wizard, Validation Shake, Status Badges, Spacing Box-Model).

---

## 6. 🧪 Автоматизированная система тестирования UI/UX (SMMplan UX Quality Suite)

- **Стандарты:** W3C WCAG 2.2 Level AA, Nielsen Norman Group 10 Usability Heuristics, Playwright E2E.
- **Команда запуска:** `npm run test:ux` (`playwright test e2e/ux-quality/`).
- **Компоненты набора:**
  1. `e2e/utils/a11y-scanner.ts` — zero-dependency сканер доступности (контрастность текста, доступные имена кнопок, альты, touch targets >= 44x44px).
  2. `e2e/ux-quality/a11y-wcag.spec.ts` — автоматический аудит WCAG 2.2 AA страниц Landing, Catalog, UI Guide.
  3. `e2e/ux-quality/order-wizard-ux.spec.ts` — проверка правила «кнопки Submit никогда не disabled», перехвата клика при ошибке и финансового контракта `₽ / шт`.
  4. `e2e/ux-quality/mobile-touch-targets.spec.ts` — мобильные тесты на вьюпорте 375x812 (touch targets, отсутствие горизонтального скролла).

## 7. E2E Playwright Testing Suite Status (Февраль 2026)
- **Multi-Tenant Unique Constraints**: В Prisma таблица `User` имеет `@@unique([email, tenantId])`. Все `findUnique({ where: { email } })` в тестах заменены на `findFirst({ where: { email } })` или `email_tenantId: { email, tenantId }`.
- **JWT & Session Verification**: `verifySession()` проверяет наличие `sessionId` в базе данных `Session`. В `auth.setup.ts` создается реальная запись `Session` и вкладывается в JWT `SignJWT({ sessionId, userId, role, tenantId })`.
- **Тестовая изоляция аутентификации**: В `session.ts` функция `handleDevAutoLogin()` принудительно возвращает `null` при `APP_ENV=test`, что предотвращает автоматический вход гостей и гарантирует чистоту тестов форм логина и регистрации.
- **UI/UX & Visual Regression**: Набор `e2e/ux-quality/` (WCAG 2.2 AA a11y scanner, mobile viewport density, order wizard pricing contract `₽ / шт`) и `e2e/visual-regression.spec.ts` (10 сценариев) проходят на 100% GREEN.
