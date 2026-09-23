# Доказательства ремедиации XSS-01 (Экранирование реквизитов компании в HTML)

## До исправления (Before)
В `src/actions/order/legal.ts` переменные настроек компании (`companyName`, `inn`, `ogrnip`, `address`, `email`, `privacyEmail`, `siteName`, `telegramBot`) подставлялись в HTML напрямую методом `.replace(...)` без экранирования спецсимволов HTML:
```typescript
finalHtml = finalHtml
  .replace(/{{COMPANY_NAME}}/g, companyName)
  .replace(/{{COMPANY_INN}}/g, inn || '—')
  ...
```
Если в названии компании содержалась разметка (например `<img src=x onerror=alert(1)>`), она попадала в тело документа и парсилась браузером как живой DOM-элемент.

## После исправления (After)
В `src/lib/sanitize.ts` реализован хелпер `escapeHtml`:
```typescript
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```
В `src/actions/order/legal.ts` все подстановки экранируются через `escapeHtml(...)` перед интерполяцией в шаблон, а итоговый HTML дополнительно проходит через `sanitizeArticleHtml`.

## Верификация (TDD Green Phase):
- Тест: `src/__tests__/security/xss-01-legal-escaping.test.ts`
- Команда: `npx dotenv -e .env.test -- vitest run src/__tests__/security/xss-01-legal-escaping.test.ts`
- Результат: 2/2 tests PASSED (100%).
- Проверка типов: `npx tsc --noEmit` — 0 ошибок.
