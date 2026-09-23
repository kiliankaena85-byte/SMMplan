# СПЕЦИФИКАЦИЯ (SDD-TDD — RAC-2026 / P0 Hotfix)
# Межтенантная изоляция платежного цикла и тикетов поддержки OmniSMM 1.0

> **Статус:** APPROVED & IN IMPLEMENTATION  
> **Версия:** 1.0.0 (OmniSMM 1.0 / RAC-2026)  
> **Дата:** 22.09.2026  
> **Приоритет:** P0 Hotfix (Пакет 1: VULN-01 & VULN-02)  
> **Контур:** Tier 1 (Чекаут, платежные шлюзы, тикеты клиентской поддержки, multi-tenant-isolation-arch)  
> **Методология:** SDD (Spec-Driven Development) + TDD (Test-Driven Development)

---

## 1. Контекст инцидентов и описание уязвимостей

### [VULN-01] Межтенантная потеря сессии и домена при возврате со шлюзов оплаты
- **Файл:** `src/services/orders/checkout-payment.service.ts` (строки 49–50).
- **Симптом:** При формировании платежного URL для шлюзов (ЮKassa, Robokassa и др.) генерация `successUrl` выполнялась через `getBaseUrlSync()` без учёта `tenantId`:
  ```typescript
  const baseUrl = getBaseUrlSync();
  const successUrl = `${baseUrl}/success?orderId=${result.orderId}`;
  ```
  В результате после успешной оплаты заказа на витрине **SMMflux** (`smmflux.ru`) шлюз возвращал покупателя на `https://smmplan.pro/success?orderId=...`.
- **Последствия:**
  1. Возникала ошибка 404 в `/api/order-status` из-за межтенантного барьера (заказ принадлежит тенанту `flux`, а проверяется на хосте `smmplan`).
  2. Разрушалась клиентская сессия (куки авторизации и тенанта изолированы по доменам `smmflux.ru` vs `smmplan.pro`).
  3. Нарушение доверия клиентов и отток (CRO degradation).
- **Решение:** Формировать `successUrl` строго через `absoluteCanonical(tenantId, `/success?orderId=${result.orderId}`)`, гарантируя возврат на `https://smmflux.ru/...` для тенанта `flux` и на `https://smmplan.pro/...` для `smmplan` с сохранением протокола `https`.

---

### [VULN-02] Отсутствие межтенантной изоляции тикетов в Личном Кабинете
- **Файлы:**
  - `src/app/dashboard/tickets/page.tsx`
  - `src/app/dashboard/tickets/[id]/page.tsx`
  - `src/services/support/ticket.service.ts`
- **Симптом:**
  1. В `src/app/dashboard/tickets/page.tsx` вызов `ticketService.getOrCreateTicket(session.userId, 'Чат с поддержкой', 'WEB')` не передавал 4-й параметр `tenantId`. Метод обращался к `user.tenantId || 'smmplan'`, игнорируя текущую витрину, в которой авторизован пользователь.
  2. В `src/app/dashboard/tickets/[id]/page.tsx` отсутствовала проверка принадлежности тикета текущему тенанту:
     - Любой авторизованный клиент при переходе по ссылке `/dashboard/tickets/[id]` мог просматривать переписку с другого тенанта, если ID тикета совпал с его `userId`.
     - Запрос `historicalTickets` не фильтровал закрытые тикеты по `tenantId`, что приводило к отображению истории обращений из других брендов в одном окне чата.
- **Последствия:** Утечка контекста поддержки между брендами (Brand Bleeding), потенциальная путаница операторов и клиентов.
- **Решение:**
  1. В `tickets/page.tsx`: считывать `currentTenantId` через `resolveTenantFromHeaders(await headers())` и передавать 4-м аргументом в `getOrCreateTicket(session.userId, 'Чат с поддержкой', 'WEB', tenantId)`.
  2. В `tickets/[id]/page.tsx`: проверять `if (ticket.tenantId !== currentTenantId) redirect('/dashboard/tickets');`, а также добавить `tenantId: currentTenantId` в `historicalTickets` и `initialOrders`.
  3. В `ticket.service.ts`: валидировать и нормализовать `tenantId` (`normalizeTenantId(tenantId || user.tenantId) || 'smmplan'`), а также в `addMessage` вызывать `SettingsProvider.getSupportEmailDomain(ticketTenant)` и `SettingsProvider.getContactAndLegalSettings(ticketTenant)` с учётом тенанта тикета для защиты от Brand Bleeding в email-уведомлениях.
  4. Декомпозиция компонентов интерфейса чата: вынос `TicketChatHeader.tsx` и `TicketLinkedOrderCard.tsx` для строгого соблюдения инварианта `< 200 строк` в `src/app/dashboard/tickets/[id]/page.tsx` (163 строки).

---

## 2. Архитектурные инварианты и Hard Boundaries

1. **Zero Cross-Tenant Redirection (Payment Gateways):**
   Платежный шлюз ни при каких обстоятельствах не должен возвращать пользователя на чужой домен. `successUrl` генерируется детерминированно на основе `tenantId` заказа.
2. **Support Ticket Tenant Boundary:**
   - 1 активный тикет на связку `(userId, tenantId)`.
   - Клиент видит историю закрытых тикетов строго своего текущего тенанта.
   - Попытка доступа к тикету другого тенанта пресекается мгновенным `redirect('/dashboard/tickets')`.
   - Email-уведомления ответов поддержки отправляются строго с домена и имени бренда текущего тенанта (`smmflux.ru` / SMMflux vs `smmplan.pro` / SMMplan).
3. **Clean Architecture & UI Rule:**
   - Страницы `page.tsx` не содержат `"use server"`.
   - Размер компонентов строго не превышает 200 строк (`[id]/page.tsx` — 163 строки, `TicketChatHeader.tsx` — 89 строк, `TicketLinkedOrderCard.tsx` — 58 строк).
   - Строгая типизация TypeScript (0 ошибок `tsc --noEmit`, 0 `any` в тестах и коде).

---

## 3. Таблица рисков (Pre-Mortem Failure Simulation)

| Сценарий отказа | Вероятность x Влияние | Защитный механизм в коде |
| --- | --- | --- |
| Пользователь оплачивает заказ на `smmflux.ru`, шлюз отправляет на `smmplan.pro` | Высокая x Критическое | `absoluteCanonical(tenantId, ...)` генерирует хост на основе нормализованного `tenantId` ('flux' -> 'smmflux.ru'). |
| Клиент переключает бренд и видит тикеты другого бренда в чате | Средняя x Высокое | Проверка `ticket.tenantId !== currentTenantId` с редиректом + фильтр `tenantId` в `historicalTickets`. |
| Заголовок `x-tenant-id` не выставлен (прямой запрос/тест без middleware) | Низкая x Среднее | `resolveTenantFromHeaders` фоллбэчится на проверку `host` / `x-forwarded-host` через `resolveTenantFromHostEdge`. |
| Передан устаревший алиас тенанта (`lovable`, `smmflux`) | Средняя x Среднее | `normalizeTenantId` приводит все алиасы к каноническому `'flux'`. |
| Ответ оператора на тикет витрины `flux` отправляет email с подписью `SMMplan` | Средняя x Высокое | `ticketService.addMessage` передает нормализованный `ticketTenant` в `getSupportEmailDomain` и `getContactAndLegalSettings`. |

---

## 4. План верификации

1. **Unit-тесты Vitest:**
   - `src/__tests__/unit/checkout-payment-dispatch-tenant.test.ts`: проверка формирования `successUrl` для `smmplan` (`https://smmplan.pro/success?...`) и `flux` (`https://smmflux.ru/success?...`) со строгой типизацией моков.
   - `src/__tests__/unit/support-tickets-tenant-isolation.test.ts`: проверка изоляции `getOrCreateTicket`, заголовков `resolveTenantFromHeaders`, защиты от Brand Bleeding в `addMessage` и строгого разделения сессий.
2. **Статический анализ и инварианты:**
   - `npx tsc --noEmit` — 0 ошибок.
   - `npx eslint` — 0 ошибок и 0 ворнингов.
   - `npm run check:arch` и `npm run lint:guardrails` — 0 нарушений.
   - Проверка лимита строк: все компоненты UI < 200 строк.
