# CURRENT_STATE.md — 🚀 Дэшборд Активной Сессии SMMplan
<!-- АГЕНТ: Обновляй этот файл после КАЖДОЙ завершённой задачи. Это твоя главная точка восстановления контекста. -->

## Последнее обновление: 2026-08-24 | Агент: Antigravity
## Активный статус: 🛡️ УСПЕШНО ВЫПОЛНЕН ЭТАП C «Качество и устойчивость» (ADM-12..17)
- **Ветка**: `fix/admin-stage-c-resilience`
- **Завершено**:
  - `C.1 (ADM-13)`: Error-границы (`error.tsx`) внедрены во все 26+ подразделов админки на базе унифицированного компонента `AdminSectionError`.
  - `C.2 (ADM-16)`: Кэш счётчика аномалий каталога в `src/app/admin/layout.tsx` через `unstable_cache` (60s TTL, теги `catalog`, `anomaly-count`).
  - `C.3 (ADM-15)`: `canSeeRates` переведён на RBAC-секцию `finance:view` с сохранением superadmin bypass (`OWNER`/`ADMIN`).
  - `C.4 (ADM-14)`: Идемпотентный экшен `ensurePrimaryRouteAction` с аудитом `ROUTE_ENSURE_PRIMARY` и UI-баннером в `RoutingPanelClient.tsx` (GET-страница роутинга избавлена от побочных эффектов записи).
  - `C.5 (ADM-12)`: Декомпозиция god-компонентов: `finance-client.tsx` (с 780 до 141 строк) и вкладок `client-detail-client.tsx` (`balance-tab`, `security-tab`, `payments-tab`), все новые подкомпоненты строго ≤ 300 строк.
  - `C.6 (ADM-17)`: Справка `src/app/admin/manual/page.tsx` полностью открыта для саппорта (снят гейт `settings`).
- **Верификация**:
  - `npx tsc --noEmit` — 0 ошибок (100% PASS)
  - `npx eslint` на Stage C файлах — 0 ошибок
  - `npm run build` — 100% SUCCESS (29.9s Turbopack compile)
  - Vitest: 4 сьюта, 36/36 PASS (`rbac-stage-b-roles`, `rbac-stage-a-matrix`, `routing-ensure-primary`, `rbac-providers-matrix`)


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
