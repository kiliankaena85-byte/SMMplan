# Доказательства ремедиации SEC-06 / HYG-01 (Защита от Reverse Tabnabbing: rel="noopener noreferrer")

## До исправления (Before)
В 11 компонентах и страницах (`src/components/landing/order-engine/LegalCheckbox.tsx`, `src/components/orders/sub/OrderSummaryCard.tsx`, `src/components/settings/Consent152FzCard.tsx`, `src/app/dashboard/add-funds/client-page.tsx`, `src/app/admin/catalog/components/service-edit-form.tsx` и др.) в общей сложности 18 тегов `<a>` и `<Link>` содержали атрибут `target="_blank"`, но не содержали директивы `rel="noopener noreferrer"`.
Это подвергало пользователей риску атаки Reverse Tabnabbing: открываемая в новой вкладке страница имела частичный доступ к родительской странице через `window.opener.location`, что могло использоваться для фишинговой подмены страницы входа или кражи сессии.

## После исправления (After)
1. Все 18 тегов во всех 11 компонентах были обновлены добавлением атрибута `rel="noopener noreferrer"`.
2. В `test/setup.ts` добавлен фильтр `sec-rel-noopener` для быстрого выполнения проверки без сброса БД.
3. Разработан постоянный регрессионный тест `src/__tests__/security/sec-rel-noopener.test.ts`, выполняющий автоматический обход всего дерева файлов `src/` и блокирующий коммиты при обнаружении тегов `target="_blank"` без `rel="noopener noreferrer"`.

## Верификация:
- `npx dotenv -e .env.test -- vitest run src/__tests__/security/sec-rel-noopener.test.ts` — 1/1 PASS (100%).
- Проверено 0 нарушений во всем коде проекта `src/`.
- `npx tsc --noEmit` — 0 ошибок (PASS).
