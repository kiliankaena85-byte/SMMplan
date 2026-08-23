# CURRENT_STATE.md — 🚀 Дэшборд Активной Сессии SMMplan
<!-- АГЕНТ: Обновляй этот файл после КАЖДОЙ завершённой задачи. Это твоя главная точка восстановления контекста. -->

## Последнее обновление: 2026-08-24 | Агент: Antigravity
## Активный статус: 🛡️ УСПЕШНО ВЫПОЛНЕНА РЕМЕДИАЦИЯ БЕЗОПАСНОСТИ v4.4 (REMEDIATION_PROMPT_v4.4.md) — 100% PASS
- **P0 (CRITICAL/HIGH) — Завершено 100%**:
  - `P0.1 & P0.2 VexBoost Webhook`: Mandatory `x-timestamp` (fail-closed, 5 min replay defense), HMAC-SHA256 signature verification over `timestamp.body` / `body:timestamp`.
  - `P0.3 Provider Catch-all`: `SecurityAlertService.record()` при 401 (mismatch) и 500 (catch), mandatory `x-timestamp`.
  - `P0.4 & P0.5 Provider/[name]`: Whitelist разрешенных провайдеров (`ALLOWED_PROVIDER_NAMES = new Set(['vexboost', 'smmstone'])`), удален unsafe fallback на `provider.apiKey`, HMAC bound to `timestamp.body`.
  - `P0.6 Redis Lock Heartbeat`: `MutexManager.withLock` обновлен — автоматическое продление TTL каждые `ttlMs / 3` мс с гарантированной очисткой в `finally`.
  - `P0.7 WalletOps.refund`: Убран silent clamp `totalSpent` — внедрен fail-fast throw с отменой транзакции при нарушении целостности (`totalSpent < 0`).
  - `P0.8 Webhook Catch Logging`: `SecurityAlertService.record()` интегрирован во все catch-блоки вебхуков.
- **P1 / P2 — Завершено 100%**:
  - `P1.1 CSP Hardening`: Сужен `connect-src` в `nginx/default.conf`, удален `'unsafe-eval'`, добавлены `worker-src 'self'`, `frame-src 'none'`.
  - `P1.2 Staging Hardening`: Добавлен `security_opt: [no-new-privileges:true]` для всех сервисов в `docker-compose.staging.yml`.
  - `P1.3 Redis Config Sync`: Синхронизированы `maxmemory-policy noeviction` и `appendonly yes` в `docker/redis.conf` и compose.
  - `P1.4 maskProviderKey`: Добавлен `try/catch` wrapper, предотвращающий падение UI при некорректных шифротекстах.
  - `P1.5 encryption.ts`: Логирование ошибок в `decrypt()` ограничено `err.message` без утечки внутренностей стека.
  - `P1.7 mock-provider`: Сравнение API-ключа переведено на `crypto.timingSafeEqual`.
  - `P2.4 re-encrypt-secrets.ts`: Удалено ghost-поле `webhookSecret`.
  - `P2.5 verify-no-secrets.js`: Regex-сканер обновлен и протестирован.
- **Верификация**:
  - `npx tsc --noEmit` — 0 ошибок типов (100% PASS).
  - `npm run test -- test/unit/security.webhooks.test.ts` — 22/22 PASS.
  - `npm run test -- src/actions/order/__tests__/checkout.test.ts` — 4/4 PASS.
  - `npm run test -- test/unit/security-alert.service.test.ts test/unit/wallet.race.test.ts test/unit/marketing.test.ts` — 13/13 PASS.
  - `node scripts/verify-no-secrets.js` — PASS (0 leaked secrets).
  - `npm run build` — Next.js build success!


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
