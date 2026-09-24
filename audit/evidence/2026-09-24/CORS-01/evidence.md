# Доказательства ремедиации CORS-01 (Устранение небезопасного CORS-эха на Storefront API)

## До исправления (Before)
В `src/proxy.ts:300` и `src/proxy.ts:686` для запросов к `/api/storefront/*` присутствовало автоматическое отражение любого переданного клиентом заголовка `Origin` с разрешением передачи учетных данных (`credentials: true`):
```typescript
if (isStorefrontApi) {
  preflightHeaders.set('Access-Control-Allow-Origin', origin || '*');
  if (origin) {
    preflightHeaders.set('Access-Control-Allow-Credentials', 'true');
  }
...
```
Это представляло классическую уязвимость OWASP CORS Misconfiguration: любой вредоносный сайт (`evil-attacker.com`) мог отправлять запросы с `credentials: 'include'`, обходить Same-Origin Policy браузера и считывать конфиденциальные ответы API от лица аутентифицированного пользователя.

## После исправления (After)
1. В `src/proxy.ts` для Storefront API введена строгая проверка валидности Origin через `isAllowedOrigin` (сверка с белым списком доменов тенантов `smmplan.pro`, `smmflux.ru` и локальными адресами разработки):
   ```typescript
   if (isStorefrontApi) {
     if (isAllowedOrigin && origin) {
       preflightHeaders.set('Access-Control-Allow-Origin', origin);
       preflightHeaders.set('Access-Control-Allow-Credentials', 'true');
     } else {
       preflightHeaders.set('Access-Control-Allow-Origin', '*');
     }
     ...
   ```
2. Для недоверенных источников `Access-Control-Allow-Credentials: true` КАТЕГОРИЧЕСКИ НЕ ВЫСТАВЛЯЕТСЯ, блокируя возможность чтения cookie-сессий сторонними сайтами.
3. Разработан юнит-тест `src/__tests__/security/cors-01-storefront.test.ts`.

## Верификация:
- `npx dotenv -e .env.test -- vitest run src/__tests__/security/cors-01-storefront.test.ts` — 4/4 PASS (100%).
- Проверена блокировка эхо-ответа для `evil-attacker.com` (credentials не передаются, origin не отражается).
- Проверено корректное проставление CORS с credentials для авторизованных доменов `smmplan.pro` и `smmflux.ru`.
- `npx tsc --noEmit` — 0 ошибок (PASS).
