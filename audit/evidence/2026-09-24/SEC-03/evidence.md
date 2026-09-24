# Доказательства ремедиации SEC-03 (Хардкодный секрет Anti-DDoS Shield)

## До исправления (Before)
В `src/proxy.ts:367` и `src/app/api/security/challenge/route.ts:14` присутствовал статический дефолтный секрет подписи PoW-токенов:
```typescript
const shieldSecret = process.env.JWT_SIGNING_KEY || process.env.JWT_SECRET || 'omnismm-ddos-shield-fallback-secret-2026';
```
При отсутствии переменных окружения злоумышленник мог генерировать валидные Gatekeeper HMAC-токены, полностью обходя защиту от DDoS и капчу.

## После исправления (After)
1. В `src/lib/security/ddos-shield/pow-engine.ts` реализована централизованная функция `getDdosShieldSecret()`:
   - В боевом режиме (`NODE_ENV === 'production'`): выбрасывается аварийное исключение (fail-closed), если ни один секрет (`DDOS_SHIELD_SECRET`, `JWT_SIGNING_KEY`, `JWT_SECRET`) не задан в окружении.
   - В dev/test режиме: при отсутствии ключей генерируется непредсказуемый 32-байтный криптографический случайный ключ для текущего жизненного цикла процесса (`crypto.randomBytes(32).toString('hex')`).
   - Статическая строка `'omnismm-ddos-shield-fallback-secret-2026'` полностью удалена из кодовой базы.
2. В `src/proxy.ts` и `src/app/api/security/challenge/route.ts` получение секрета переведено на `getDdosShieldSecret()`.

## Верификация:
- `npx dotenv -e .env.test -- vitest run src/__tests__/security/sec-03-ddos-shield-secret.test.ts` — 4/4 PASS (100%).
- Проверена генерация криптографического случайного ключа в dev/test вместо статической строки.
- Проверен fail-closed выброс исключения в `production`.
- `npx tsc --noEmit` — 0 ошибок (PASS).
- `node scripts/check-bundle-secrets.mjs` — 0 утечек секретов.
