# CURRENT_STATE.md — 🚀 Дэшборд Активной Сессии SMMplan
<!-- АГЕНТ: Обновляй этот файл после КАЖДОЙ завершённой задачи. Это твоя главная точка восстановления контекста. -->

## Последнее обновление: 2026-08-24 | Агент: Antigravity
## Активный статус: 🛡️ УСПЕШНО ВЫПОЛНЕН ЭТАП P1 «Resilience & Infrastructure Hardening» (PREM-05..11)
- **Ветка**: `fix/premortem-p1-resilience`
- **Завершено**:
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
  - `TELEGRAM-ENTERPRISE-01`: Внедрена Enterprise-экосистема Telegram-бота и обратной связи:
    1. **База данных**: Модель `TicketFeedback` в Prisma (оценка 1-5 ⭐, теги причин, комментарий, источник `TELEGRAM`/`WEB`), поля `telegramMenuConfig`, `telegramTemplates`, `telegramRatingReasons` в `SystemSettings`.
    2. **Конструктор меню**: Вкладка «Кнопки Меню» с редактированием Reply Keyboard (каталог, заказы, пополнение, профиль, саппорт, рефералы, WebApp, URL, команды, FAQ автоответы).
    3. **Шаблоны сценариев**: Вкладка «Шаблоны Ответов» с настраиваемыми переменными (`{siteName}`, `{userName}`, `{balance}`, `{ticketId}`, `{stars}`, `{orderId}`, `{amount}`).
    4. **CSAT & Причины оценок**: Вкладка «Причины Оценок» с тегами для негативных (1-2 ⭐), нейтральных (3 ⭐) и позитивных (4-5 ⭐) оценок. Двухэтапный опрос в боте.
    5. **Журнал отзывов & CRM**: Вкладка «Журнал Отзывов & CSAT» с расчетом среднего рейтинга, распределением по звездам, облаком частых факторов и таблицей отзывов с фильтрацией.
    6. **Live iPhone Simulator**: Интерактивный симулятор с переключением 5 состояний (Приветствие, Диалог, CSAT 1-5 ⭐, Теги причин, Благодарность).
- **Верификация**:
  - `npx prisma db push` — 100% SUCCESS (база данных синхронизирована)
  - `npx tsc --noEmit` — 0 ошибок (100% PASS)
  - `npm run build` — 100% SUCCESS (`next build --webpack`, скомпилированы 100+ роутов)
  - `docker-compose up -d web` — Up (healthy), HTTP 200 OK на `/api/health` и главной странице
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
