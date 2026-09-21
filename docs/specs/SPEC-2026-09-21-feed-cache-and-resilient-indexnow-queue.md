# SPEC-2026-09-21: Архитектурное кеширование YML-фида в Redis и отказоустойчивая очередь IndexNow в BullMQ

## 1. Контекст и проблематика
1. **Пиковая нагрузка от поисковых роботов на эндпоинт `/yandex-feed.xml`:**  
   Эндпоинт генерации товарного фида Yandex Market Language (`src/app/yandex-feed.xml/route.ts`) выполняет динамическую выборку каталога и всех активных услуг через `getPublicCatalogAction` и параллельные вызовы `getServicesByCategoryAction`. При регулярном обходе роботами Яндекса (Товары и предложения, Поиск, Яндекс Нейро / Алиса) создается повторяющаяся нагрузка на PostgreSQL.
2. **Синхронная отправка IndexNow без гарантированной доставки:**  
   Сервис `IndexNowService.submitUrls` отправляет HTTP POST запросы к внешним шлюзам `yandex.com/indexnow` и `api.indexnow.org`. В случае временного сетевого сбоя (504 Gateway Timeout, DNS lag, лимиты шлюза) вызовы теряются, так как отправляются синхронно или через «fire-and-forget» промисы без персистентной очереди повторов и DLQ.

---

## 2. Архитектурное решение (ADR-2026-21)

### 2.1. Redis-кеширование YML-фида с мгновенной инвалидацией
- **Ключ кеша:** `seo:yandex-feed:${tenantId}` (разделение для `smmplan` и `flux`).
- **TTL кеша:** 3600 секунд (1 час).
- **Паттерн:** Cache-Aside с Fail-Open защитой. Если Redis недоступен, роут штатно генерирует XML напрямую из БД, не вызывая 500 ошибки для поискового краулера.
- **Инвалидация:** Экспортируемая функция `invalidateYandexFeedCache(tenantId?: string)` сбрасывает кеш при импорте/синхронизации услуг в `sync-action.ts`, `import-cherry-pick.ts` и `catalog-sync.service.ts`.
- **Заголовки ответа:** Добавляется заголовок `X-Cache: HIT` / `X-Cache: MISS`.

### 2.2. Очередь и воркер `indexnow-queue` в BullMQ (Event-Driven Reliability)
- **Очередь:** `indexNowQueue` в `src/lib/queue-manager.ts` с конфигурацией:
  - `attempts: 5`
  - `backoff: { type: 'exponential', delay: 10000 }` (10с, 20с, 40с, 80с, 160с)
- **Дедупликация:** `jobId` формируется детерминированно `indexnow-${host}-${sha256(urls.join(','))}` для предотвращения дублирующих отправок при частых сохранениях.
- **Воркер:** Процессор `src/workers/processors/indexnow.processor.ts`:
  - Вызывает `IndexNowService.submitUrls(job.data)`.
  - При `result.success === false` выбрасывает исключение для запуска экспоненциального повтора BullMQ.
- **DLQ & Graceful Shutdown:** Интеграция в `src/workers/index.ts`:
  - При исчерпании 5 попыток задача уходит в `dead-letter-queue` с уровнем алерта P1 (дедупликация через `P0AlertDebouncer`).
  - Экземпляр `indexNowWorker.close()` включен в обработчик `shutdown()`.

---

## 3. Затрагиваемые компоненты и файлы

1. **`src/lib/queue-manager.ts`:**
   - Определение интерфейса `IndexNowJobPayload`.
   - Регистрация и экспорт `indexNowQueue`.
2. **`src/app/yandex-feed.xml/route.ts`:**
   - Подключение `redis` из `@/lib/redis`.
   - Проверка кеша `seo:yandex-feed:${tenantId}`.
   - Экспорт `invalidateYandexFeedCache`.
3. **`src/services/seo/indexnow.service.ts`:**
   - Добавление метода `enqueueUrls(params: IndexNowSubmissionParams): Promise<{ enqueued: boolean; jobId: string }>` с детерминированным `jobId`.
4. **`src/workers/processors/indexnow.processor.ts`:**
   - Реализация процессора задач очереди `indexnow-queue`.
5. **`src/workers/index.ts`:**
   - Инициализация `indexNowWorker`.
   - Подключение к `handleDeadLetter` и массиву `shutdown()`.
6. **Инвалидация в мутациях каталога:**
   - Вызов `invalidateYandexFeedCache` в `src/actions/admin/providers/sync-action.ts`.
7. **Тесты:**
   - `src/__tests__/seo/yandex-feed-redis-cache.test.ts`.
   - `src/__tests__/seo/indexnow-bullmq-resilience.test.ts`.

---

## 4. План верификации (TDD)
1. **Red Phase:** Написание падающих тестов для Redis-кеша фида и BullMQ-очереди IndexNow.
2. **Green Phase:** Реализация минимального кода для 100% прохождения тестов.
3. **Регрессионный сьют:** Полный прогон `vitest run src/__tests__/seo/` (40+ тестов), `npx tsc --noEmit` (0 ошибок), `node scripts/check-bundle-secrets.mjs` (0 утечек).
