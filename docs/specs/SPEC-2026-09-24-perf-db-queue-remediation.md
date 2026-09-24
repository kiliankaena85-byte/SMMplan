# SPEC-2026-09-24: Комплексная ликвидация дефектов БД, очередей BullMQ и узких мест производительности

## 1. Контекст и цели
В ходе диагностического аудита платформы OmniSMM 1.0 выявлены критические проблемы:
- Full Table Scans на таблице `User` из-за отсутствия индекса на `telegramId`.
- Открытые транзакции PostgreSQL, удерживающие блокировки во время сетевых SMTP-вызовов (`sendOrderCompletedMail`).
- Однопоточная обработка `ordersQueue` (BullMQ concurrency = 1), задерживающая отправку заказов.
- Конфликт `jobId` при повторной постановке зависших заказов в `runOrphanSweep`.
- 4 сетевых обращения к Redis на каждый GET-запрос в DDoS Shield `proxy.ts`.
- Голодание пула соединений Prisma (`connection_limit=5`) при 12 параллельных воркерах.
- Утечка ключей `fence:lock:...` в Redis из-за отсутствия TTL.
- Потеря `externalId` провайдера при сбое записи в БД.

Цель: устранить все 10 узких мест, обеспечив P95 времени отклика < 30ms, рост пропускной способности заказов в 5x, стабильность очередей и нулевые утечки ресурсов.

## 2. Архитектурные инварианты (Hard Invariants)
1. **Zero Network I/O inside DB Transactions**: Никаких SMTP, HTTP, Telegram или внешних сетевых вызовов внутри `db.$transaction`.
2. **Deterministic Indexing**: Все поля с частым `findFirst`/`findMany` обязаны иметь B-Tree индексы (`User.telegramId`, `Order.[serviceId, updatedAt]`).
3. **Atomic Rate-Limiting**: Операции скользящего окна в Redis обязаны выполняться за 1 сетевой roundtrip (Redis pipeline/MULTI).
4. **Idempotent Queue Re-enqueue**: При повторной постановке задачи старый `failed` джоб удаляется перед созданием нового.
5. **Connection Pool Safety**: Пул БД масштабируется под количество фоновых воркеров (`connection_limit` 20+).

## 3. Scope изменений
- `prisma/schema.prisma`: индексы `User.telegramId`, `User.[tenantId, telegramId]`, `Order.[serviceId, updatedAt]`.
- `src/workers/index.ts`: concurrency = 5 для `ordersQueue`.
- `src/workers/processors/sync.processor.ts`: вынос `sendOrderCompletedMail` из транзакции, ограничение sequential fallback.
- `src/workers/processors/cleanup.processor.ts`: удаление `job` перед повторным добавлением в `runOrphanSweep`.
- `src/workers/processors/order.processor.ts`: сохранение `extId` в ключе Redis `order:dispatched:${id}`.
- `src/lib/security/ddos-shield/token-bucket-pool.ts`: Redis pipeline (1 roundtrip вместо 4).
- `src/lib/redis-lock.ts`: TTL для `fenceKey`.
- `src/lib/pagination.ts`: пропуск `model.count()` при наличии курсора.
- `docker-compose.yml`: увеличение `connection_limit` до 20 для `web` и `worker`, `mem_limit: 256m` для воркера.
- `src/services/core/order.service.ts`: безопасный wrapper с `.catch()` для email-уведомлений.

## 4. Верификация
- Тесты в `src/__tests__/performance-db-queue-remediation.test.ts`.
- `npx prisma generate`.
- `npx tsc --noEmit` (0 ошибок).
- Регрессионный прогон сьюта `vitest`.
