# Волновой план по оптимизации Admin Dashboard (Performance / OOM / Suspense)

## 1. RAG Search Summary
- **Архитектурный стык**: Переход от блокирующего `Promise.all` на уровне страницы (Server Component) к асинхронным виджетам (Suspense Boundaries).
- **Хаос и пустота**: Защита от OOM в сервисах агрегации данных путем перевода вычислений в СУБД (SQL `db.$queryRaw`), кеширование тяжелых запросов.
- **Visual & UX Density**: Удаление мертвого/ненужного кода, улучшение UX за счет независимой загрузки (streaming) виджетов.

## 2. Премортем-анализ (Failure Simulation)
| Сценарий отказа | Вероятность x Влияние | Механизм защиты в коде |
| --- | --- | --- |
| Запрос к БД падает с таймаутом | Низкая x Высокое | Использование кеширования `unstable_cache` для виджетов (TopSpenders, UserStats). Разделение на независимые Suspense-границы. |
| OOM-ошибка при подсчете возвратов | Высокая x Критичное | Замена `db.order.findMany` на `db.$queryRaw` с агрегацией прямо в базе данных (Postgres). |
| Ошибка сборки из-за хуков клиента | Средняя x Высокое | Обертка Suspense ставится вокруг серверных Async-компонентов (Loaders), которые затем передают пропсы в клиентские виджеты. |

## 3. Предлагаемые изменения

**Шаг 1: Оптимизация вычислений возвратов в `accounting.service.ts`**
- Удалить тяжелый `db.order.findMany` загружающий объекты в память.
- Написать эквивалентный запрос `db.$queryRaw` со всеми условиями фильтрации (проверка статуса оплаты, текстов ошибок) и копеечной математикой (ROUND).

**Шаг 2: Внедрение `unstable_cache` в `user.service.ts`**
- Обернуть метод `getUserStats` в `unstable_cache`.
- Обернуть метод `getTopSpenders` в `unstable_cache` (ревалидация 60-120 секунд, учитывая `tenantId`).

**Шаг 3: Исправление `PeriodSelector.tsx`**
- Обернем сам `PeriodSelector` в `<Suspense>` на странице, чтобы не блокировать SSR.

**Шаг 4: Декомпозиция `page.tsx` на Suspense-блоки (Streaming)**
- Избавиться от мега-блока `await Promise.all(...)` в `AdminDashboardPage`.
- Создать серверные компоненты-загрузчики в `page.tsx` (или отдельном файле) для каждой карточки/секции:
  - `KPIStripLoader`
  - `StormRadarLoader`
  - `FinancialEscalationLoader`
  - `RecentOrdersFeedLoader`
  - `TopSpendersLoader`
  - `PaymentGatewaysLoader`
  - `RefundMonitorLoader`
  - `CollapsibleWaveChartLoader`
- Обернуть их в `<Suspense fallback={<Skeleton />}>` прямо в верстке страницы.
- Удален `orders-chart.tsx`.

## 4. План верификации
- Запуск линтера `npm run lint`.
- Открытие дашборда локально и проверка быстрой загрузки рамки (skeleton) и поочередной загрузки данных виджетов.
- Сверка расчетов Refunds/Opex (убедиться, что логика SQL совпадает с JS-версией).
