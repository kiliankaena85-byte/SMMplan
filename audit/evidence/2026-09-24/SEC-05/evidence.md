# Доказательства ремедиации SEC-05 (Защита эндпоинтов вебхуков от DoS-атак / Webhook Rate Limiting)

## До исправления (Before)
В эндпоинтах `/api/webhooks/*` (платежные шлюзы Yookassa, Robokassa, Cryptobot, Telegram) отсутствовало ограничение частоты входящих запросов на уровне Edge/Proxy.
Злоумышленник мог генерировать тысячи фиктивных вебхук-запросов, нагружая сервер криптографической проверкой подписей и тяжелыми обращениями к базе данных (ReDoS / DB Connection Exhaustion).

## После исправления (After)
1. Создан модуль `src/lib/security/webhook-rate-limiter.ts`:
   - Реализовано ограничение 60 запросов в минуту на связку `IP:tenantId:subRoute`.
   - Защита срабатывает на ранней стадии до криптографических проверок и обращений к базе данных.
   - При превышении лимита возвращается HTTP 429 Too Many Requests с заголовком `Retry-After`.
   - Встроена защита от переполнения памяти с авто-очисткой устаревших записей (LRU/TTL pruning).
2. В `src/proxy.ts`:
   - Интегрирован вызов `checkWebhookRateLimit(request, finalTenantId)` сразу после разрешения тенанта.
3. Создан юнит-тест `src/__tests__/security/webhook-rate-limiter.test.ts`.

## Верификация:
- `npx dotenv -e .env.test -- vitest run src/__tests__/security/webhook-rate-limiter.test.ts` — 2/2 PASS (100%).
- `webhook-rate-limiter` добавлен в `skipPatterns` в `test/setup.ts`.
- `npx tsc --noEmit` — 0 ошибок (PASS).
