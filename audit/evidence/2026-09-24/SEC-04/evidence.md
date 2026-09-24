# Доказательства ремедиации SEC-04 (Хардкодный ключ шифрования бэкапов БД)

## До исправления (Before)
В `scripts/backup/backup-postgres-s3.ts:63` присутствовал статический дефолтный ключ шифрования:
```typescript
function getEncryptionKey(keyString?: string): Buffer {
  const secret = keyString || process.env.BACKUP_ENCRYPTION_KEY || 'default-postgres-backup-secret-key-32b!';
  return deriveEncryptionKey(secret);
}
```
Если `BACKUP_ENCRYPTION_KEY` не был задан, резервные копии PostgreSQL шифровались общеизвестным ключом из репозитория.

## После исправления (After)
1. В `scripts/backup/backup-postgres-s3.ts` удален статический фоллбек-ключ. Внедрено строгое требование явного ключа шифрования:
   ```typescript
   function getEncryptionKey(keyString?: string): Buffer {
     const secret = keyString || process.env.BACKUP_ENCRYPTION_KEY;
     if (!secret) {
       throw new Error('BACKUP_ENCRYPTION_KEY is required to generate or verify encrypted backups (fail-closed, SEC-04).');
     }
     return deriveEncryptionKey(secret);
   }
   ```
2. В `scripts/backup/__tests__/backup-postgres-s3.test.ts` добавлен тест `throws an error if no encryption key is provided (fail-closed, SEC-04)`.
3. В `test/setup.ts` добавлен паттерн `backup-postgres-s3` в `skipPatterns` для мгновенного выполнения без транкации БД.

## Верификация:
- `npx dotenv -e .env.test -- vitest run scripts/backup/__tests__/backup-postgres-s3.test.ts` — 5/5 PASS (100% за 91мс).
- `node scripts/check-bundle-secrets.mjs` — 0 hardcoded secrets found in scripts/.
- `npx tsc --noEmit` — 0 ошибок (PASS).
