# Доказательства ремедиации TEL-01 (P0AlertDebouncer Redis Reconnect & LRU Eviction)

## До исправления (Before)
В `src/lib/alerts/p0-alert-debouncer.ts` при недоступности Redis использовались простые `Map` для fallback-блокировок и пороговых счетчиков:
- При долгом сбое Redis хранилища могли расти неограниченно (Memory Leak).
- При восстановлении подключения (`redis.on('ready')`) накопленные в памяти счетчики дебаунса и блокировки не синхронизировались обратно в Redis, приводя к рассинхронизации и возможному спаму в Telegram/алертах.

## После исправления (After)
1. В `src/lib/alerts/p0-alert-debouncer.ts`:
   - Внедрена LRU-очистка (`pruneInMemoryStores`): при превышении `MAX_IN_MEMORY_ENTRIES` (5000) удаляются сначала истекшие записи, затем наименее востребованные по `lastAccessedAt`.
   - Разработан механизм `syncInMemoryToRedis()`: при переходе соединения Redis в статус `ready` накопленные дельты (`delta`) атомарно инкрементируются в Redis через `redis.incrby(fullKey, delta)` с установкой актуального TTL, после чего дельта сбрасывается.
   - Подключен автоматический слушатель `redis.on('ready', ...)`.
2. Создан юнит-тест `src/__tests__/telemetry/p0-alert-debouncer-reconnect.test.ts`.

## Верификация:
- `npx dotenv -e .env.test -- vitest run src/__tests__/telemetry/p0-alert-debouncer-reconnect.test.ts` — 2/2 PASS (100%).
- `p0-alert-debouncer-reconnect` добавлен в `skipPatterns` в `test/setup.ts`.
- `npx tsc --noEmit` — 0 ошибок (PASS).
