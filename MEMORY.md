# MEMORY.md — Долгосрочная база знаний и выученные уроки Smmplan

Этот файл аккумулирует проверенные архитектурные решения, выученные уроки, специфику компонентов и решенные инциденты, чтобы агенты не повторяли прошлые ошибки.

---

## 1. 🏗️ Архитектурные решения (ADR)

- **PostgreSQL Serializable Isolation vs MutexManager:**
  - *Решение:* Отказ от распределенных Redis-блокировок (`MutexManager`) в финансовых операциях (`WalletOps`) в пользу нативной транзакционной изоляции PostgreSQL Serializable с автоматическим retry при serialization failure.
  - *Причина:* Предотвращение Race Conditions и дрейфа баланса без накладных расходов на Redis lock management.

- **Shadow Catalog (Cherry-Pick Architecture):**
  - *Решение:* Каталоги провайдеров (5000+ сырых услуг) буферизуются во временный Redis-кэш (`provider:{id}:catalog`). В таблицу `Service` PostgreSQL импортируются ТОЛЬКО вручную одобренные администратором услуги с авто-пересчетом маржи по кросс-курсу ЦБ РФ.
  - *Причина:* Защита базы данных от мусора и рассинхронизации.

- **UI Pricing Contract:**
  - *Решение:* В UI всегда выводится цена за 1 штуку (`pricePerUnitRub` = `pricePer1kRub / 1000`), подпись строго: `₽ / шт`.
  - *Табу:* Никогда не писать `/ 1000 шт` и не умножать цену на 1000 на стороне клиента.

- **Multi-Tenant Routing (SMMplan & SMMflux):**
  - *Решение:* Бренда Lovable больше нет. Используются только `smmplan` (smmplan.pro) и `flux` (smmflux.ru). Алиас `lovable` мягко мапится на `flux`.
  - *Правило:* Canonical URLs всегда абсолютные через `absoluteCanonical(tenantId, path)`. Хардкод хостов запрещен.

- **Telegram Smart Bind & Privacy (Zero-Contact Routing):**
  - *Решение:* Привязка Telegram осуществляется анонимно через одноразовые JWT-токены (`tg_bind_...`) со сроком жизни 15 минут, прямые Deep Links (`t.me/{bot}?start=tg_bind_{token}`) и векторный SVG QR-код без сбора телефонных номеров. Управление пуш-уведомлениями (статусы заказов, финансы, тикеты) вынесено в тумблеры с моментальной синхронизацией.
  - *Причина:* Полная конфиденциальность клиентов, защита от перехвата сессий и моментальный омниканальный саппорт.

---

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
