# CURRENT_STATE.md — 🚀 Дэшборд Активной Сессии SMMplan
<!-- АГЕНТ: Обновляй этот файл после КАЖДОЙ завершённой задачи. Это твоя главная точка восстановления контекста. -->

## Последнее обновление: 2026-08-24 | Агент: Antigravity
## Активный статус: 🛡️ УСПЕШНО ВЫПОЛНЕНА РЕМЕДИАЦИЯ БЕЗОПАСНОСТИ v4.5 (REMEDIATION_PROMPT_v4.5.md) — 100% PASS
- **P0 (CRITICAL/HIGH) — Завершено 100%**:
  - `P0.1 Provider Catch-All Fail-Closed`: Требуется обязательный `x-timestamp` (<5 мин), при отсутствии или истечении — отказ `403`.
  - `P0.2 & P0.3 Stored XSS Protection`: Добавлена `sanitizeArticleHtml` в `LegalPageContent.tsx` (оба макета SMMflux/SMMplan) и `src/app/p/[slug]/page.tsx`.
  - `P0.4 & P0.5 No Raw-HMAC Fallback`: Удален `expectedSigRaw` в `vexboost/route.ts` и `provider/[providerName]/route.ts`. Поддерживается только криптографическая связка `timestamp.body` / `body:timestamp`.
  - `P0.6 Lockfile Integrity`: Восстановлена целостность всех пакетов в `package-lock.json` (0 missing integrity).
  - `P0.7 SecurityEvent Immutability Trigger`: Создан SQL-триггер PostgreSQL, блокирующий `UPDATE` и `DELETE` по таблице `"SecurityEvent"`, с обходом только для `cleanup-pii.job.ts` в транзакции.
  - `P0.8 & P0.9 Auth Audit Trail`: Полный аудит в `auth/verify/route.ts` и `auth/logout/route.ts` через `SecurityAuditLogger`.
  - `P0.10 Inbound Email Webhook`: Интеграция `SecurityAlertService.record()` во все пути валидации.
  - `P0.11 & P1.6 OWASP Static Security Scanner`: Добавлен `owasp:scan` в CI и `package.json`, 0 уязвимостей в `src/`.
- **P1 / P2 — Завершено 100%**:
  - `P1.1 canResetPasswordUntil`: 15-минутный TTL в модели `Session` и в базе данных для сброса пароля.
  - `P1.2 Unified Password Policy`: Единая `passwordPolicySchema` применена в `password-settings.ts`.
  - `P1.3 BigInt Refund Pipeline`: `refund.ts`, `refund-policy.service.ts`, `orders.ts`, `ticket.ts`, `order.service.ts`, `cleanup.processor.ts` переведены на строгую `BigInt` арифметику.
  - `P1.4 Lock Acquire Timeout`: Грациозный fallback с поиском заказа по `idempotencyKey` в `checkout.ts`.
  - `P1.5 Sensitive Data Redaction`: Автоматическое маскирование паролей, токенов, ключей и хэширование PII в `SecurityAlertService.record()`.
  - `P1.7 Crypto Webhook IP Whitelist`: Внедрен hook с валидацией IP и аудит-трейлом при подмене.
  - `P1.8 Mock Payment QA_SECRET_KEY`: Добавлена timing-safe проверка `QA_SECRET_KEY`.
  - `P1.9 Sandbox YooKassa Cross-Tenant Guard`: Проверка соответствия тенанта администратора и пользователя.
  - `P2.1 Container Hardening`: `cap_drop: [ALL]`, `read_only: true`, `tmpfs` в `docker-compose.prod.yml`.
  - `P2.3 & P2.4 CSP & Frame Protection`: Унифицирован заголовок `X-Frame-Options: DENY` и согласован `connect-src` в Nginx и Next.js.
  - `P2.6 500 Catch Alerting`: Запись `WEBHOOK_PROCESSING_ERROR` в `yookassa`, `robokassa`, `crypto`.
  - `P2.7 AI Regex Fallback Audit`: Экранирование спецсимволов и статический аудит `SafeRegexValidator.staticAudit` в fallback-ветке.
- **Верификация**:
  - `npx tsc --noEmit` — 0 ошибок типов (100% PASS).
  - `npm run test -- test/unit/security.webhooks.test.ts test/unit/sanitize.test.ts test/unit/security-alert.service.test.ts` — 32/32 PASS (100%).
  - `npx tsx scripts/owasp-scan.ts` — 0 findings (PASS).
  - `node scripts/verify-no-secrets.js` — PASS (0 leaked secrets).
  - `npm run build` — Next.js production build success!


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
