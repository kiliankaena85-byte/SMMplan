# Доказательства ремедиации SEC-02 (Живые ключи провайдеров в скриптах)

## До исправления (Before)
В `scripts/import-vexboost-live.ts:4` был жестко прописан живой рабочий ключ провайдера Vexboost:
```typescript
const VEXBOOST_KEY = process.env.VEXBOOST_API_KEY || 'Pp1kBnSehTsGaC5UmER0Kp6PcqIqG7TljnqNSX650Fpis4u5TwiSYXrDjEAh';
```
При запуске скрипта без явной переменной окружения использовался скомпрометированный открытый ключ.

## После исправления (After)
1. В `scripts/import-vexboost-live.ts` жестко закодированный ключ удален. Внедрен принцип fail-closed:
   ```typescript
   const VEXBOOST_KEY = process.env.VEXBOOST_API_KEY;
   if (!VEXBOOST_KEY) {
     throw new Error('VEXBOOST_API_KEY is not defined. Refusing to run import without explicit API key (fail-closed, SEC-02).');
   }
   ```
2. Запуск скрипта без `VEXBOOST_API_KEY` немедленно завершается аварийным исключением вместо использования публичного ключа.
3. **Примечание по безопасности:** Ранее скомпрометированный API-ключ Vexboost подлежит перевыпуску и отзыву владельцем платформы в кабинете провайдера.

## Верификация:
- `node scripts/check-bundle-secrets.mjs` — `0 hardcoded secrets found in scripts/ directory` (PASS).
- `npx tsc --noEmit` — 0 ошибок (PASS).
