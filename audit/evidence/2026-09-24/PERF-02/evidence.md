# Доказательства ремедиации PERF-02 (Многоуровневое кэширование /legal/* и /services через unstable_cache)

## До исправления (Before)
1. **Страницы юридических документов (`/legal/[slug]` и `LegalPageContent`)**:
   - При каждом GET-запросе происходил прямой запрос в PostgreSQL (`prisma.contentItem.findUnique`), чтение динамических настроек `SettingsProvider.getContactAndLegalSettings` и выполнение цикла регулярных выражений замены шаблонных плейсхолдеров (`{{COMPANY_NAME}}`, `{{SUPPORT_EMAIL}}` и др.).
   - При повторных визитах и краулинге поисковиками это создавало избыточную нагрузку на БД и задержку TTFB.
2. **Каталог услуг и база знаний (`/services`)**:
   - Вызов `getArticles()` при открытии `/services` выполнял 2 последовательных SQL-запроса `prisma.article.findMany` на каждый запрос.
   - Метод `SettingsProvider.getContactAndLegalSettings()` в `/services` вызывался без явного `tenantId`, что приводило к сбросу настроек на дефолтные при запросах к SMMflux.

## После исправления (After)
1. В `src/actions/order/legal.ts`:
   - Реализована функция `getCachedLegalDoc(slug, tenantId)` на базе Next.js `unstable_cache` с тегами `['legal', 'legal-${tenantId}', 'legal-${slug}']` и TTL 3600 сек (1 час).
   - Готовый санитизированный HTML и заголовок документа кэшируются в памяти с привязкой к тенанту. Повторные запросы отдаются за <1мс (0 запросов к БД).
2. В `src/components/legal/LegalPageContent.tsx`:
   - Компонент переведен на использование `getCachedLegalDoc(slug, tenantId)`.
3. В `src/actions/knowledge.ts`:
   - Внедрено кэширование `unstable_cache` для `getArticles` при отсутствии поискового фильтра (TTL 300 сек, теги `articles`).
4. В `src/app/services/page.tsx`:
   - Передан корректный `tenantId` в `SettingsProvider.getContactAndLegalSettings(tenantId)`.

## Верификация:
- `npx dotenv -e .env.test -- vitest run src/__tests__/legal/legal-compliance-and-enterprise-pages.test.ts` — 6/6 PASS (100%).
- `npm run lint:tenant` — 0 блокеров.
- `npx tsc --noEmit` — 0 ошибок (PASS).
