# Доказательства ремедиации SEC-07 (Параметризация SQL-запросов и устранение $executeRawUnsafe с интерполяцией)

## До исправления (Before)
В служебных скриптах и сидах базы данных присутствовали вызовы `$executeRawUnsafe` со строковой интерполяцией переменных (`${...}`):
1. `scripts/generate-evidence-report.ts:90`:
   ```typescript
   await prisma.$executeRawUnsafe(`DELETE FROM "LedgerEntry" WHERE id = '${ledger.id}'`);
   ```
2. `prisma/seed-data/vexboost-services.ts:60-65`:
   Ручная сборка SQL-запроса через конкатенацию строк с экранированием одинарных кавычек:
   ```typescript
   const nameStr = "'" + item.service.replace(/'/g, "''") + "'";
   const query = `INSERT INTO "Service" ... VALUES (${idStr}, ${randomNumericId}, ${nameStr}, ...);`;
   await prisma.$executeRawUnsafe(query);
   ```
3. `scripts/fix-import.ts:32` и `scripts/fix-import.ts:109`:
   Интерполяция вычисленных номеров последовательностей в `$executeRawUnsafe`.

## После исправления (After)
1. Все запросы переведены на нативный параметризованный шаблонный литерал Prisma `$executeRaw` (tagged template literal):
   - `scripts/generate-evidence-report.ts`:
     ```typescript
     await prisma.$executeRaw`DELETE FROM "LedgerEntry" WHERE id = ${ledger.id}`;
     ```
   - `prisma/seed-data/vexboost-services.ts`:
     ```typescript
     await prisma.$executeRaw`
       INSERT INTO "Service" ("id", "numericId", "name", "categoryId", "rate", "markup", "minQty", "maxQty", "externalId", "updatedAt") 
       VALUES (${item.id}, ${randomNumericId}, ${item.service}, ${targetCategory.id}, ${rateInt}, ${markupInt}, ${minQty}, ${maxQty}, ${item.id}, NOW()) 
       ON CONFLICT ("id") DO NOTHING;
     `;
     ```
   - `scripts/fix-import.ts`:
     ```typescript
     await db.$executeRaw`SELECT setval(pg_get_serial_sequence('"Service"', 'numericId'), ${nextVal}, false)`;
     ```
2. Переменные передаются строго в виде параметров запроса `$1`, `$2`... драйвера PostgreSQL, исключая любую возможность SQL-инъекций.

## Верификация:
- `npx tsc --noEmit` — 0 ошибок (PASS).
- `scripts/owasp-scan.ts` и `scripts/security/pentest-orchestrator.ts` — чистый аудит.
