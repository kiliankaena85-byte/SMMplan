# Доказательства ремедиации AUTH-01 (Небезопасный Dev-Login эндпоинт)

## До исправления (Before)
В `src/app/api/auth/dev-login/route.ts` проверка доступа к авто-логину выглядела так:
```typescript
const isAllowedHost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('3005');

if (!isDev && !isTest) {
  return new NextResponse('Not Found', { status: 404 });
}

if (!isAllowedHost && !isDev) {
  return new NextResponse('Forbidden', { status: 403 });
}
```
Уязвимости:
1. `host.includes('3005')` позволяло подделывать хост внешними доменами вроде `attacker-3005.com` или `evil3005.com`.
2. Отсутствовал обязательный флаг явного включения `ALLOW_DEV_LOGIN === 'true'`.
3. При определенных условиях `!isDev && !isTest` могло пропустить несанкционированный запрос.

## После исправления (After)
1. Внедрен строгий fail-closed барьер с требованием явного флага `ALLOW_DEV_LOGIN === 'true'`, безусловный запрет в `production` и проверка среды:
   ```typescript
   const allowDevLogin = process.env.ALLOW_DEV_LOGIN === 'true';
   const isDev = process.env.NODE_ENV === 'development';
   const isTest = process.env.APP_ENV === 'test' || process.env.PLAYWRIGHT_TEST === 'true';

   // Strict Fail-Closed (AUTH-01): Never allow dev-login in production or unless explicitly enabled
   if (!allowDevLogin || process.env.NODE_ENV === 'production' || (!isDev && !isTest)) {
     return new NextResponse('Not Found', { status: 404 });
   }
   ```
2. Внедрена точная проверка имени хоста и порта без нечеткого подстрочного поиска (`includes`):
   ```typescript
   const [hostname, port] = host.toLowerCase().split(':');
   const isAllowedHost = (hostname === 'localhost' || hostname === '127.0.0.1') && (!port || port === '3000' || port === '3005' || port === '3001');

   if (!isAllowedHost) {
     return new NextResponse('Forbidden', { status: 403 });
   }
   ```
3. Добавлен комплексный юнит-тест `src/__tests__/security/auth-01-dev-login.test.ts`.

## Верификация:
- `npx dotenv -e .env.test -- vitest run src/__tests__/security/auth-01-dev-login.test.ts` — 4/4 PASS (100%).
- Проверена блокировка spoofed хостов (`evil3005.com`) с кодом 403.
- Проверена блокировка при `ALLOW_DEV_LOGIN !== 'true'` с кодом 404.
- Проверена безусловная блокировка в `NODE_ENV === 'production'` с кодом 404.
