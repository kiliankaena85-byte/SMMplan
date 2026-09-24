# Доказательства ремедиации XSS-02 (Экранирование JSON-LD разметки)

## До исправления (Before)
В файлах `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/ab-test/FluxFAQ.tsx`, `src/components/ab-test/FluxReviews.tsx`, `src/app/academy/[slug]/page.tsx` блоки `<script type="application/ld+json">` рендерились через прямой `JSON.stringify(...)` без экранирования символа `<`.
Если пользовательские или каталожные данные (название услуги, заголовок статьи, отзывы) содержали последовательность `</script><script>alert(1)</script>`, парсер HTML в браузере немедленно закрывал блок скрипта и выполнял внедренный JavaScript-код.

## После исправления (After)
1. В `src/lib/sanitize.ts` реализован канонический хелпер `serializeJsonLd`:
   ```typescript
   export function serializeJsonLd(data: unknown): string {
     if (data === undefined || data === null) return '';
     return JSON.stringify(data).replace(/</g, '\\u003c');
   }
   ```
2. Все вставки `application/ld+json` переведены на вызов `serializeJsonLd(...)` либо снабжены вызовом `.replace(/</g, '\\u003c')`.
3. Добавлен юнит-тест `src/__tests__/security/xss-02-jsonld-escaping.test.ts`.

## Верификация:
- `src/__tests__/security/xss-02-jsonld-escaping.test.ts`:
  - `replaces all "<" occurrences with unicode \u003c to prevent script injection` — PASS
  - `handles nested objects, arrays, and null/undefined values safely` — PASS
- Контроль типов `npx tsc --noEmit` — 0 ошибок (PASS).
- Сканирование секретов `node scripts/check-bundle-secrets.mjs` — 0 утечек (PASS).
