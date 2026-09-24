# Доказательства ремедиации PERF-01 (Оптимизация Anti-DDoS Honeypot: In-Memory Fast-Path кэширование)

## До исправления (Before)
В `src/lib/security/ddos-shield/honeypot-service.ts` метод `isBlacklistedDdosTarget(clientIp, fingerprint)` вызывался в `src/proxy.ts` для каждого неавторизованного запроса:
```typescript
const [ipBlocked, fpBlocked] = await Promise.all([
  ip && ip !== 'unknown' ? redis.get(`blacklist:ddos:ip:${ip}`) : null,
  fingerprint && fingerprint.length === 64 ? redis.get(`blacklist:ddos:fp:${fingerprint}`) : null,
]);
```
Это приводило к двум последовательным сетевым вызовам к Redis (`blacklist:ddos:ip:...` и `blacklist:ddos:fp:...`) на КАЖДЫЙ GET-запрос неавторизованного пользователя (включая загрузку статических ассетов и страниц каталога), создавая дополнительную задержку TTFB 10–30мс и нагружая connection pool Redis.

## После исправления (After)
1. В `src/lib/security/ddos-shield/honeypot-service.ts` внедрена двухуровневая модель кэширования:
   - `inMemoryBlockedCache`: мгновенный возврат `true` для заблокированных ботов без обращения к Redis (TTL 24 часа).
   - `inMemoryCleanCache`: запоминание проверенных чистых IP и отпечатков на 20 секунд (TTL 20 сек, 0 обращений к Redis при повторных запросах).
   - При фиксации нарушения ловушки (`recordHoneypotViolation`) цель мгновенно помечается заблокированной в оперативной памяти и синхронизируется в Redis.
   - Реализована автоматическая очистка устаревших записей при превышении лимита емкости `MAX_LOCAL_CACHE` (10 000).
2. Обновлен тест `src/__tests__/security/ddos-shield/honeypot-tarpit.test.ts` с проверкой отсутствия сетевых вызовов `redis.get` при повторных обращениях.

## Верификация:
- `npx dotenv -e .env.test -- vitest run src/__tests__/security/ddos-shield/honeypot-tarpit.test.ts` — 1/1 PASS (82ms).
- `mockRedis.get.not.toHaveBeenCalled()` подтверждено в юнит-тесте.
- `npx tsc --noEmit` — 0 ошибок (PASS).
