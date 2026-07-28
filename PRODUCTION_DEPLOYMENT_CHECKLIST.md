# PRODUCTION DEPLOYMENT CHECKLIST

**Дата составления:** 28 июля 2026  
**Статус:** 🛡️ PRODUCTION READY  

---

### Технический чеклист перед релизом

#### Technical & Build
- [x] `npx tsc --noEmit` → **PASS** (0 ошибок)
- [x] `npm run build` → **PASS** (118+ страниц скомпилированы)
- [x] `npx prisma migrate deploy` (Использование официальных SQL-миграций вместо `db push`)
- [x] Переменная `NODE_ENV=production` задана в окружении
- [x] Запрещена генерация ошибок сборки в `next.config.mjs` (`ignoreBuildErrors: false`)
- [x] `robots.txt` полностью закрывает служебные страницы (`/admin`, `/dashboard`, `/operator`, `/api`, `/client-demo`)
- [x] `sitemap.xml` валиден и генерируется с учетом Quality Gate
- [x] Абсолютные канонические ссылки на всех публичных страницах

#### SEO & E-E-A-T
- [x] Сформирован чеклист настройки `YANDEX_WEBMASTER_SETUP.md`
- [x] Сформирован чеклист настройки `GOOGLE_SEARCH_CONSOLE_SETUP.md`
- [x] Валидированы микроразметки Schema.org (`BreadcrumbList`, `Service`, `Offer`, `FAQPage`, `Article`, `Organization`, `WebSite`)
- [x] Созданы юридические документы `/legal/privacy`, `/legal/terms`, `/legal/refund` с абсолютными каноническими ссылками
- [x] Добавлены сигналы доверия (ИНН, ОГРНИП, Адрес) в `MegaFooter`

#### Security
- [x] Служебные роуты выдают `X-Robots-Tag: noindex, nofollow, noarchive`
- [x] Доступ к `/admin` и `/operator` закрыт серверными проверками авторизации
- [x] Секреты API и токены отсутствуют в исходном коде Git
