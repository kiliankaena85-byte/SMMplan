# Implementation Plan: Hardening, Sanitization & Migration

## User Review Required
> [!IMPORTANT]
> **Database Wipe warning**: The migration will overwrite the remote database at `smmplan.pro` with the sanitized local database.
> **Settings warning**: Production keys, admin account password, and domain names (`https://smmplan.pro`) must be securely saved. The domains will be auto-replaced before dump creation to avoid breaking email magic-links and YooKassa webhook URLs.

---

## 🛡️ Премортем-анализ (Failure Simulation)

| Риск (Сценарий отказа) | Механизм защиты (Mitigation) |
| :--- | :--- |
| **Системные настройки смотрят на `localhost`:** После миграции маджик-ссылки авторизации и вебхуки оплаты на сервере сломаются, так как в локальной БД был зашит локальный домен. | Агенты **обязаны** перед дампом (или сразу после него) обновить в базе `SystemSettings` и `Provider` все URL-адреса с `localhost:3000` на `https://smmplan.pro`. |
| **Гонка данных при восстановлении:** Фоновые процессы на сервере (BullMQ) пытаются писать в БД в момент её удаления и восстановления через `pg_restore`. | Обязательная остановка Docker-контейнеров приложения и воркера (`docker compose stop app worker`) перед дропом БД. |
| **Удаление нужных скриптов:** Вырезание `scripts/` ломает логику деплоя или сидирования базы. | Удалять скрипты можно только после тщательной сверки с `package.json` скриптами; необходимые утилиты нужно переписать в `src/lib/`. |

---

## Proposed Changes

### 1. Codebase Cleanup
- **ESLint Config Hardening**:
  Edit [eslint.config.mjs](file:///d:/SMM_plan_2/eslint.config.mjs). Update ignores to remove `scripts/**` and change rule warning overrides to strict errors (`"error"`).
- **Knip Dead Code Cleanup**:
  Run `npm run lint:debt` (which runs `knip`) to identify unused files, functions, and variables in the `src/` directory. Delete detected dead code files, and clean up unused exports.
- **Require-to-ESM refactoring**:
  Scan for old `.js` utilities in `scripts/` or `src/` that use CommonJS `require()`. Eliminate or rewrite them to typescript ESM, ensuring all modules use standard `import/export`.

### 2. Local DB Sanitization
- Write a custom sanitation script `scripts/sanitize-db.ts`.
- Delete "garbage" data such as user orders (`Order`), YooKassa/CryptoBot transactions (`Payment`), client support tickets (`Ticket`, `TicketMessage`, `MessageAttachment`), and background worker history (`Refill`, `LedgerEntry` for non-admin accounts).
- Retain configured providers (`Provider`), owner accounts (`User` with role `OWNER`/`ADMIN`), and system configurations (`SystemSettings`).
- **Domain Sanitization**:
  Update all occurrences of `localhost:3000`, `127.0.0.1:3000` or local URLs in `SystemSettings` and `Provider` API URLs or webhooks to use `https://smmplan.pro`.

### 3. Server DB Migration & Cleanup
- **Docker Cleanup**:
  Connect to `root@smmplan.pro` via SSH.
  Run `docker system prune -a -f` to clean up stopped containers, dangling volumes, and cached images.
- **Redis Cleanup**:
  Connect to `smmplan_lite_prod_redis` and clear Redis cache (`redis-cli flushall`).
- **Database Replacement**:
  - Stop the production application containers: `docker compose -f docker-compose.prod.yml stop app worker bot` (leaving `db` and `redis` running).
  - Create a dump of the sanitized local PostgreSQL database using `pg_dump`.
  - Copy the local dump to the remote server.
  - Drop the public schema in the production database: `drop schema public cascade; create schema public;` (or run prisma migrate reset / pg_restore).
  - Import the sanitized database dump into the production database.
  - Start the application and worker containers again: `docker compose -f docker-compose.prod.yml up -d`.
  - Validate container logs: `docker logs smmplan_lite_prod_app` and `docker logs smmplan_lite_prod_worker`.

### 4. Fix Test Leaks and Mocks
- **SMTP Leak Prevention**:
  Inspect [test/setup.ts](file:///d:/SMM_plan_2/test/setup.ts). Ensure `nodemailer` and `resend` are fully stubbed/mocked globally so that no test can accidentally establish real connections to `smtp.yandex.ru`.
- **Remove Flaky/Outdated Tests**:
  Delete unstable, obsolete, or non-deterministic test files from `test/` directory. Ensure 100% test isolation.

---

## Verification Plan

### Automated Checks
1. Run local lint check:
   ```bash
   npm run lint
   ```
   *Expectation*: 0 errors and 0 warnings.
2. Run Knip check:
   ```bash
   npm run lint:debt
   ```
   *Expectation*: Clean or near-clean output with no dead references in `src/`.
3. Run tests:
   ```bash
   npm run test
   ```
   *Expectation*: 100% success rate, 0 network connection attempts.
4. Run project build check:
   ```bash
   npm run build
   ```
   *Expectation*: Build succeeds without errors.

### Server Checks
1. Execute health-check query on server container logs:
   ```bash
   docker logs smmplan_lite_prod_app
   docker logs smmplan_lite_prod_worker
   ```
   *Expectation*: No PostgreSQL connection errors or crash loops.
2. Verify Admin Login:
   *Expectation*: Authentication works, and dashboard displays 0 orders (cleaned) and all providers correctly configured with domains set to `https://smmplan.pro`.
