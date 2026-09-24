# Доказательства ремедиации PII-02 (Маскирование паролей, токенов и URI баз данных в логах)

## До исправления (Before)
В `src/lib/logger/sensitive-data-filter.ts` маскировались только quoted параметры и базовые postgresql/redis ссылки. При логировании connection string MongoDB, MySQL, ClickHouse, AMQP, незакавыченных параметров (`password=...`) или URL без схемы пароли попадали в логи в открытом виде.

## После исправления (After)
1. В `src/lib/logger/sensitive-data-filter.ts` добавлен универсальный регэксп-фильтр для любых схем URI баз данных и брокеров (`(?:[a-z][a-z0-9+.-]*):\/\/[^/\s:@]+:([^/\s@]+)@`), маскирующий пароль на `*****`.
2. Добавлена поддержка URL без схемы (`user:pass@host`).
3. Добавлена поддержка незакавыченных присваиваний секретов (`password=...`, `secret: ...`).
4. Покрыто комплексными тестами в `src/__tests__/security/sensitive-data-filter.test.ts`.

## Верификация:
- `npx dotenv -e .env.test -- vitest run src/__tests__/security/sensitive-data-filter.test.ts` — 9/9 PASS (100%).
- `npx tsc --noEmit` — 0 ошибок (PASS).
