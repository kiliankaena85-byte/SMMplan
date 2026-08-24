# CURRENT_STATE.md — 🚀 Дэшборд Активной Сессии SMMplan
<!-- АГЕНТ: Обновляй этот файл после КАЖДОЙ завершённой задачи. Это твоя главная точка восстановления контекста. -->

## Последнее обновление: 2026-08-25 | Агент: Antigravity
## Активный статус: 🛡️ УСПЕШНО РЕАЛИЗОВАНА СИСТЕМА «Services Lifecycle Management» (ENTERPRISE EDITION)
- **Ветка**: `feature/services-lifecycle-management`
- **Завершено**:
  - `SERVICES-LIFECYCLE-01`: Внедрена Enterprise-система полного жизненного цикла услуг:
    1. **Prisma Модели**:
       - `CustomerGroup`: Группы заказчиков B2B/VIP с тенантами и индивидуальными скидками.
       - `ServiceCustomerAccess`: Many-to-Many матрица видимости с поддержкой кастомных цен (`customPriceRub`).
       - `ServiceDraft`: Черновики услуг с 4-фазным воркфлоу (`DRAFT` → `TESTING` → `PUBLISHED` → `ARCHIVED`).
       - `ServiceLinkCheck`: Журнал проверок сетевой доступности ссылок и совместимости типов.
       - `ServiceEditHistory`: Неизменяемый журнал гранулярного аудита изменений (Diff: `oldValue` → `newValue`).
    2. **Сервисный слой (`src/services/admin/services-lifecycle.service.ts`)**:
       - Авто-калькуляция цен с защитой от деления на 0 и отрицательных наценок (`calculateRetailPrice`).
       - Network Link Verifier с `AbortController` (4000мс таймаут) и SSRF защитой (`assertSafeOutboundUrl`).
       - Атомарная публикация через `db.$transaction` с фиксацией в `AdminAuditLog` (`auditAdminAwaitable`).
       - Контроль доступа к услугам по группам клиентов (`isServiceAccessibleForUser`).
    3. **Server Actions (`src/actions/admin/services-lifecycle.ts`)**:
       - Guard `requireStaffPermission('catalog', 'edit')` / `'view'`.
    4. **Документация и Тесты**:
       - Создан `SERVICES_LIFECYCLE_IMPLEMENTATION.md`.
       - Написан интеграционный сьют `src/__tests__/services-lifecycle.test.ts` (8/8 тестов passed, 100%).
  - `PREM-05`: NPM Supply Chain Hardening (`.npmrc` с `ignore-scripts=true`, CI workflow `.github/workflows/supply-chain.yml`, SBOM генератор, `scripts/audit-deps.ts`, `.github/dependabot.yml`).
  - `PREM-06`: PII Read-Access Audit Trail (`PiiAccessLog` модель в Prisma, `src/lib/audit/pii-access-log.ts` с маскированием email, телефонов, ИНН, адресов, админский экшен `getPiiAccessLogsAction`).
  - `PREM-07`: Provider Rate Change Pre-Flight & Circuit Breaker (`circuit-breaker.ts` с Redis и memory fallback, `rate-change-detector.ts` с блокировкой при скачке тарифов > 20% или отрицательной марже).
  - `PREM-08`: Provider Fallback Router (`ProviderServiceBackup` модель, каскадная маршрутизация `fallback-router.ts` при сбоях основного поставщика).
  - `PREM-09`: Real-time SSE Order Status (`src/app/api/orders/[id]/events/route.ts`, паблишер `realtime-status.ts`, авто-разрешение споров `autoResolveOrderDisputes` при статусе COMPLETED).
  - `PREM-10`: Immutable Ledger & Tax Audit (`LedgerPeriod` заморозка периодов, `dailyReconciliation` 3-сторонняя сверка Банк ↔ DB ↔ Ledger, `RevenueRecognition` и реверсивные проводки).
  - `PREM-11`: Disaster Recovery Runbook & Automated Restore Test (`docs/runbooks/disaster-recovery.md` RTO 2h / RPO 5m, скрипт `dr-restore-test.ts`, workflow `.github/workflows/dr-test.yml`).
  - `AUDIT-FIX-01`: Исправлены дефекты внешнего аудита. DS-01 (удалены сырые стили text-white, bg-black), CRO-01 (убраны disabled кнопки в формах логина, внедрен animate-shake), ERG-01 (модалка EmployeeConsent адаптирована под 100% viewport).
  - `BUG-FIX-LINK-01`: Устранен ложный сбой распознавания ссылок («Не удалось определить платформу автоматически»). Удален избыточный сетевой SSRF DNS-запрос из in-memory анализатора `analyzeUrl`, скорректирован SSRF-фильтр для поддержки Fake-IP прокси/VPN диапазонов (`198.18.0.0/15`).
  - `QA-DOCK-01`: Включен плавающий виджет `FloatingQADock` («QA Dock») в левом нижнем углу для быстрого переключения брендов (SMMplan / SMMflux), ролей (Владелец / Клиент / Гость) и генерации мобильных QR-кодов.
  - `QA-PROVIDERS-01`: В БД добавлены и зашифрованы ключи для 8 провайдеров (Soc-Rocket, SMM Prime, Stream-Promotion, Likedrom, SMMPanelUS, Soc-Proof, Telegram Shop, VexBoost) + тестовые реквизиты ЮKassa (Shop ID 1155075).
  - `BUG-FIX-PAY-01`: Устранена ошибка оформления заказа `UNKNOWN_GATEWAY_ERROR` (исправлены SQL-запросы в `RateLimitService`, убран несуществующий столбец `updatedAt` и включен авто-коннект Redis).
  - `BUG-FIX-TENANT-01`: Исправлено переключение тенантов в `middleware.ts` на тестовых доменах (`test.*`, `localhost`) по параметру `?tenant=` и куке `x_tenant`.
  - `PROD-DEFECTS-FIX-01`: Устранены 4 критических производственных дефекта:
    1. **Telegram Бот**: Добавлен сервис `bot` в `docker-compose.prod.yml` и `staging.yml`, удалены локальные Windows-пути, реализован неблокирующий запуск с Redis heartbeat (`bot:heartbeat` каждые 30с) и создан эндпоинт `/api/webhooks/telegram`.
    2. **YooKassa**: Устранен тихий 404 mock fallback в проде, расширен IP allowlist всеми официальными подсетями (`185.75.120.0/22`, `37.110.12.0/22`, `37.110.16.0/22`, `193.106.92.0/22`, `91.232.108.0/22`), добавлен fallback на env, секрет вебхука в БД и кнопка «Проверить YooKassa API».
    3. **Telegram Bot Control Center**: Выделена отдельная вкладка `/admin/settings?tab=telegram` (3-состоятельный статус-бейдж, пинг в ms, хранение токена в БД с шифрованием AES-256-GCM, выбор режима Polling/Webhook, редактор `{siteName}`/`{userName}`/`{balance}`, live iOS Dark симулятор, сброс очереди и тестовые алерты).
    4. **Вкладка Team**: Добавлен поиск по email сотрудника, фильтр по ролям и группам, пагинация по 25 сотрудников (на десктопе и мобильных), устранение горизонтального скролла и вылетов колонок.
  - `TICKETS-TIMESTAMPS-01`: В чатах тикетов поддержки (`ChatMessageList.tsx` и `ticket-chat.tsx`) добавлены плавающие Telegram-style разделители дат («Сегодня», «Вчера», «24 августа 2026») и всплывающие подсказки (Tooltips) с полной датой и временем при наведении на отметку времени сообщения.
  - `PROVIDER-PROXY-ENTERPRISE-01`: Внедрена Enterprise система управления пулом прокси-серверов для поставщиков API (`patch-provider-proxy`):
    1. **Prisma Модели**: `ProviderProxy` и `ProviderProxyLog` с FK `Provider.proxyId`. Поддержка протоколов `http`, `https`, `socks5`, геолокации, ротирующихся IP, тегов и счетчиков отказов.
    2. **OWASP Top 10 2025 Безопасность**:
       - `A02 Cryptographic Failures`: Пароли прокси шифруются на уровне БД через `VaultService` (AES-256-GCM) и никогда не утекают на клиент.
       - `A03 Injection`: Zod-валидация (`createProxySchema`, `updateProxySchema`, `assignProxySchema`) с валидацией портов (1-65535) и хостов.
       - `A09 Security Logging`: Все мутации фиксируются в `AdminAuditLog` через `await auditAdminAwaitable()`.
       - `A10 SSRF Guard`: Запросы тестирования и проксирования проходят валидацию через `assertSafeOutboundUrl` (блокировка loopback, cloud metadata `169.254.169.254`, приватных подсетей).
    3. **HTTP & SOCKS5 Диспетчер**: `src/lib/http/proxy-fetch.ts` с поддержкой нативного `undici.ProxyAgent` и `socks-proxy-agent` через кастомный коннектор. Внедрено в `UniversalProvider` и фабрику `ProviderService`.
    4. **Админский интерфейс**: Вкладка «Прокси провайдеров» в `/admin/settings?tab=proxy` с мониторингом метрик пула, живым тестированием задержки и быстрым назначением/отвязкой.
  - `IMPORT-UX-PATCH-01`: Внедрён комплексный UX-патч мастера импорта услуг (`patch-import-ux`):
    1. **P0-1 Панель расширенных фильтров**: Отрендерена выдвижная панель фильтров (`import-filters-panel`) с категориями провайдера, статусом импорта, скоростью (FAST/MEDIUM/SLOW), ГЕО (RU, UA, KZ, BY, WORLDWIDE, REAL, MIXED), диапазоном цен закупки и чекбоксами (рефилл, аномалии, розница ≤ 100 шт).
    2. **P0-2 Интерактивный дэшборд**: Карточки «AI распределил» и «Требуют внимания» стали кликабельными табами с фильтрацией списка услуг по статусу готовности.
    3. **P0-3 Выбор всех отфильтрованных**: Реализована и подключена кнопка «Выбрать все по фильтрам» с загрузкой до 5000 подходящих услуг в выборку в 1 клик.
    4. **P1-1 Реальная разбивка в модалке**: В модальном окне подтверждения отображаются фактические соцсети с иконками и точным количеством услуг в каждой.
    5. **P1-2/P1-7 Корректное отображение наценки**: При `markup = 0` в таблице и карточках выводится метка `авто` (умный авто-расчет), а множители форматируются единообразно (`×3`, `×2.5`).
    6. **P1-3 Мобильная пагинация**: Пагинация адаптирована под экраны смартфонов (`flex sm:hidden`) с компактными кнопками перехода.
    7. **P1-4 Группировка категорий**: В селекторах категорий категории сгруппированы по соцсетям (`SelectGroup` / `SelectLabel`).
    8. **P1-5 Раздельный Empty State**: При отсутствии провайдеров или категорий выводятся точные целевые кнопки (`+ Добавить провайдера` / `Создать категории`) с подсказкой онбординга.
    9. **P1-6 Авто-скрытие алертов**: Уведомления об ошибках и успехе автоматически исчезают по таймеру (6–8 сек) с поддержкой ручного закрытия.
       - Интерактивный Live iPhone Simulator с синхронизацией в реальном времени.
    4. **Строгий Next.js 16 App Router Server Action контракт**:
       - Разделение `'use server'` экшенов и констант/типов (перенесены в `src/types/telegram.ts`), строго типизированные ответы `TelegramActionResponse`.
- **Верификация**:
  - `npx prisma db push` — 100% SUCCESS (база данных синхронизирована)
  - `npx tsc --noEmit` — 0 ошибок (100% PASS)
  - `npm run build` — 100% SUCCESS (`next build --webpack`, скомпилированы 100+ роутов)
  - `docker-compose up -d web` — Up (healthy), HTTP 200 OK на `/api/health` и главной странице
  - `vitest run` — **25/25 PASS (100%)** для критических сьютов:
    - `telegram-enterprise-feedback.test.ts` (10 тестов: меню, CSAT тиры, переменные шаблонов, БД, идемпотентность)
    - `telegram-bot-actions.test.ts` (8 тестов: RBAC, валидация экшенов, расчет CSAT статистики и списков)
    - `multitenant-isolation.test.ts` (4 теста: изоляция кэша, лимиты, x_admin_tenant)
    - `rub-to-kopecks.test.ts` (3 теста: финансовая математика в копейках BigInt)
- **Ветка**: `main`


---

## 🗺️ Прогресс Проработки Админ-Панели

| Экран | Маршрут | Статус |
|---|---|:---:|
| Заказы | `/admin/orders` | ✅ |
| **Каталог & Студия Услуг** | `/admin/catalog`, `/admin/catalog/new`, `/admin/catalog/[id]` | ✅ ЗАВЕРШЁН (Декомпозиция SRP: CatalogFilters с debounce 350ms, CatalogTableRow с оптимистичным удалением/откатом, CatalogPagination с прогрессом и сохранением 100% фильтров, isRowHeader fix) |
| **Анализатор Ссылок & RegEx** | `/admin/catalog/patterns` | ✅ ЗАВЕРШЁН (No-Code маски, AI-генератор на gemini-3-flash, ReDoS-аудит, Live Sandbox + Dry Run) |
| Дерево Каталога (Explorer) | `/admin/catalog/tree` | ✅ ЗАВЕРШЁН (Иерархический эксплорер + Safe Archive) |
| Категории & Сети | `/admin/catalog/categories` | ✅ ЗАВЕРШЁН (Добавлен activityType, кнопка скрыть услуги в 1 клик, Merge категорий) |
| Карантин аномалий | `/admin/catalog/quarantine` | ✅ АУДИТ ЗАВЕРШЁН |
| Синхронизация каталогов | `/admin/catalog/sync` | ✅ АУДИТ ЗАВЕРШЁН |
| Разведка рынка (Радар) | `/admin/intel` | ✅ АУДИТ ЗАВЕРШЁН |
| Мастер Cherry-Pick Импорта | `/admin/providers/import` | ✅ АУДИТ ЗАВЕРШЁН |
| **Тикеты & Поддержка** | `/admin/tickets` | ✅ ЗАВЕРШЁН (Live-синхронизация Telegram: инлайн-редактирование, удаление из чата, CSAT-оценка ⭐ 1-5 при закрытии) |
| Бренды & Домены | `/admin/tenants` | ✅ |
| Клиенты (CRM) | `/admin/clients` | ✅ |
| **Сотрудники, Графики & Зарплата** | `/admin/staff` | ✅ ЗАВЕРШЁН (График смен 1..31, автозаполнение 2/2 и 5/2, подмены, отпуска, расчет ЗП, табель CSV) |
| **Мастер-Руководство & Академия** | `/admin/manual` | ✅ ЗАВЕРШЁН (Светлый холст, инженерный разбор всех 18 экранов SMMpanel 1.0, столбцы, кнопки, чек-лист MVP + 13 симуляторов) |
| **Провайдеры & Шлюзы** | `/admin/providers` | ✅ ЗАВЕРШЁН (100% Viewport Width Fit, Zero Column Clipping, Mobile Bento Cards, интерактивный 1-клик refresh глобальной ликвидности) |
| **Гарантийные Докрутки** | `/admin/refills` | ✅ |
| **Биллинг & 54-ФЗ** | `/admin/finance` | ✅ |
| **Системные Настройки** | `/admin/settings` | ✅ ЗАВЕРШЁН (Secret Masking, SSRF Guard, OWNER RBAC, SafetyFloor >= 1.05, Sticky Save Bar, Awaitable Audit) |
| **Маркетинг & Промо** | `/admin/marketing` | ✅ АУДИТ ЗАВЕРШЁН |
| **CMS & Страницы** | `/admin/cms`, `/admin/pages` | ✅ АУДИТ ЗАВЕРШЁН |
| **База Знаний & Блог** | `/admin/knowledge` | ✅ АУДИТ ЗАВЕРШЁН |

---

## 📱 Прогресс Проработки Клиентского Кабинета (Dashboard)

| Экран | Маршрут | Статус |
|---|---|:---:|
| **Пополнение баланса & Финансы** | `/dashboard/finance`, `/dashboard/add-funds`, `/dashboard/deposit` | ✅ АУДИТ & УЛУЧШЕНИЯ ЗАВЕРШЕНЫ (Калькулятор бонусов, СБП, Карты РФ, CryptoBot, B2B-счета) |
| **Партнёрский кабинет** | `/dashboard/referrals` | ✅ АУДИТ & УЛУЧШЕНИЯ ЗАВЕРШЕНЫ (Шкала уровней 5-15%, QR-код, TG/VK шеринг, моментальный вывод) |
| **Профиль, Smart Bind & Настройки** | `/dashboard/settings`, `/dashboard/settings/api` | ✅ АУДИТ & УЛУЧШЕНИЯ ЗАВЕРШЕНЫ (Smart Bind в 1 клик + QR, тумблеры TG-уведомлений, ОГРН/ИНН реквизиты, 152-ФЗ) |

---

## ⚠️ Критические Бизнес-Правила (ВСЕГДА ПОМНИ)

- 🚫 **NO AI auto-reply** — только человек отвечает клиентам (Human-First Doctrine)
- 💰 **WalletOps only** — баланс меняется только через `WalletOps.credit/debit/refund`
- 🔢 **BigInt** — все суммы в копейках (BigInt), никогда float
- 📦 **Shadow Catalog** — сырые провайдерские каталоги только в Redis, не в PostgreSQL
- 🏷️ **₽/шт** — цена в UI = `pricePerUnitRub`, подпись строго `₽ / шт`
- 🏢 **2 бренда** — SMMplan (smmplan.pro) и SMMflux (smmflux.ru). Lovable = alias flux
- 📄 **54-ФЗ 2026** — НДС 22%, порог УСН 20млн₽. До порога: `vat_code:1`, после: `vat_code:10`
- ↩️ **Возврат** — только на внутренний баланс ЛК, никогда на карту напрямую без 2-шагового шлюза
- ☁️ **Cloudflare Tunnel only** — для всех туннелей и веб-превью используется исключительно `cloudflared.exe tunnel` (никаких сторонних туннелей)

---

## 📋 Бэклог (Post-Launch)

- SERM Automated Radar (автомониторинг отзывов на площадках) — заморожен до запуска

---

## 🔗 Ключевые Файлы

- `MEMORY.md` — полная база знаний и ADR
- `AGENTS.md` — dev contract
- `project-docs/BACKLOG.md` — стратегический бэклог
