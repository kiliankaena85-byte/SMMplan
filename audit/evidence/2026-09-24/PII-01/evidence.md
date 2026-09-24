# Доказательства ремедиации PII-01 (Утечка Magic Link токенов в логи)

## До исправления (Before)
В `src/lib/smtp.ts:212` и `217` генерация ссылок прямого входа безусловно выводила полный URL с секретным токеном в консоль процесса / Docker-логи:
```typescript
console.info(`\n========================================\n[MAGIC LINK FOR ${email} (${companyName})]:\n${link}\n========================================\n`);

if (!result) {
  log.warn('SMTP Not configured. Magic link printed to console.', { email, link });
  return;
}
```
В рабочей среде любой администратор с доступом к чтению stdout контейнеров или SIEM/log-агрегаторам мог перехватить ссылку и авторизоваться под учетной записью клиента или администратора.

## После исправления (After)
1. В `src/lib/smtp.ts` вывод magic link ограничен строго не-продакшен средами (`process.env.NODE_ENV !== 'production'`).
2. В боевой среде (`NODE_ENV === 'production'`) печать ссылки в консоль полностью подавлена. При отсутствии конфигурации SMTP в логи выводится безопасное предупреждение без секретного URL/токена (`log.warn('SMTP Not configured for tenant.', { tenantId, email })`).
3. Добавлен юнит-тест `src/__tests__/security/pii-01-smtp-magic-link.test.ts`.

## Верификация:
- `npx dotenv -e .env.test -- vitest run src/__tests__/security/pii-01-smtp-magic-link.test.ts` — 1/1 PASS.
- `npx dotenv -e .env.test -- vitest run src/__tests__/security/production-hardening-triad.test.ts` — 11/11 PASS.
- `npx tsc --noEmit` — 0 ошибок (PASS).
